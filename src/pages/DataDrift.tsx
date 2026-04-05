import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Activity, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Info, Loader2, RefreshCw, BarChartHorizontal
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Distribution {
  labels: number[];
  reference: number[];
  current: number[];
}

interface FeatureDrift {
  param: string;
  drift_level: "stable" | "warning" | "critical";
  ks_statistic: number;
  ks_pvalue: number;
  psi: number;
  ref_mean: number;
  cur_mean: number;
  ref_std: number;
  cur_std: number;
  mean_shift: number;
  mean_shift_sigma: number;
  variance_ratio: number;
  explanation: string;
  distribution: Distribution;
}

interface DriftData {
  reference_size: number;
  current_size: number;
  split_method: string;
  features: FeatureDrift[];
  drifted_count: number;
  warning_count: number;
  stable_count: number;
  overall_psi: number;
  psi_threshold_warning: number;
  psi_threshold_critical: number;
  ks_alpha: number;
  summary: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.DEV ? "http://localhost:5000" : "/api";

const STATUS_ICONS = {
  stable:   <CheckCircle2 className="h-4 w-4 text-safe" />,
  warning:  <AlertTriangle className="h-4 w-4 text-moderate" />,
  critical: <AlertTriangle className="h-4 w-4 text-danger" />,
};

const STATUS_COLORS = {
  stable:   "bg-safe/10 text-safe border-safe/20",
  warning:  "bg-moderate/10 text-moderate border-moderate/20",
  critical: "bg-danger/10 text-danger border-danger/20",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontSize: 12,
};

// ─── Feature Drift Card ───────────────────────────────────────────────────────
const FeatureDriftCard = ({ feature }: { feature: FeatureDrift }) => {
  const [expanded, setExpanded] = useState(false);

  // Transform distribution dictionary format into Recharts array-of-objects format
  const chartData = useMemo(() => {
    const dist = feature.distribution;
    return dist.labels.map((lbl, idx) => ({
      bin: lbl,
      Reference: dist.reference[idx],
      Current: dist.current[idx],
    }));
  }, [feature.distribution]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card overflow-hidden border ${feature.drift_level === "critical" ? "border-danger/30" : "border-border"}`}
    >
      {/* Header */}
      <div 
        className="p-5 flex items-start justify-between cursor-pointer hover:bg-muted/10 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-display font-semibold text-lg text-foreground">{feature.param}</h3>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[feature.drift_level]}`}>
              {STATUS_ICONS[feature.drift_level]}
              {feature.drift_level.charAt(0).toUpperCase() + feature.drift_level.slice(1)}
            </span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed max-w-2xl">
            {feature.explanation}
          </p>
        </div>
        
        <div className="flex items-center gap-6 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">PSI</p>
            <p className={`font-mono font-bold ${
              feature.psi > 0.2 ? "text-danger" : feature.psi > 0.1 ? "text-moderate" : "text-foreground"
            }`}>{feature.psi.toFixed(4)}</p>
          </div>
          <div className="p-2 text-muted-foreground">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 bg-muted/5 relative"
          >
            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Stats Table */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statistical Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 rounded bg-muted/20">
                    <span className="text-muted-foreground">KS Statistic <span className="text-xs opacity-60">(p-value)</span></span>
                    <span className="font-mono text-foreground font-medium text-right">
                      {feature.ks_statistic.toFixed(4)} <br/>
                      <span className={`text-xs ${feature.ks_pvalue < 0.05 ? "text-moderate" : "text-safe"}`}>
                        (p={feature.ks_pvalue.toExponential(2)})
                      </span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between p-2 rounded bg-muted/20">
                    <span className="text-muted-foreground">Mean Shift</span>
                    <span className="font-mono text-foreground font-medium text-right">
                      {feature.mean_shift > 0 ? "+" : ""}{feature.mean_shift.toFixed(3)} <br/>
                      <span className={`text-xs ${Math.abs(feature.mean_shift_sigma) > 0.5 ? "text-danger" : "text-muted-foreground"}`}>
                        ({feature.mean_shift_sigma > 0 ? "+" : ""}{feature.mean_shift_sigma.toFixed(3)}σ)
                      </span>
                    </span>
                  </div>

                  <div className="flex justify-between p-2 rounded bg-muted/20">
                    <span className="text-muted-foreground">Variance Ratio</span>
                    <span className="font-mono text-foreground font-medium text-right">
                      {feature.variance_ratio.toFixed(4)} <br/>
                      <span className="text-xs text-muted-foreground">(curr² / ref²)</span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between p-2 rounded bg-muted/20">
                    <span className="text-muted-foreground">Mean (Ref vs Cur)</span>
                    <span className="font-mono text-foreground font-medium">
                      {feature.ref_mean.toFixed(2)} → {feature.cur_mean.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distribution Shift</h4>
                <div className="h-48 border border-border/50 rounded-xl bg-background/50 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`colorRef_${feature.param}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id={`colorCur_${feature.param}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="bin" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => v.toFixed(1)} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => `${v}%`} />
                      <Tooltip 
                        contentStyle={tooltipStyle} 
                        formatter={(val: number) => [`${val.toFixed(1)}%`, undefined]}
                        labelFormatter={(lbl) => `${feature.param} ≈ ${lbl}`}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="Reference" stroke="#0EA5E9" strokeWidth={2} fillOpacity={1} fill={`url(#colorRef_${feature.param})`} />
                      <Area type="monotone" dataKey="Current" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill={`url(#colorCur_${feature.param})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground/80 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#0EA5E9]" /> Reference (Training Split)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Current (New Data Split)
                  </div>
                </div>
              </div>
              
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DataDrift() {
  const [data, setData]       = useState<DriftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = (force = false) => {
    setLoading(true);
    setError(null);
    fetch(`${BASE_URL}/drift-data${force ? "?force=1" : ""}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Data Drift Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data ? (
              <>
                Monitoring exactly what the model was trained on: <span className="font-semibold text-foreground">Training ({data.reference_size}) vs Test ({data.current_size}) splits</span>
              </>
            ) : "Testing real distributions…"}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/60 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Recompute Drift
        </button>
      </div>

      {loading && (
        <div className="glass-card p-16 flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-medium">Computing Distribution Shifts…</p>
          <p className="text-xs text-center max-w-sm">
            Applying Kolmogorov-Smirnov test and calculating Population Stability Index (PSI) to detect statistical drift on real data.
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="glass-card p-6 border-danger/30 border text-sm text-danger flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          
          {/* Main Status & Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Health Overview */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 lg:col-span-1 md:flex flex-col justify-center">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Overall Status</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-display font-bold text-foreground">{data.stable_count}</span>
                    <span className="text-muted-foreground pb-1">/ {data.features.length}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">Features are Stable</p>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-border/50">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-danger">
                      <AlertTriangle className="h-4 w-4" /> Critical Drift
                    </span>
                    <span className="font-mono font-bold text-foreground">{data.drifted_count}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-moderate">
                      <Activity className="h-4 w-4" /> Warning
                    </span>
                    <span className="font-mono font-bold text-foreground">{data.warning_count}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Explanation & Info */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card lg:col-span-3">
              <div className="p-6 border-b border-border/50 flex gap-4">
                <div className={`p-3 rounded-full h-fit flex-shrink-0 ${
                  data.drifted_count > 0 ? "bg-danger/10 text-danger" : 
                  data.warning_count > 0 ? "bg-moderate/10 text-moderate" : "bg-safe/10 text-safe"
                }`}>
                  {data.drifted_count > 0 ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-1">Executive Summary</h3>
                  <p className="text-foreground/80 leading-relaxed text-sm">{data.summary}</p>
                </div>
              </div>
              
              <div className="p-6 bg-muted/10">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <BarChartHorizontal className="h-4 w-4" /> How to read this
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-foreground">Population Stability Index (PSI):</span><br />
                    <span className="text-muted-foreground">Standard metric for distribution shift. &lt;0.1 is stable, 0.1–0.2 is minor shift, &gt;0.2 is significant shift.</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Kolmogorov-Smirnov (KS-Test):</span><br />
                    <span className="text-muted-foreground">Non-parametric test comparing cumulative distributions. p &lt; {data.ks_alpha} indicates a statistically significant difference.</span>
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Mean Shift (σ):</span><br />
                    <span className="text-muted-foreground">The absolute difference in means normalized by the standard deviation of the training set.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Features List */}
          <div>
            <div className="flex items-center gap-2 mb-4 mt-6">
              <h2 className="font-display font-bold text-lg text-foreground">Feature Drift Analysis</h2>
              <span className="px-2 py-0.5 rounded border border-border bg-muted/40 text-xs text-muted-foreground font-mono">
                Sorted by highest PSI
              </span>
            </div>
            
            <div className="space-y-4">
              {data.features.map((feature, i) => (
                <FeatureDriftCard key={feature.param} feature={feature} />
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
