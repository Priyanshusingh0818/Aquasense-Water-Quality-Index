"""
Data drift monitor for AquaSense water quality features.

Reference distribution: the 80% training split (same seed/stratification as
model_trainer.py) — i.e. exactly the data the production model was fitted on.

Current distribution: the 20% held-out test split — represents data arriving
after training (production window).

Statistical tests used per feature
────────────────────────────────────
• KS test (Kolmogorov-Smirnov)
    Two-sample non-parametric test that measures the maximum difference
    between two empirical CDFs.  p < 0.05 → statistically significant drift.
    ks_statistic ∈ [0, 1]: 0 = identical, 1 = completely separated.

• PSI (Population Stability Index)
    Industry-standard metric developed for credit-scoring model monitoring.
    PSI < 0.10 → stable
    PSI 0.10–0.20 → minor drift (monitor)
    PSI > 0.20 → significant drift (action required)
    Computed over 10 equal-width bins anchored on the reference distribution.

• Mean shift (in standard deviations of the reference)
    Δμ / σ_ref — a signed effect-size measure.
    |Δμ/σ| > 0.5 → practically meaningful shift.

• Variance ratio
    σ_cur² / σ_ref² — 1.0 = identical spread, >1 = wider, <1 = narrower.

Drift level assignment (per feature)
─────────────────────────────────────
  critical : PSI > 0.20  OR  (KS p < 0.05 AND |mean_shift_sigma| > 0.5)
  warning  : PSI 0.10–0.20  OR  KS p < 0.05
  stable   : everything else

Cache: computed once per process; call clear_cache() or ?force=1 to recompute.
"""

from __future__ import annotations

import logging
import numpy as np
from scipy.stats import ks_2samp
from sklearn.model_selection import train_test_split

from ml.data_processor import get_dataset, FEATURE_COLS

log = logging.getLogger(__name__)

# ── Must match model_trainer exactly ─────────────────────────────────────────
TEST_SIZE   = 0.2
RANDOM_SEED = 42
PSI_BINS    = 10

# ── Drift thresholds ──────────────────────────────────────────────────────────
PSI_WARNING  = 0.10
PSI_CRITICAL = 0.20
KS_ALPHA     = 0.05    # significance level
MEAN_SHIFT_THRESHOLD = 0.5   # |σ| considered practically significant

# ── Cache ─────────────────────────────────────────────────────────────────────
_cache: dict | None = None


# ─────────────────────────────────────────────────────────────────────────────
# PSI
# ─────────────────────────────────────────────────────────────────────────────

def _psi(reference: np.ndarray, current: np.ndarray, bins: int = PSI_BINS) -> float:
    """
    Population Stability Index.
    Bins are anchored on the reference distribution so both populations
    are measured against the same fixed grid.
    """
    eps = 1e-8
    lo  = min(reference.min(), current.min())
    hi  = max(reference.max(), current.max())
    edges = np.linspace(lo, hi, bins + 1)

    ref_cnt, _  = np.histogram(reference, bins=edges)
    cur_cnt, _  = np.histogram(current,   bins=edges)

    ref_pct = (ref_cnt / len(reference)) + eps
    cur_pct = (cur_cnt / len(current))   + eps

    psi = float(np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct)))
    return round(psi, 5)


# ─────────────────────────────────────────────────────────────────────────────
# Drift level + natural-language explanation
# ─────────────────────────────────────────────────────────────────────────────

def _drift_level(psi: float, ks_p: float, mean_shift_sigma: float) -> str:
    if psi > PSI_CRITICAL or (ks_p < KS_ALPHA and abs(mean_shift_sigma) > MEAN_SHIFT_THRESHOLD):
        return "critical"
    if psi > PSI_WARNING or ks_p < KS_ALPHA:
        return "warning"
    return "stable"


