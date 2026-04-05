"""
Multi-model trainer and evaluator for water quality classification.

Trains Logistic Regression, Random Forest, and XGBoost (if available)
on the cleaned dataset, computes real evaluation metrics, and selects
the best model (by weighted F1) to replace the production model.

Results are cached in memory for the process lifetime — training only
happens once per server start, or when force=True is passed.
"""

from __future__ import annotations

import os
import time
import logging
import numpy as np
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, roc_auc_score,
)

# Try XGBoost — graceful fallback if not installed
try:
    from xgboost import XGBClassifier
    _XGBOOST_AVAILABLE = True
except ImportError:
    _XGBOOST_AVAILABLE = False

from ml.data_processor import get_dataset, FEATURE_COLS

log = logging.getLogger(__name__)

MODEL_DIR   = os.path.dirname(__file__)
PROD_MODEL  = os.path.join(MODEL_DIR, "water_quality_model.pkl")
TEST_SIZE   = 0.2
RANDOM_SEED = 42

# ── In-memory cache — computed once per process ────────────────────────────────
_cache: dict | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Model registry
# ─────────────────────────────────────────────────────────────────────────────

def _build_model_registry() -> list[tuple[str, object]]:
    """
    Return a list of (name, estimator) tuples.
    Logistic Regression is wrapped in a StandardScaler pipeline because
    it is scale-sensitive; tree-based models are not.
    """
    registry = [
        (
            "Logistic Regression",
            Pipeline([
                ("scaler", StandardScaler()),
                ("clf",    LogisticRegression(max_iter=1000, random_state=RANDOM_SEED, class_weight="balanced")),
            ]),
        ),
        (
            "Random Forest",
            RandomForestClassifier(
                n_estimators=150, max_depth=None,
                random_state=RANDOM_SEED, n_jobs=-1,
            ),
        ),
        (
            "Gradient Boosting",
            GradientBoostingClassifier(
                n_estimators=150, learning_rate=0.1, max_depth=4,
                random_state=RANDOM_SEED,
            ),
        ),
    ]

    if _XGBOOST_AVAILABLE:
        registry.append((
            "XGBoost",
            XGBClassifier(
                n_estimators=150, learning_rate=0.1, max_depth=4,
                random_state=RANDOM_SEED, eval_metric="logloss", verbosity=0,
                use_label_encoder=False,
            ),
        ))

    return registry


# ─────────────────────────────────────────────────────────────────────────────
# Core: train + evaluate
# ─────────────────────────────────────────────────────────────────────────────

def _evaluate_model(name: str, model, X_train, X_test, y_train, y_test) -> dict:
    """Fit a model and compute all evaluation metrics from real predictions."""
    t0 = time.perf_counter()
    model.fit(X_train, y_train)
    train_time = round(time.perf_counter() - t0, 3)

    y_pred = model.predict(X_test)
    y_prob = (
        model.predict_proba(X_test)[:, 1]
        if hasattr(model, "predict_proba") else None
    )

    acc  = round(float(accuracy_score(y_test, y_pred)), 4)
    prec = round(float(precision_score(y_test, y_pred, average="weighted", zero_division=0)), 4)
    rec  = round(float(recall_score   (y_test, y_pred, average="weighted", zero_division=0)), 4)
    f1   = round(float(f1_score       (y_test, y_pred, average="weighted", zero_division=0)), 4)
    # Binary metrics for "Safe" class (class 1)
    prec1 = round(float(precision_score(y_test, y_pred, pos_label=1, zero_division=0)), 4)
    rec1  = round(float(recall_score   (y_test, y_pred, pos_label=1, zero_division=0)), 4)
    f1_1  = round(float(f1_score       (y_test, y_pred, pos_label=1, zero_division=0)), 4)
    auc   = round(float(roc_auc_score(y_test, y_prob)), 4) if y_prob is not None else None

    cm = confusion_matrix(y_test, y_pred).tolist()  # [[TN, FP], [FN, TP]]

    # 3-fold CV on training set (F1 weighted)
    cv_scores = cross_val_score(model, X_train, y_train, cv=3, scoring="f1_weighted", n_jobs=-1)
    cv_mean = round(float(cv_scores.mean()), 4)
    cv_std  = round(float(cv_scores.std()),  4)

    log.info("[ModelTrainer] %-22s acc=%.4f  f1=%.4f  auc=%s  time=%.2fs",
             name, acc, f1, auc, train_time)

    return {
        "model":          name,
        # Weighted averages (overall)
        "accuracy":       acc,
        "precision":      prec,
        "recall":         rec,
        "f1":             f1,
        # Per-class for the "Safe" (positive) class
        "precision_safe": prec1,
        "recall_safe":    rec1,
        "f1_safe":        f1_1,
        # Other metrics
        "auc":            auc,
        "cv_f1_mean":     cv_mean,
        "cv_f1_std":      cv_std,
        "confusion_matrix": cm,           # [[TN, FP], [FN, TP]]
        "train_time_s":   train_time,
    }


