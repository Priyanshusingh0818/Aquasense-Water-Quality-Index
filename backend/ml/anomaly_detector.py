"""
Anomaly detection for water quality samples using Isolation Forest.

Algorithm: IsolationForest (sklearn) — an ensemble of random isolation trees.
Samples that require fewer splits to isolate are more anomalous.

For each detected anomaly, we also compute per-feature z-scores to explain
WHICH parameters drove the anomaly flag, so the output is interpretable.

Cache: Results are computed once per process and stored in memory.
       Call clear_cache() or pass force=True to recompute.
"""

from __future__ import annotations

import logging
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from ml.data_processor import get_dataset, FEATURE_COLS

log = logging.getLogger(__name__)

# ── Tunable constants ─────────────────────────────────────────────────────────
CONTAMINATION  = 0.05   # expected fraction of anomalies (5 % → ~164 of 3276)
N_ESTIMATORS   = 200    # number of isolation trees
RANDOM_SEED    = 42
MAX_TABLE_ROWS = 100    # max anomalies returned in the full record list

# ── In-memory cache ───────────────────────────────────────────────────────────
_cache: dict | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def detect_anomalies(force: bool = False) -> dict:
    """
    Run Isolation Forest on the full cleaned dataset.

    Returns a dict with:
      - anomalies:              list of up to MAX_TABLE_ROWS anomalous records,
                                each with anomaly_score (0–100), all feature
                                values, status, and top_features (z-score explanation)
      - total_anomalies:        total count of anomalous samples detected
      - anomaly_rate_pct:       percentage of dataset flagged
      - total_samples:          total dataset size
      - score_distribution:     histogram of anomaly scores (10 bins)
      - feature_analysis:       per-feature mean |z-score| anomalous vs normal
      - feature_trigger_counts: how many anomalies each feature is the top trigger
    """
    global _cache
    if _cache is not None and not force:
        return _cache

    log.info("[AnomalyDetector] Fitting IsolationForest (contamination=%.2f)…", CONTAMINATION)

    df   = get_dataset()
    X    = df[FEATURE_COLS].values
    n    = len(df)

    # ── 1. Fit Isolation Forest ───────────────────────────────────────────────
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    iso = IsolationForest(
        n_estimators = N_ESTIMATORS,
        contamination = CONTAMINATION,
        random_state  = RANDOM_SEED,
        n_jobs        = -1,
    )
    raw_labels  = iso.fit_predict(X_scaled)       # +1 normal, -1 anomaly
    raw_scores  = iso.decision_function(X_scaled) # more negative → more anomalous

    # Normalise decision scores → anomaly_score in [0, 100]
    # max(raw_scores) = most normal, min(raw_scores) = most anomalous
    s_min, s_max = raw_scores.min(), raw_scores.max()
    anomaly_scores = (s_max - raw_scores) / (s_max - s_min) * 100  # higher = worse

    anomaly_mask = (raw_labels == -1)

    log.info("[AnomalyDetector] Detected %d / %d anomalies (%.1f%%)",
             anomaly_mask.sum(), n, anomaly_mask.mean() * 100)

    # ── 2. Feature stats for z-score explanation ──────────────────────────────
    feat_means = {col: float(df[col].mean()) for col in FEATURE_COLS}
    feat_stds  = {col: float(df[col].std())  for col in FEATURE_COLS}
    # Guard against zero std (shouldn't happen on real data)
    feat_stds  = {col: max(v, 1e-9) for col, v in feat_stds.items()}

    def z_score(col: str, val: float) -> float:
        return (val - feat_means[col]) / feat_stds[col]

    # ── 3. Build anomaly records list ─────────────────────────────────────────
    anomaly_indices = np.where(anomaly_mask)[0]

    # Sort by anomaly score descending (most anomalous first)
    anomaly_indices = anomaly_indices[np.argsort(anomaly_scores[anomaly_indices])[::-1]]

    feature_trigger_counts: dict[str, int] = {col: 0 for col in FEATURE_COLS}
    anomaly_records = []

    for idx in anomaly_indices[:MAX_TABLE_ROWS]:
        row   = df.iloc[idx]
        score = round(float(anomaly_scores[idx]), 1)

        # Compute z-score per feature
        feat_z = {
            col: round(z_score(col, float(row[col])), 3)
            for col in FEATURE_COLS
        }

        # Top 3 features by |z-score| — these explain the anomaly
        top3 = sorted(feat_z.items(), key=lambda kv: abs(kv[1]), reverse=True)[:3]

        # Count the primary trigger feature (for summary chart)
        primary = top3[0][0] if top3 else None
        if primary:
            feature_trigger_counts[primary] += 1

        anomaly_records.append({
            "id":              int(idx),
            "anomaly_score":   score,
            "status":          "Safe" if int(row["Potability"]) == 1 else "Unsafe",
            # Raw feature values
            "ph":              round(float(row["ph"]),              3),
            "Hardness":        round(float(row["Hardness"]),        2),
            "Solids":          round(float(row["Solids"]),          1),
            "Chloramines":     round(float(row["Chloramines"]),     3),
            "Sulfate":         round(float(row["Sulfate"]),         2),
            "Conductivity":    round(float(row["Conductivity"]),    2),
            "Organic_carbon":  round(float(row["Organic_carbon"]),  3),
            "Trihalomethanes": round(float(row["Trihalomethanes"]), 2),
            "Turbidity":       round(float(row["Turbidity"]),       3),
            # Explanation
            "top_features": [
                {
                    "param":   col,
                    "z_score": z,
                    "value":   round(float(row[col]), 3),
                    "mean":    round(feat_means[col], 3),
                    "direction": "high" if z > 0 else "low",
                }
                for col, z in top3
            ],
        })

    # ── 4. Score distribution histogram (bins over all anomalies) ─────────────
    all_anomaly_scores = anomaly_scores[anomaly_mask]
    bin_edges = np.linspace(0, 100, 11)          # 10 equal bins
    counts, _  = np.histogram(all_anomaly_scores, bins=bin_edges)
    score_distribution = [
        {
            "bin":   f"{int(bin_edges[i])}-{int(bin_edges[i+1])}",
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]

    # ── 5. Feature analysis: mean |z-score| in anomalous vs normal groups ────
    anomaly_df = df[anomaly_mask]
    normal_df  = df[~anomaly_mask]
    feature_analysis = []
    for col in FEATURE_COLS:
        a_absz = float(np.mean(np.abs(
            (anomaly_df[col].values - feat_means[col]) / feat_stds[col]
        )))
        n_absz = float(np.mean(np.abs(
            (normal_df[col].values  - feat_means[col]) / feat_stds[col]
        )))
        feature_analysis.append({
            "param":       col,
            "anomaly_absz": round(a_absz, 3),
            "normal_absz":  round(n_absz, 3),
            "anomaly_mean": round(float(anomaly_df[col].mean()), 3),
            "normal_mean":  round(float(normal_df[col].mean()),  3),
            "global_mean":  round(feat_means[col], 3),
            "global_std":   round(feat_stds[col],  3),
        })
    # Sort by highest anomaly deviation
    feature_analysis.sort(key=lambda x: x["anomaly_absz"], reverse=True)

    _cache = {
        "anomalies":             anomaly_records,
        "total_anomalies":       int(anomaly_mask.sum()),
        "anomaly_rate_pct":      round(float(anomaly_mask.mean()) * 100, 2),
        "total_samples":         n,
        "contamination_setting": CONTAMINATION,
        "score_distribution":    score_distribution,
        "feature_analysis":      feature_analysis,
        "feature_trigger_counts": {
            col: feature_trigger_counts[col]
            for col in sorted(feature_trigger_counts, key=lambda c: feature_trigger_counts[c], reverse=True)
        },
    }

    log.info("[AnomalyDetector] Done. Top trigger: %s",
             next(iter(_cache["feature_trigger_counts"])))
    return _cache


def clear_cache() -> None:
    global _cache
    _cache = None
