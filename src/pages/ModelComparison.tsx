import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Trophy, RefreshCw, Loader2, ShieldCheck, Target, Brain, FlaskConical,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ModelResult {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  precision_safe: number;
  recall_safe: number;
  f1_safe: number;
  auc: number | null;
  cv_f1_mean: number;
  cv_f1_std: number;
  confusion_matrix: [[number, number], [number, number]]; // [[TN,FP],[FN,TP]]
  train_time_s: number;
}

interface ComparisonData {
  models: ModelResult[];
  best_model: string;
  best_f1: number;
  train_size: number;
  test_size: number;
  feature_count: number;
  xgboost_available: boolean;
  justification: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.DEV ? "http://localhost:5000" : "/api";

// Stable colour per model — consistent across all charts
const MODEL_COLORS: Record<string, string> = {
  "Logistic Regression": "#0EA5E9",
  "Random Forest":       "#22C55E",
  "Gradient Boosting":   "#F59E0B",
  "XGBoost":             "#A855F7",
};
const fallbackColors = ["#0EA5E9", "#22C55E", "#F59E0B", "#A855F7"];
const modelColor = (name: string, i: number) =>
  MODEL_COLORS[name] ?? fallbackColors[i % fallbackColors.length];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: 12,
};

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;

// ─── Confusion Matrix visual ──────────────────────────────────────────────────
const ConfusionMatrix = ({ cm, model }: { cm: [[number, number], [number, number]]; model: string }) => {
  const tn = cm[0][0], fp = cm[0][1], fn = cm[1][0], tp = cm[1][1];
  const total = tn + fp + fn + tp;

  const cells = [
    { label: "TN", value: tn, detail: "Unsafe → Unsafe ✓", bg: "bg-safe/15",     text: "text-safe",    border: "border-safe/30"    },
    { label: "FP", value: fp, detail: "Unsafe → Safe ✗",   bg: "bg-danger/15",   text: "text-danger",  border: "border-danger/30"  },
    { label: "FN", value: fn, detail: "Safe → Unsafe ✗",   bg: "bg-moderate/15", text: "text-moderate",border: "border-moderate/30" },
    { label: "TP", value: tp, detail: "Safe → Safe ✓",      bg: "bg-safe/15",     text: "text-safe",    border: "border-safe/30"    },
  ];

  return (
    <div className="glass-card p-4 space-y-3">
      <div>
        <p className="font-display font-semibold text-foreground text-sm">{model}</p>
        <p className="text-xs text-muted-foreground">Confusion matrix · {total} test samples</p>
      </div>
      {/* Header row */}
      <div className="grid grid-cols-3 gap-1 text-xs text-center text-muted-foreground">
        <div />
        <div className="font-semibold">Predicted<br />Unsafe</div>
        <div className="font-semibold">Predicted<br />Safe</div>
        {/* TN / FP */}
        <div className="font-semibold text-left self-center">Actual<br />Unsafe</div>
        {[cells[0], cells[1]].map((c, i) => (
          <div key={i} className={`rounded-lg p-2 border ${c.bg} ${c.border}`}>
            <p className={`text-base font-bold ${c.text}`}>{c.value}</p>
            <p className="text-muted-foreground text-xs">{c.label}</p>
            <p className="text-muted-foreground/60 text-xs leading-tight">{((c.value / total) * 100).toFixed(1)}%</p>
          </div>
        ))}
        {/* FN / TP */}
        <div className="font-semibold text-left self-center">Actual<br />Safe</div>
        {[cells[2], cells[3]].map((c, i) => (
          <div key={i} className={`rounded-lg p-2 border ${c.bg} ${c.border}`}>
            <p className={`text-base font-bold ${c.text}`}>{c.value}</p>
            <p className="text-muted-foreground text-xs">{c.label}</p>
            <p className="text-muted-foreground/60 text-xs leading-tight">{((c.value / total) * 100).toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Metric row for comparison table ─────────────────────────────────────────
const MetricRow = ({ label, models, field, isBest }: {
  label: string;
  models: ModelResult[];
  field: keyof ModelResult;
  isBest: (a: ModelResult, b: ModelResult) => boolean;
}) => {
  const best = models.reduce((a, b) => isBest(a, b) ? a : b);
  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-sm text-muted-foreground font-medium">{label}</td>
      {models.map(m => {
        const val = m[field];
        const isTop = m === best;
        const display = typeof val === "number"
          ? (val < 2 ? pct(val) : val.toFixed(3) + "s")
          : String(val ?? "N/A");
        return (
          <td key={m.model} className={`px-4 py-3 text-sm text-center font-mono ${isTop ? "text-primary font-bold" : "text-foreground"}`}>
            {isTop ? <span className="inline-flex items-center gap-1">{display} <Trophy className="h-3 w-3 text-amber-400" /></span> : display}
          </td>
        );
      })}
    </tr>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function ModelComparison() {
  const [data, setData]       = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [retraining, setRetraining] = useState(false);

  const fetchComparison = (force = false) => {
    setLoading(true);
    setError(null);
    const url = force ? `${BASE_URL}/model-comparison?force=1` : `${BASE_URL}/model-comparison`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); setRetraining(false); })
      .catch(e => { setError(e.message); setLoading(false); setRetraining(false); });
  };

  useEffect(() => { fetchComparison(); }, []);

  // ── Radar data: one spoke per metric, one series per model ────────────────
  const radarData = data ? [
    { metric: "Accuracy",  ...Object.fromEntries(data.models.map(m => [m.model, +(m.accuracy  * 100).toFixed(2)])) },
    { metric: "Precision", ...Object.fromEntries(data.models.map(m => [m.model, +(m.precision * 100).toFixed(2)])) },
    { metric: "Recall",    ...Object.fromEntries(data.models.map(m => [m.model, +(m.recall    * 100).toFixed(2)])) },
    { metric: "F1",        ...Object.fromEntries(data.models.map(m => [m.model, +(m.f1        * 100).toFixed(2)])) },
    { metric: "AUC",       ...Object.fromEntries(data.models.map(m => [m.model, +((m.auc ?? 0) * 100).toFixed(2)])) },
    { metric: "CV F1",     ...Object.fromEntries(data.models.map(m => [m.model, +(m.cv_f1_mean * 100).toFixed(2)])) },
  ] : [];

  // ── Grouped bar chart data ────────────────────────────────────────────────
  const barData = data ? [
    { metric: "Accuracy",  ...Object.fromEntries(data.models.map(m => [m.model, +(m.accuracy  * 100).toFixed(2)])) },
    { metric: "Precision", ...Object.fromEntries(data.models.map(m => [m.model, +(m.precision * 100).toFixed(2)])) },
    { metric: "Recall",    ...Object.fromEntries(data.models.map(m => [m.model, +(m.recall    * 100).toFixed(2)])) },
    { metric: "F1",        ...Object.fromEntries(data.models.map(m => [m.model, +(m.f1        * 100).toFixed(2)])) },
    { metric: "AUC",       ...Object.fromEntries(data.models.map(m => [m.model, +((m.auc ?? 0) * 100).toFixed(2)])) },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Model Comparison</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data
              ? `${data.models.length} models trained · ${data.train_size} train / ${data.test_size} test samples · ${data.feature_count} features`
              : loading ? "Training models on the real dataset…" : ""}
          </p>
        </div>
        <button
          onClick={() => { setRetraining(true); fetchComparison(true); }}
          disabled={loading || retraining}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/60 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${retraining ? "animate-spin" : ""}`} />
          {retraining ? "Retraining…" : "Retrain All Models"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="glass-card p-16 flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-medium">Training models on real dataset…</p>
          <p className="text-xs text-center max-w-xs">
            Fitting Logistic Regression, Random Forest, and Gradient Boosting
            with 3-fold cross-validation. This runs once and is cached.
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass-card p-6 border-danger/30 border text-sm text-danger">
          ⚠ {error} — Make sure the backend is running at {BASE_URL}.
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── Summary Cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl eco-gradient"><Trophy className="h-4 w-4 text-primary-foreground" /></div>
                <p className="text-xs text-muted-foreground font-medium">Best Model</p>
              </div>
              <p className="text-xl font-display font-bold text-foreground">{data.best_model}</p>
              <p className="text-xs text-muted-foreground mt-1">Selected by weighted F1</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10"><Target className="h-4 w-4 text-primary" /></div>
                <p className="text-xs text-muted-foreground font-medium">Best F1 Score</p>
              </div>
              <p className="text-xl font-display font-bold text-foreground">{pct(data.best_f1)}</p>
              <p className="text-xs text-muted-foreground mt-1">Weighted average across classes</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-safe/10"><ShieldCheck className="h-4 w-4 text-safe" /></div>
                <p className="text-xs text-muted-foreground font-medium">Best Accuracy</p>
              </div>
              <p className="text-xl font-display font-bold text-foreground">
                {pct(Math.max(...data.models.map(m => m.accuracy)))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.models.reduce((a, b) => a.accuracy > b.accuracy ? a : b).model}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="glass-card p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-water-blue/10"><Brain className="h-4 w-4 text-water-blue" /></div>
                <p className="text-xs text-muted-foreground font-medium">Models Evaluated</p>
              </div>
              <p className="text-xl font-display font-bold text-foreground">{data.models.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.xgboost_available ? "LR · RF · GB · XGBoost" : "LR · RF · Gradient Boosting"}
              </p>
            </motion.div>
          </div>

          {/* ── Grouped bar chart + Radar ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-1">Metric Comparison</h3>
              <p className="text-xs text-muted-foreground mb-4">All metrics in % — higher is better</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[50, 100]} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`]} />
                  <Legend />
                  {data.models.map((m, i) => (
                    <Bar key={m.model} dataKey={m.model} fill={modelColor(m.model, i)} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-1">Radar Overview</h3>
              <p className="text-xs text-muted-foreground mb-4">Multi-metric comparison on one chart</p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <PolarRadiusAxis stroke="hsl(var(--border))" fontSize={9} domain={[50, 100]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`]} />
                  {data.models.map((m, i) => (
                    <Radar
                      key={m.model} name={m.model} dataKey={m.model}
                      stroke={modelColor(m.model, i)} fill={modelColor(m.model, i)}
                      fillOpacity={0.12} strokeWidth={2}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* ── Confusion Matrices ────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="font-display font-semibold text-foreground mb-3">Confusion Matrices</h3>
            <div className={`grid gap-4 ${data.models.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
              {data.models.map(m => (
                <ConfusionMatrix key={m.model} cm={m.confusion_matrix} model={m.model} />
              ))}
            </div>
          </motion.div>

          {/* ── Full metric table ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card overflow-x-auto">
            <div className="p-5 border-b border-border">
              <h3 className="font-display font-semibold text-foreground">Full Metrics Table</h3>
              <p className="text-xs text-muted-foreground mt-1">🏆 marks the best value per metric</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Metric</th>
                  {data.models.map((m, i) => (
                    <th key={m.model} className={`text-center text-xs font-semibold px-4 py-3 ${m.model === data.best_model ? "text-primary" : "text-muted-foreground"}`}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: modelColor(m.model, i) }} />
                        {m.model} {m.model === data.best_model && <Trophy className="h-3 w-3 text-amber-400 inline ml-1" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <MetricRow label="Accuracy (weighted)"  models={data.models} field="accuracy"   isBest={(a, b) => a.accuracy   > b.accuracy  } />
                <MetricRow label="Precision (weighted)" models={data.models} field="precision"  isBest={(a, b) => a.precision  > b.precision } />
                <MetricRow label="Recall (weighted)"    models={data.models} field="recall"     isBest={(a, b) => a.recall     > b.recall    } />
                <MetricRow label="F1 (weighted)"        models={data.models} field="f1"         isBest={(a, b) => a.f1         > b.f1        } />
                <MetricRow label="AUC-ROC"              models={data.models} field="auc"        isBest={(a, b) => (a.auc ?? 0) > (b.auc ?? 0)} />
                <MetricRow label="CV F1 Mean (3-fold)"  models={data.models} field="cv_f1_mean" isBest={(a, b) => a.cv_f1_mean > b.cv_f1_mean} />
                <MetricRow label="CV F1 Std (stability)"models={data.models} field="cv_f1_std"  isBest={(a, b) => a.cv_f1_std  < b.cv_f1_std } />
                <MetricRow label="Train Time (s)"       models={data.models} field="train_time_s" isBest={(a, b) => a.train_time_s < b.train_time_s} />
              </tbody>
            </table>
          </motion.div>

          {/* ── Winner Justification ──────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6 border-primary/20 border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl eco-gradient">
                <FlaskConical className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Model Selection Justification</h3>
                <p className="text-xs text-muted-foreground">Why <strong className="text-primary">{data.best_model}</strong> was chosen as the production model</p>
              </div>
            </div>
            <pre className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">{data.justification}</pre>
          </motion.div>
        </>
      )}
    </div>
  );
}