def train_and_evaluate(force: bool = False) -> dict:
    """
    Train all models and return comparison metrics. Caches result in memory.

    Args:
        force: Re-train even if cached result exists.

    Returns:
        dict with keys: models, best_model, best_f1, train_size, test_size,
                        xgboost_available, gradient_boosting_note.
    """
    global _cache
    if _cache is not None and not force:
        return _cache

    log.info("[ModelTrainer] Starting multi-model training…")

    df = get_dataset()
    X  = df[FEATURE_COLS].values
    y  = df["Potability"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_SEED, stratify=y
    )

    registry = _build_model_registry()
    results: list[dict] = []
    best_entry  = None
    best_f1_val = -1.0
    best_raw_model = None

    for name, model in registry:
        try:
            entry = _evaluate_model(name, model, X_train, X_test, y_train, y_test)
        except Exception as exc:
            log.warning("[ModelTrainer] Skipped %s: %s", name, exc)
            continue

        results.append(entry)

        if entry["f1"] > best_f1_val:
            best_f1_val    = entry["f1"]
            best_entry     = entry
            # Extract underlying estimator if wrapped in Pipeline
            best_raw_model = model

    if not results:
        raise RuntimeError("All models failed to train — check dataset and dependencies.")

    best_model_name = best_entry["model"]

    # ── Overwrite production model with the best one ──────────────────────────
    joblib.dump(best_raw_model, PROD_MODEL)
    log.info("[ModelTrainer] Saved best model (%s) to %s", best_model_name, PROD_MODEL)

    # Invalidate predict.py's in-process cache so it reloads
    try:
        import ml.predict as _pred
        _pred.model = None
    except Exception:
        pass

    # ── Build justification string ────────────────────────────────────────────
    justification = _build_justification(results, best_entry, test_size=int(X_test.shape[0]))

    _cache = {
        "models":             results,
        "best_model":         best_model_name,
        "best_f1":            best_f1_val,
        "train_size":         int(X_train.shape[0]),
        "test_size":          int(X_test.shape[0]),
        "feature_count":      len(FEATURE_COLS),
        "xgboost_available":  _XGBOOST_AVAILABLE,
        "justification":      justification,
    }

    log.info("[ModelTrainer] Done. Best: %s (F1=%.4f)", best_model_name, best_f1_val)
    return _cache


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_justification(results: list[dict], winner: dict, test_size: int = 0) -> str:
    """Generate a human-readable explanation of why the winner was chosen."""
    sorted_by_f1 = sorted(results, key=lambda x: x["f1"], reverse=True)
    rank_lines = [
        f"  {i+1}. {r['model']}: F1={r['f1']:.4f}, Acc={r['accuracy']:.4f}, AUC={r['auc'] or 'N/A'}"
        for i, r in enumerate(sorted_by_f1)
    ]
    cm  = winner["confusion_matrix"]
    tn, fp, fn, tp = cm[0][0], cm[0][1], cm[1][0], cm[1][1]
    return (
        f"{winner['model']} achieved the highest weighted F1 score ({winner['f1']:.4f}) "
        f"on the held-out test set ({test_size} samples), "
        f"combining strong precision ({winner['precision']:.4f}) and recall ({winner['recall']:.4f}). "
        f"Its confusion matrix shows {tp} correct safe predictions, {tn} correct unsafe predictions, "
        f"with only {fp} false positives and {fn} false negatives. "
        f"Cross-validation confirms stability (CV F1 {winner['cv_f1_mean']:.4f} ± {winner['cv_f1_std']:.4f}). "
        f"It has been saved as the active production model.\n\n"
        f"Full ranking by F1:\n" + "\n".join(rank_lines)
    )


def clear_cache() -> None:
    """Force re-training on the next request."""
    global _cache
    _cache = None
