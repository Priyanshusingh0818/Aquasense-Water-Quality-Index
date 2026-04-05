import os
import numpy as np
import pandas as pd
import joblib

DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data", "water_potability.csv"
)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "water_quality_model.pkl")

FEATURE_COLS = [
    "ph", "Hardness", "Solids", "Chloramines", "Sulfate",
    "Conductivity", "Organic_carbon", "Trihalomethanes", "Turbidity"
]

# WHO/EPA safe drinking water thresholds
WHO_THRESHOLDS = {
    "ph":              {"low": 6.5,  "high": 8.5},
    "Turbidity":       {"low": None, "high": 4.0},
    "Chloramines":     {"low": None, "high": 4.0},
    "Sulfate":         {"low": None, "high": 250.0},
    "Organic_carbon":  {"low": None, "high": 10.0},
    "Trihalomethanes": {"low": None, "high": 80.0},
    "Hardness":        {"low": None, "high": 300.0},
    "Solids":          {"low": None, "high": 500.0},
    "Conductivity":    {"low": None, "high": 400.0},
}

# Min/max ranges for radar normalization (0–100 scale)
PARAM_RANGES = {
    "ph":              (0,   14),
    "Hardness":        (0,   325),
    "Solids":          (0,   62000),
    "Chloramines":     (0,   14),
    "Sulfate":         (100, 500),
    "Conductivity":    (150, 800),
    "Organic_carbon":  (0,   30),
    "Trihalomethanes": (0,   125),
    "Turbidity":       (0,   7),
}


# ─────────────────────────────────────────────────────────────────────────────
# Dataset Generation
# ─────────────────────────────────────────────────────────────────────────────

def _generate_dataset(n=3276, seed=42):
    """
    Generate a statistically representative water potability dataset
    matching known Kaggle water_potability.csv distributions.
    Seeded — fully deterministic output.
    """
    rng = np.random.default_rng(seed)
    n_safe = int(n * 0.39)
    n_unsafe = n - n_safe

    potability = np.array([1] * n_safe + [0] * n_unsafe, dtype=int)
    rng.shuffle(potability)
    s = potability == 1
    u = potability == 0

    # pH — safe closer to neutral; 15% NaN
    ph = np.empty(n, dtype=float)
    ph[s] = np.clip(rng.normal(7.15, 0.72, n_safe), 6.2, 8.8)
    ph[u] = np.clip(rng.normal(6.90, 1.90, n_unsafe), 2.0, 13.0)
    ph[rng.choice(n, int(n * 0.15), replace=False)] = np.nan

    # Hardness — similar across groups
    hardness = np.clip(rng.normal(196.4, 32.9, n), 47, 323)

    # TDS — higher in unsafe
    solids = np.empty(n, dtype=float)
    solids[s] = np.clip(rng.normal(19500, 7000, n_safe), 300, 55000)
    solids[u] = np.clip(rng.normal(24200, 9500, n_unsafe), 300, 61500)

    # Chloramines
    chloramines = np.clip(rng.normal(7.12, 1.58, n), 0.35, 13.13)

    # Sulfate — 24% NaN
    sulfate = np.clip(rng.normal(333.8, 41.4, n), 129, 481).astype(float)
    sulfate[rng.choice(n, int(n * 0.24), replace=False)] = np.nan

    # Conductivity
    conductivity = np.clip(rng.normal(426.2, 80.8, n), 181, 753)

    # Organic carbon — higher in unsafe
    org = np.empty(n, dtype=float)
    org[s] = np.clip(rng.normal(13.1, 2.9, n_safe), 2.2, 25)
    org[u] = np.clip(rng.normal(15.1, 3.5, n_unsafe), 2.2, 28.3)

    # Trihalomethanes — higher in unsafe; 5% NaN
    thm = np.empty(n, dtype=float)
    thm[s] = np.clip(rng.normal(62.0, 14.5, n_safe), 0.7, 120)
    thm[u] = np.clip(rng.normal(69.5, 17.2, n_unsafe), 0.7, 124)
    thm[rng.choice(n, int(n * 0.05), replace=False)] = np.nan

    # Turbidity — higher in unsafe
    turbidity = np.empty(n, dtype=float)
    turbidity[s] = np.clip(rng.normal(3.75, 0.65, n_safe), 1.4, 6.0)
    turbidity[u] = np.clip(rng.normal(4.12, 0.85, n_unsafe), 1.4, 6.74)

    return pd.DataFrame({
        "ph": ph, "Hardness": hardness, "Solids": solids,
        "Chloramines": chloramines, "Sulfate": sulfate,
        "Conductivity": conductivity, "Organic_carbon": org,
        "Trihalomethanes": thm, "Turbidity": turbidity,
        "Potability": potability,
    })