def _explain(param: str, level: str, psi: float, ks_stat: float, ks_p: float,
             ref_mean: float, cur_mean: float, ref_std: float,
             mean_shift_sigma: float, var_ratio: float) -> str:
    """Generate a single sentence in plain English describing the drift status."""
    direction = "increased" if cur_mean > ref_mean else "decreased"
    abs_shift = abs(cur_mean - ref_mean)
    spread_info = (
        "spread is wider" if var_ratio > 1.1 else
        "spread is narrower" if var_ratio < 0.9 else
        "spread is stable"
    )

    if level == "stable":
        return (
            f"{param} distribution is stable — training and current populations are "
            f"statistically similar (KS p={ks_p:.3f}, PSI={psi:.3f}). "
            f"Mean is {cur_mean:.3f} vs training {ref_mean:.3f} ({spread_info})."
        )
    if level == "warning":
        return (
            f"{param} shows minor drift — the distribution has shifted slightly "
            f"(KS p={ks_p:.3f}, PSI={psi:.3f}). "
            f"Mean {direction} from {ref_mean:.3f} to {cur_mean:.3f} "
            f"(Δ={abs_shift:.3f}, {abs(mean_shift_sigma):.2f}σ). {spread_info.capitalize()}. "
            f"Monitor closely."
        )
    # critical
    return (
        f"{param} distribution has shifted significantly — "
        f"PSI={psi:.3f} exceeds the 0.20 threshold. "
        f"Mean {direction} from {ref_mean:.3f} to {cur_mean:.3f} "
        f"(Δ={abs_shift:.3f}, {abs(mean_shift_sigma):.2f}σ). {spread_info.capitalize()}. "
        f"Model may be operating outside its training range — retraining recommended."
    )


# ─────────────────────────────────────────────────────────────────────────────
# Per-feature binned distributions for visualisation
# ─────────────────────────────────────────────────────────────────────────────

