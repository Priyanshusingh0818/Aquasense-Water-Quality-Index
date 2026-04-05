import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets, Thermometer, Zap, Beaker, Activity, Waves,
  ShieldCheck, ShieldX, AlertTriangle, Info, Wrench,
  GitCompare, BookmarkPlus, RotateCcw, Loader2, CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Recommendation {
  parameter: string;
  severity: "critical" | "warning" | "info";
  issue: string;
  value: number;
  unit: string;
  threshold: string;
  action: string;
}

interface PredResult {
  prediction: string;
  confidence: number;
  recommendations: Recommendation[];
  riskScore: number; // derived on frontend
}

interface Scenario {
  label: string;
  values: Record<string, number>;
  result: PredResult;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.DEV ? "http://localhost:5000" : "/api";
const DEBOUNCE_MS = 420; // ms to wait after last slider change before calling API

const PARAMS = [
  { id: "ph",              label: "pH Level",       min: 0,  max: 14,    step: 0.1, unit: "",      icon: Beaker,      default: 7.0   },
  { id: "Hardness",        label: "Hardness",        min: 0,  max: 400,   step: 1,   unit: "mg/L",  icon: Activity,    default: 200   },
  { id: "Solids",          label: "Solids (TDS)",    min: 0,  max: 60000, step: 100, unit: "mg/L",  icon: Droplets,    default: 18000 },
  { id: "Chloramines",     label: "Chloramines",     min: 0,  max: 15,    step: 0.1, unit: "mg/L",  icon: Beaker,      default: 7.0   },
  { id: "Sulfate",         label: "Sulfate",          min: 0,  max: 500,   step: 1,   unit: "mg/L",  icon: Zap,         default: 350   },
  { id: "Conductivity",    label: "Conductivity",    min: 0,  max: 800,   step: 1,   unit: "µS/cm", icon: Zap,         default: 450   },
  { id: "Organic_carbon",  label: "Organic Carbon",  min: 0,  max: 30,    step: 0.1, unit: "mg/L",  icon: Activity,    default: 10    },
  { id: "Trihalomethanes", label: "Trihalomethanes", min: 0,  max: 120,   step: 1,   unit: "µg/L",  icon: Thermometer, default: 80    },
  { id: "Turbidity",       label: "Turbidity",       min: 0,  max: 10,    step: 0.1, unit: "NTU",   icon: Waves,       default: 4.0   },
];

const DEFAULT_VALUES = Object.fromEntries(PARAMS.map(p => [p.id, p.default]));

// ─── Risk score: derived from model output + recommendations ─────────────────
const computeRiskScore = (prediction: string, confidence: number, recs: Recommendation[]): number => {
  let score = prediction === "Unsafe" ? 55 : 15;
  score += recs.filter(r => r.severity === "critical").length * 12;
  score += recs.filter(r => r.severity === "warning").length * 6;
  if (prediction === "Unsafe") score += (confidence * 20);
  if (prediction === "Safe")   score -= (confidence * 10);
  return Math.min(100, Math.max(0, Math.round(score)));
};

// ─── Risk meter arc SVG ───────────────────────────────────────────────────────
const RiskGauge = ({ score }: { score: number }) => {
  const r = 54, cx = 70, cy = 70;
  const circumference = Math.PI * r; // half-circle arc length
  const dashOffset = circumference * (1 - score / 100);
  const color = score >= 70 ? "#EF4444" : score >= 40 ? "#F59E0B" : "#22C55E";
  const label = score >= 70 ? "High Risk" : score >= 40 ? "Medium Risk" : "Low Risk";

  // Needle angle: -180deg = 0 risk, 0deg = 100 risk
  const needleAngle = -180 + (score / 100) * 180;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 140 80" className="w-44 h-24 overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="hsl(var(--muted))" strokeWidth="10" strokeLinecap="round"
        />
        {/* Animated coloured arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
        />
        {/* Needle */}
        <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`} style={{ transition: "transform 0.6s ease" }}>
          <line x1={cx} y1={cy} x2={cx - r + 8} y2={cy} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="4" fill={color} />
        </g>
        {/* Score text */}
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>{score}</text>
        <text x={cx} y={cy + 26} textAnchor="middle" fontSize="7.5" fill="hsl(var(--muted-foreground))">/100 Risk Score</text>
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
};

// ─── Severity config ──────────────────────────────────────────────────────────
const SEV = {
  critical: { border: "border-danger/40", bg: "bg-danger/5",       badge: "bg-danger/10 text-danger",       Icon: ShieldX     },
  warning:  { border: "border-moderate/40", bg: "bg-moderate/5",   badge: "bg-moderate/10 text-moderate",   Icon: AlertTriangle },
  info:     { border: "border-primary/30", bg: "bg-primary/5",     badge: "bg-primary/10 text-primary",     Icon: Info        },
};

// ─── Mini recommendation chip ─────────────────────────────────────────────────
const RecChip = ({ rec, i }: { rec: Recommendation; i: number }) => {
  const cfg = SEV[rec.severity] ?? SEV.info;
  const { Icon } = cfg;
  return (
    <motion.div
      key={rec.parameter + i}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className={`rounded-xl p-3 border-l-4 text-sm ${cfg.border} ${cfg.bg} border border-l-4`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${rec.severity === "critical" ? "text-danger" : rec.severity === "warning" ? "text-moderate" : "text-primary"}`} />
        <div className="space-y-1 min-w-0">
          <p className="font-semibold text-foreground text-xs leading-tight">{rec.issue}</p>
          <p className="text-xs text-muted-foreground">
            Measured: <strong className="text-foreground">{rec.value} {rec.unit}</strong> · Limit: <strong className="text-foreground">{rec.threshold}</strong>
          </p>
          <div className="flex gap-1 items-start pt-1 border-t border-border/40">
            <Wrench className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/75 leading-relaxed">{rec.action}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Scenario comparison card ─────────────────────────────────────────────────
const ScenarioCard = ({ s, onRemove }: { s: Scenario; onRemove: () => void }) => {
  const color = s.result.prediction === "Safe" ? "text-safe border-safe/30" : "text-danger border-danger/30";
  const riskColor = s.result.riskScore >= 70 ? "text-danger" : s.result.riskScore >= 40 ? "text-moderate" : "text-safe";
  return (
    <div className={`glass-card p-4 border-2 ${color.split(" ")[1]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-display font-bold text-sm text-foreground">{s.label}</span>
        <button onClick={onRemove} className="text-xs text-muted-foreground hover:text-danger transition-colors">✕ Remove</button>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div className={`text-2xl font-display font-bold ${color.split(" ")[0]}`}>{s.result.prediction}</div>
        <div>
          <p className="text-xs text-muted-foreground">Confidence</p>
          <p className="text-sm font-semibold text-foreground">{(s.result.confidence * 100).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Risk Score</p>
          <p className={`text-sm font-semibold ${riskColor}`}>{s.result.riskScore}/100</p>
        </div>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        {PARAMS.slice(0, 5).map(p => (
          <div key={p.id} className="flex justify-between">
            <span>{p.label}</span>
            <span className="font-mono font-semibold text-foreground">{s.values[p.id]} {p.unit}</span>
          </div>
        ))}
        <p className="text-muted-foreground/60 pt-1">+ {PARAMS.length - 5} more parameters</p>
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-1">
        {s.result.recommendations.filter(r => r.severity === "critical").map(r => (
          <span key={r.parameter} className="text-xs px-2 py-0.5 rounded-full bg-danger/10 text-danger">{r.parameter}</span>
        ))}
        {s.result.recommendations.filter(r => r.severity === "warning").map(r => (
          <span key={r.parameter} className="text-xs px-2 py-0.5 rounded-full bg-moderate/10 text-moderate">{r.parameter}</span>
        ))}
        {s.result.recommendations.length === 0 && (
          <span className="text-xs text-safe">✓ No threshold violations</span>
        )}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function Simulation() {
  const [values, setValues]         = useState<Record<string, number>>(DEFAULT_VALUES);
  const [result, setResult]         = useState<PredResult | null>(null);
  const [isLoading, setIsLoading]   = useState(false);
  const [scenarios, setScenarios]   = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [changedParam, setChangedParam] = useState<string | null>(null);

  // ── Core: call /predict with current values ──────────────────────────────
  const runPrediction = useCallback(async (currentValues: Record<string, number>) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsLoading(true);
    try {
      const resp = await fetch(`${BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentValues),
        signal: ctrl.signal,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const recs: Recommendation[] = data.recommendations ?? [];
      setResult({
        prediction:   data.prediction,
        confidence:   data.confidence,
        recommendations: recs,
        riskScore:    computeRiskScore(data.prediction, data.confidence, recs),
      });
    } catch (e: any) {
      if (e.name !== "AbortError") console.error("Prediction error:", e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Debounced auto-predict on any slider change ──────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runPrediction(values), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [values, runPrediction]);

  // ── Run prediction on mount with defaults ────────────────────────────────
  // (the above effect fires on mount automatically)

  const handleSliderChange = (id: string, val: number) => {
    setChangedParam(id);
    setValues(prev => ({ ...prev, [id]: val }));
    setTimeout(() => setChangedParam(null), 600);
  };

  const handleReset = () => setValues(DEFAULT_VALUES);

  const handleSaveScenario = () => {
    if (!result || scenarios.length >= 3) return;
    const label = scenarioName.trim() || `Scenario ${scenarios.length + 1}`;
    setScenarios(prev => [...prev, { label, values: { ...values }, result: { ...result } }]);
    setScenarioName("");
    setShowSaveInput(false);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const criticalCount = result?.recommendations.filter(r => r.severity === "critical").length ?? 0;
  const warningCount  = result?.recommendations.filter(r => r.severity === "warning").length ?? 0;
  const isSafe        = result?.prediction === "Safe";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Scenario Simulation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust parameters — prediction updates live via the real ML model ({DEBOUNCE_MS}ms debounce)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          {scenarios.length < 3 && result && (
            showSaveInput ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={scenarioName}
                  onChange={e => setScenarioName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveScenario()}
                  placeholder="Scenario name…"
                  className="px-3 py-2 rounded-xl bg-muted text-sm text-foreground outline-none border border-border focus:border-primary w-36"
                />
                <button onClick={handleSaveScenario} className="px-3 py-2 rounded-xl eco-gradient text-primary-foreground text-sm font-semibold">Save</button>
                <button onClick={() => setShowSaveInput(false)} className="px-3 py-2 rounded-xl bg-muted text-sm text-muted-foreground">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setShowSaveInput(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl eco-gradient text-primary-foreground text-sm font-semibold"
              >
                <BookmarkPlus className="h-4 w-4" /> Save Scenario
              </button>
            )
          )}
        </div>
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* ── Column 1: Parameter Sliders ───────────────────────────────── */}
        <div className="xl:col-span-4 glass-card p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-foreground">Parameters</h3>
            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…
              </div>
            )}
          </div>

          {PARAMS.map(param => {
            const isChanged = changedParam === param.id;
            return (
              <div key={param.id} className={`space-y-1.5 rounded-xl p-2.5 transition-colors duration-300 ${isChanged ? "bg-primary/5" : ""}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <param.icon className={`h-3.5 w-3.5 transition-colors ${isChanged ? "text-primary" : "text-muted-foreground"}`} />
                    {param.label}
                  </label>
                  <motion.span
                    key={values[param.id]}
                    initial={{ scale: 1.15, color: "#22C55E" }}
                    animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                    className="text-xs font-mono font-bold"
                  >
                    {values[param.id]} <span className="text-muted-foreground font-normal">{param.unit}</span>
                  </motion.span>
                </div>
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={values[param.id]}
                  onChange={e => handleSliderChange(param.id, parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground/60">
                  <span>{param.min}</span>
                  <span>{param.max}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Column 2: Live Result + Risk Gauge ───────────────────────── */}
        <div className="xl:col-span-4 space-y-4">

          {/* Prediction result */}
          <AnimatePresence mode="wait">
            <motion.div
              key={result?.prediction ?? "loading"}
              initial={{ opacity: 0.7, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`glass-card p-6 border-2 transition-colors ${
                !result ? "border-border" :
                isSafe ? "border-safe/40" : "border-danger/40"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-foreground">Live Prediction</h3>
                <div className={`h-2 w-2 rounded-full ${isLoading ? "bg-primary animate-pulse" : isSafe ? "bg-safe" : "bg-danger"}`} />
              </div>

              {!result ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  Running initial prediction…
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Verdict */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isSafe
                        ? <ShieldCheck className="h-10 w-10 text-safe" />
                        : <ShieldX className="h-10 w-10 text-danger" />
                      }
                      <div>
                        <p className={`text-3xl font-display font-bold ${isSafe ? "text-safe" : "text-danger"}`}>
                          {result.prediction}
                        </p>
                        <p className="text-xs text-muted-foreground">Water quality verdict</p>
                      </div>
                    </div>
                    <RiskGauge score={result.riskScore} />
                  </div>

                  {/* Confidence bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Model Confidence</span>
                      <span className="font-semibold text-foreground">{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${result.confidence * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={`h-full rounded-full ${isSafe ? "bg-safe" : "bg-danger"}`}
                      />
                    </div>
                  </div>

                  {/* Issue summary */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="text-center p-2 rounded-xl bg-danger/8 border border-danger/20">
                      <p className="text-xl font-bold text-danger">{criticalCount}</p>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-moderate/8 border border-moderate/20">
                      <p className="text-xl font-bold text-moderate">{warningCount}</p>
                      <p className="text-xs text-muted-foreground">Warning</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-safe/8 border border-safe/20">
                      <p className="text-xl font-bold text-safe">
                        {result.recommendations.filter(r => r.severity === "info").length}
                      </p>
                      <p className="text-xs text-muted-foreground">Info</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Parameter quick-status table */}
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-4"
            >
              <h4 className="font-display font-semibold text-foreground text-sm mb-3">Parameter Status</h4>
              <div className="space-y-1.5">
                {PARAMS.map(p => {
                  const rec = result.recommendations.find(r => r.parameter === p.id);
                  const dot = rec
                    ? rec.severity === "critical" ? "bg-danger" : "bg-moderate"
                    : "bg-safe";
                  return (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${dot}`} />
                        <span className="text-muted-foreground">{p.label}</span>
                      </div>
                      <span className="font-mono font-semibold text-foreground">
                        {values[p.id]} {p.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Column 3: Live Recommendations ───────────────────────────── */}
        <div className="xl:col-span-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Live Recommendations</h3>
          </div>

          <AnimatePresence mode="wait">
            {!result ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="glass-card h-20 animate-pulse bg-muted/30 rounded-xl" />)}
              </div>
            ) : result.recommendations.length === 0 ? (
              <motion.div
                key="all-clear"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 flex flex-col items-center text-center gap-3"
              >
                <CheckCircle2 className="h-10 w-10 text-safe" />
                <p className="font-semibold text-safe">All parameters within WHO limits</p>
                <p className="text-xs text-muted-foreground">No treatment action required. Continue regular monitoring.</p>
              </motion.div>
            ) : (
              <motion.div
                key={result.recommendations.map(r => r.parameter).join("-")}
                className="space-y-3 max-h-[600px] overflow-y-auto pr-0.5"
              >
                {result.recommendations.map((rec, i) => (
                  <RecChip key={`${rec.parameter}-${i}`} rec={rec} i={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Scenario Comparison Panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {scenarios.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl eco-gradient">
                <GitCompare className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Saved Scenarios</h3>
                <p className="text-xs text-muted-foreground">Compare saved what-if scenarios side by side</p>
              </div>
            </div>
            <div className={`grid gap-4 ${scenarios.length === 1 ? "grid-cols-1 max-w-sm" : scenarios.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
              {scenarios.map((s, i) => (
                <ScenarioCard
                  key={i}
                  s={s}
                  onRemove={() => setScenarios(prev => prev.filter((_, idx) => idx !== i))}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