# ─────────────────────────────────────────────────────────────────────────────
# Load + Clean
# ─────────────────────────────────────────────────────────────────────────────

def load_and_clean():
    """Load CSV if present, else generate. Then clean and return DataFrame."""
    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)
    else:
        df = _generate_dataset()
        os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
        df.to_csv(DATA_PATH, index=False)
        print(f"[DataProcessor] Generated dataset → {DATA_PATH}")

    # 1. Remove exact duplicates
    df = df.drop_duplicates()

    # 2. Enforce numeric types
    for col in FEATURE_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["Potability"] = pd.to_numeric(df["Potability"], errors="coerce")

    # 3. Drop rows with missing label
    df = df.dropna(subset=["Potability"])
    df["Potability"] = df["Potability"].astype(int)

    # 4. Fill feature NaNs with column median
    for col in FEATURE_COLS:
        df[col] = df[col].fillna(df[col].median())

    return df.reset_index(drop=True)


# Singleton cache
_df_cache = None

def get_dataset():
    global _df_cache
    if _df_cache is None:
        _df_cache = load_and_clean()
    return _df_cache


# ─────────────────────────────────────────────────────────────────────────────
# Stat Functions
# ─────────────────────────────────────────────────────────────────────────────

def compute_summary(df):
    total  = len(df)
    safe   = int((df["Potability"] == 1).sum())
    unsafe = int((df["Potability"] == 0).sum())
    param_stats = {}
    for col in FEATURE_COLS:
        param_stats[col] = {
            "mean":        round(float(df[col].mean()), 3),
            "std":         round(float(df[col].std()),  3),
            "min":         round(float(df[col].min()),  3),
            "max":         round(float(df[col].max()),  3),
            "safe_mean":   round(float(df[df["Potability"] == 1][col].mean()), 3),
            "unsafe_mean": round(float(df[df["Potability"] == 0][col].mean()), 3),
        }
    return {
        "total":           total,
        "safe":            safe,
        "unsafe":          unsafe,
        "safe_percent":    round(safe  / total * 100, 1),
        "unsafe_percent":  round(unsafe / total * 100, 1),
        "parameter_stats": param_stats,
    }


def compute_distributions(df, col, bins=12):
    """Binned safe vs unsafe counts for one parameter."""
    safe_df   = df[df["Potability"] == 1]
    unsafe_df = df[df["Potability"] == 0]
    edges   = np.linspace(df[col].min(), df[col].max(), bins + 1)
    centers = [(edges[i] + edges[i + 1]) / 2 for i in range(bins)]
    s_cnt, _ = np.histogram(safe_df[col],   bins=edges)
    u_cnt, _ = np.histogram(unsafe_df[col], bins=edges)
    return {
        "labels":  [round(c, 2) for c in centers],
        "safe":    s_cnt.tolist(),
        "unsafe":  u_cnt.tolist(),
    }
import joblib
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "water_quality_model.pkl")

def compute_feature_importances():
    if not os.path.exists(MODEL_PATH):
        return []
    model = joblib.load(MODEL_PATH)
    result = [
        {"param": col, "importance": round(float(imp) * 100, 2)}
        for col, imp in zip(FEATURE_COLS, model.feature_importances_)
    ]
    return sorted(result, key=lambda x: x["importance"], reverse=True)


def compute_radar(df):
    """Normalize parameter means (0–100) for safe vs unsafe groups."""
    result = []
    for col in FEATURE_COLS:
        lo, hi = PARAM_RANGES[col]
        sm = float(df[df["Potability"] == 1][col].mean())
        um = float(df[df["Potability"] == 0][col].mean())
        result.append({
            "param":    col,
            "safe":    round(max(0, min(100, (sm - lo) / (hi - lo) * 100)), 1),
            "unsafe":  round(max(0, min(100, (um - lo) / (hi - lo) * 100)), 1),
            "fullMark": 100,
        })
    return result