def _distribution(ref: np.ndarray, cur: np.ndarray, bins: int = 14) -> dict:
    """
    Return a histogram with shared bin edges (anchored on reference) so that
    both reference and current bars are directly comparable in a grouped chart.
    """
    lo = min(ref.min(), cur.min())
    hi = max(ref.max(), cur.max())
    edges = np.linspace(lo, hi, bins + 1)
    centers = [round((edges[i] + edges[i + 1]) / 2, 3) for i in range(bins)]

    ref_cnt, _ = np.histogram(ref, bins=edges)
    cur_cnt, _ = np.histogram(cur, bins=edges)

    # Normalise to density (fraction of population) for fair comparison when
    # reference and current have different sample sizes
    ref_dens = (ref_cnt / len(ref) * 100).round(2).tolist()
    cur_dens = (cur_cnt / len(cur) * 100).round(2).tolist()

    return {"labels": centers, "reference": ref_dens, "current": cur_dens}


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def detect_drift(force: bool = False) -> dict:
    """
    Compare training vs production (test) distributions for all 9 features.

    Returns:
        dict with:
          reference_size, current_size, split_method,
          features (list of per-feature stats + explanation + distribution),
          drifted_count, warning_count, stable_count,
          overall_psi, summary (natural-language overview)
    """
    global _cache
    if _cache is not None and not force:
        return _cache

    log.info("[DriftDetector] Computing drift between training and test distributions…")

    df = get_dataset()
    X  = df[FEATURE_COLS].values
    y  = df["Potability"].values

    # ── Same split as model_trainer.py → reference = training data ───────────
    X_ref, X_cur, _, _ = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_SEED, stratify=y
    )

    n_ref, n_cur = len(X_ref), len(X_cur)
    log.info("[DriftDetector] Reference n=%d  |  Current n=%d", n_ref, n_cur)

    feature_results = []
    drift_levels    = []

    for i, col in enumerate(FEATURE_COLS):
        ref = X_ref[:, i].astype(float)
        cur = X_cur[:, i].astype(float)

        # ── Statistical tests ─────────────────────────────────────────────────
        ks_stat, ks_p = ks_2samp(ref, cur)
        psi            = _psi(ref, cur)

        ref_mean = float(ref.mean())
        cur_mean = float(cur.mean())
        ref_std  = max(float(ref.std()), 1e-9)
        cur_std  = float(cur.std())

        mean_shift_sigma = (cur_mean - ref_mean) / ref_std
        var_ratio        = (cur_std ** 2) / (ref_std ** 2)

        level = _drift_level(psi, ks_p, mean_shift_sigma)
        drift_levels.append(level)

        explanation = _explain(
            col, level, psi, ks_stat, ks_p,
            ref_mean, cur_mean, ref_std, mean_shift_sigma, var_ratio
        )

        feature_results.append({
            "param":             col,
            "drift_level":       level,
            # KS test
            "ks_statistic":      round(float(ks_stat), 5),
            "ks_pvalue":         round(float(ks_p), 5),
            # PSI
            "psi":               psi,
            # Descriptive stats
            "ref_mean":          round(ref_mean, 4),
            "cur_mean":          round(cur_mean, 4),
            "ref_std":           round(ref_std,  4),
            "cur_std":           round(cur_std,  4),
            "mean_shift":        round(cur_mean - ref_mean, 5),
            "mean_shift_sigma":  round(mean_shift_sigma, 4),
            "variance_ratio":    round(var_ratio, 4),
            # Explanation
            "explanation":       explanation,
            # Distribution (for chart)
            "distribution":      _distribution(ref, cur),
        })

        log.debug("[DriftDetector] %-22s KS=%.4f (p=%.4f)  PSI=%.4f  level=%s",
                  col, ks_stat, ks_p, psi, level)

    # ── Summary ───────────────────────────────────────────────────────────────
    n_critical = drift_levels.count("critical")
    n_warning  = drift_levels.count("warning")
    n_stable   = drift_levels.count("stable")
    overall_psi = round(float(np.mean([f["psi"] for f in feature_results])), 5)

    # Sort: critical first, then warning, then stable; within each by PSI desc
    level_order = {"critical": 0, "warning": 1, "stable": 2}
    feature_results.sort(
        key=lambda x: (level_order[x["drift_level"]], -x["psi"])
    )

    if n_critical > 0:
        top = [f["param"] for f in feature_results if f["drift_level"] == "critical"]
        summary = (
            f"{n_critical} feature{'s' if n_critical > 1 else ''} showing significant drift: "
            f"{', '.join(top)}. The production distribution has diverged from training — "
            f"consider retraining the model."
        )
    elif n_warning > 0:
        top = [f["param"] for f in feature_results if f["drift_level"] == "warning"]
        summary = (
            f"{n_warning} feature{'s' if n_warning > 1 else ''} showing minor drift: "
            f"{', '.join(top)}. Monitor closely — no immediate retraining required."
        )
    else:
        summary = (
            "All 9 features are stable. Training and current distributions are "
            "statistically consistent. The production model is operating within its "
            "expected data range."
        )

    _cache = {
        "reference_size":  n_ref,
        "current_size":    n_cur,
        "split_method":    f"Stratified {int((1-TEST_SIZE)*100)}/{int(TEST_SIZE*100)} split "
                           f"(seed={RANDOM_SEED}) — identical to model training split",
        "features":        feature_results,
        "drifted_count":   n_critical,
        "warning_count":   n_warning,
        "stable_count":    n_stable,
        "overall_psi":     overall_psi,
        "psi_threshold_warning":  PSI_WARNING,
        "psi_threshold_critical": PSI_CRITICAL,
        "ks_alpha":        KS_ALPHA,
        "summary":         summary,
    }

    log.info(
        "[DriftDetector] Done. critical=%d  warning=%d  stable=%d  overall_PSI=%.4f",
        n_critical, n_warning, n_stable, overall_psi
    )
    return _cache


def clear_cache() -> None:
    global _cache
    _cache = None
