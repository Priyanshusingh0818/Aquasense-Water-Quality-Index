import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, AreaChart, Area,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  AlertOctagon, ShieldAlert, Activity, TrendingUp,
  Loader2, RefreshCw, ChevronDown, ChevronUp, Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TopFeature {
  param:     string;
  z_score:   number;
  value:     number;
  mean:      number;
  direction: "high" | "low";
}

interface AnomalyRecord {
  id:               number;
  anomaly_score:    number;
  status:           "Safe" | "Unsafe";
  ph:               number;
  Hardness:         number;
  Solids:           number;
  Chloramines:      number;
  Sulfate:          number;
  Conductivity:     number;
  Organic_carbon:   number;
  Trihalomethanes:  number;
  Turbidity:        number;
  top_features:     TopFeature[];
}

interface FeatureAnalysis {
  param:        string;
  anomaly_absz: number;
  normal_absz:  number;
  anomaly_mean: number;
  normal_mean:  number;
  global_mean:  number;
  global_std:   number;
}

interface AnomalyData {
  anomalies:              AnomalyRecord[];
  total_anomalies:        number;
  anomaly_rate_pct:       number;
  total_samples:          number;
  contamination_setting:  number;
  score_distribution:     { bin: string; count: number }[];
  feature_analysis:       FeatureAnalysis[];
  feature_trigger_counts: Record<string, number>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.DEV ? "http://localhost:5000" : "/api";
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: 12,
};

// Colour ramp for anomaly score: green → amber → red
const scoreColor = (score: number) => {
  if (score >= 75) return { text: "text-danger",   bg: "bg-danger/10",   bar: "#EF4444" };
  if (score >= 50) return { text: "text-moderate", bg: "bg-moderate/10", bar: "#F59E0B" };
  return             { text: "text-safe",    bg: "bg-safe/10",    bar: "#22C55E" };
};

const dirArrow = (dir: "high" | "low") => dir === "high" ? "↑" : "↓";

// ─── Score bar ────────────────────────────────────────────────────────────────
const ScoreBar = ({ score }: { score: number }) => {
  const c = scoreColor(score);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: c.bar }}
        />
      </div>
      <span className={`text-xs font-mono font-bold ${c.text} w-10 text-right`}>{score}</span>
    </div>
  );
};

// ─── Feature trigger badge ────────────────────────────────────────────────────
const TriggerBadge = ({ tf }: { tf: TopFeature }) => {
  const abs = Math.abs(tf.z_score);
  const col = abs >= 2 ? "bg-danger/10 text-danger border-danger/20"
            : abs >= 1 ? "bg-moderate/10 text-moderate border-moderate/20"
            :            "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${col}`}>
      {dirArrow(tf.direction)} {tf.param}
      <span className="font-mono opacity-70">{tf.z_score > 0 ? "+" : ""}{tf.z_score.toFixed(2)}σ</span>
    </span>
  );
};

// ─── Expandable anomaly row ───────────────────────────────────────────────────
const AnomalyRow = ({ rec, i }: { rec: AnomalyRecord; i: number }) => {
  const [expanded, setExpanded] = useState(false);
  const c = scoreColor(rec.anomaly_score);

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: i * 0.015 }}
        onClick={() => setExpanded(!expanded)}
        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
      >
        <td className="px-4 py-3 text-xs text-muted-foreground font-mono">#{rec.id}</td>
        <td className="px-4 py-3"><ScoreBar score={rec.anomaly_score} /></td>
        <td className="px-4 py-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            rec.status === "Safe" ? "bg-safe/10 text-safe" : "bg-danger/10 text-danger"
          }`}>{rec.status}</span>
        </td>
        <td className="px-4 py-3 text-sm text-foreground font-mono">{rec.ph}</td>
        <td className="px-4 py-3 text-sm text-foreground font-mono">{rec.Turbidity}</td>
        <td className="px-4 py-3 text-sm text-foreground font-mono">{rec.Solids.toLocaleString()}</td>
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1">
            {rec.top_features.slice(0, 2).map(tf => <TriggerBadge key={tf.param} tf={tf} />)}
          </div>
        </td>
        <td className="px-3 py-3 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </td>
      </motion.tr>
      <AnimatePresence>
        {expanded && (
          <motion.tr
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <td colSpan={8} className="px-6 py-4 bg-muted/20 border-b border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* All feature values */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">All Parameter Values</p>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                    {[
                      ["pH",        rec.ph],
                      ["Hardness",  rec.Hardness],
                      ["TDS",       rec.Solids],
                      ["Chloramin", rec.Chloramines],
                      ["Sulfate",   rec.Sulfate],
                      ["Conduct.",  rec.Conductivity],
                      ["Org. C",   rec.Organic_carbon],
                      ["THMs",     rec.Trihalomethanes],
                      ["Turbidit", rec.Turbidity],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono font-semibold text-foreground">{(val as number).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Z-score explanation */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Anomaly Drivers (significance)</p>
                  <div className="space-y-2">
                    {rec.top_features.map(tf => {
                      const absZ = Math.abs(tf.z_score);
                      const w = Math.min(absZ / 3 * 100, 100);
                      const barCol = absZ >= 2 ? "#EF4444" : absZ >= 1 ? "#F59E0B" : "#22C55E";
                      return (
                        <div key={tf.param} className="space-y-0.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{tf.param}</span>
                            <span className="font-mono text-foreground">
                              {tf.value} vs avg {tf.mean} ({tf.z_score > 0 ? "+" : ""}{tf.z_score.toFixed(2)}σ)
                            </span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: barCol }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AnomalyDetection() {
  const [data, setData]       = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [sortField, setSortField] = useState<"anomaly_score" | "ph" | "Turbidity">("anomaly_score");
  const [sortAsc, setSortAsc] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"All" | "Safe" | "Unsafe">("All");

  const fetchData = (force = false) => {
    setLoading(true);
    setError(null);
    fetch(`${BASE_URL}/anomaly-data${force ? "?force=1" : ""}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  // ── Feature comparison chart data ─────────────────────────────────────────
  const featureCompData = useMemo(() =>
    data?.feature_analysis.slice(0, 9).map(f => ({
      param:   f.param,
      Anomaly: f.anomaly_absz,
      Normal:  f.normal_absz,
    })) ?? [],
    [data]
  );

  // ── Trigger count chart data ────────────────────────────────────────────────
  const triggerData = useMemo(() =>
    data
      ? Object.entries(data.feature_trigger_counts)
          .map(([param, count]) => ({ param, count }))
          .sort((a, b) => b.count - a.count)
      : [],
    [data]
  );

  // ── Filtered + sorted table ────────────────────────────────────────────────
  const tableRows = useMemo(() => {
    if (!data) return [];
    return data.anomalies
      .filter(a => filterStatus === "All" || a.status === filterStatus)
      .sort((a, b) => {
        const av = a[sortField as keyof AnomalyRecord] as number;
        const bv = b[sortField as keyof AnomalyRecord] as number;
        return sortAsc ? av - bv : bv - av;
      });
  }, [data, filterStatus, sortField, sortAsc]);

  const topTrigger = data
    ? Object.entries(data.feature_trigger_counts)[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Anomaly Detection</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data
              ? `Isolation Forest · ${data.total_samples.toLocaleString()} samples · ${(data.contamination_setting * 100)}% contamination setting`
              : "Running Isolation Forest on the full dataset…"}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/60 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Re-run Detection
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card p-16 flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-medium">Fitting Isolation Forest…</p>
          <p className="text-xs">n_estimators=200 · contamination=5% · computing z-score explanations</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass-card p-6 border-danger/30 border text-sm text-danger">
          ⚠ {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── Summary cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Anomalies Detected",
                value: data.total_anomalies.toLocaleString(),
                sub:   `${data.anomaly_rate_pct}% of dataset`,
                Icon:  AlertOctagon,
                color: "text-danger",
                ibg:   "eco-gradient",
              },
              {
                label: "Safe-labelled Anomalies",
                value: data.anomalies.filter(a => a.status === "Safe").length.toString(),
                sub:   "Suspicious despite 'safe' label",
                Icon:  ShieldAlert,
                color: "text-moderate",
                ibg:   "bg-moderate/10",
              },
              {
                label: "Avg Anomaly Score",
                value: data.anomalies.length
                  ? (data.anomalies.reduce((s, a) => s + a.anomaly_score, 0) / data.anomalies.length).toFixed(1)
                  : "—",
                sub:   "100 = most anomalous",
                Icon:  Activity,
                color: "text-primary",
                ibg:   "bg-primary/10",
              },
              {
                label: "Top Trigger Feature",
                value: topTrigger ? topTrigger[0] : "—",
                sub:   topTrigger ? `Primary driver in ${topTrigger[1]} anomalies` : "",
                Icon:  TrendingUp,
                color: "text-water-blue",
                ibg:   "bg-water-blue/10",
              },
            ].map(({ label, value, sub, Icon, color, ibg }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass-card p-5"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl ${ibg}`}>
                    <Icon className={`h-4 w-4 ${ibg.startsWith("eco") ? "text-primary-foreground" : color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                </div>
                <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </motion.div>
            ))}
          </div>

          {/* ── Charts row ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Score distribution */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-1">Anomaly Score Distribution</h3>
              <p className="text-xs text-muted-foreground mb-4">Count of anomalies per score bucket (0–100)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.score_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bin" stroke="hsl(var(--muted-foreground))" fontSize={9} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Anomalies" radius={[4, 4, 0, 0]}
                    fill="url(#scoreGrad)"
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#22C55E" />
                      <stop offset="50%"  stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Feature trigger counts */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-1">Top Anomaly Triggers</h3>
              <p className="text-xs text-muted-foreground mb-4">Primary responsible feature per anomaly</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={triggerData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis dataKey="param" type="category" stroke="hsl(var(--muted-foreground))" fontSize={9} width={90} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Anomalies driven" fill="#0EA5E9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Feature deviation: anomaly vs normal */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
              <h3 className="font-display font-semibold text-foreground mb-1">Feature Deviation</h3>
              <p className="text-xs text-muted-foreground mb-4">Mean |z-score|: anomalous vs normal groups</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={featureCompData}>
                  <defs>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gN" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="param" stroke="hsl(var(--muted-foreground))" fontSize={9} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toFixed(3), "Mean |z|"]} />
                  <Legend />
                  <Area type="monotone" dataKey="Anomaly" stroke="#EF4444" fill="url(#gA)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Normal"  stroke="#22C55E" fill="url(#gN)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* ── Anomaly records table ──────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card">
            <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display font-semibold text-foreground">Anomalous Samples</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click a row to expand feature values and z-score explanation · showing {tableRows.length} records
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  Sort:
                </div>
                {(["anomaly_score", "ph", "Turbidity"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => { if (sortField === f) setSortAsc(!sortAsc); else { setSortField(f); setSortAsc(false); } }}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${sortField === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {f === "anomaly_score" ? "Score" : f}
                  </button>
                ))}
                <div className="w-px h-4 bg-border mx-1" />
                {(["All", "Safe", "Unsafe"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["#", "Score", "Status", "pH", "Turbidity", "Solids (TDS)", "Top Triggers", ""].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((rec, i) => (
                    <AnomalyRow key={rec.id} rec={rec} i={i} />
                  ))}
                  {tableRows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">No anomalies match filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
