import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets, Thermometer, Zap, Beaker, Activity, Waves,
  ShieldCheck, ShieldX, AlertTriangle, Info, CheckCircle2, Wrench,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Parameter {
  id: string; label: string; min: number; max: number;
  step: number; unit: string; icon: typeof Droplets; defaultValue: number;
}

interface Recommendation {
  parameter: string; severity: "critical" | "warning" | "info";
  issue: string; value: number; unit: string;
  threshold: string; action: string; icon: string;
}

interface PredictionResult {
  prediction: string;
  confidence: number;
  ai_explanation: string;
  recommendations: Recommendation[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.DEV ? "http://localhost:5000" : "/api";

const parameters: Parameter[] = [
  { id: "ph",              label: "pH Level",        min: 0,  max: 14,    step: 0.1, unit: "",      icon: Beaker,      defaultValue: 7.0   },
  { id: "Hardness",        label: "Hardness",         min: 0,  max: 400,   step: 1,   unit: "mg/L",  icon: Activity,    defaultValue: 200   },
  { id: "Solids",          label: "Solids (TDS)",     min: 0,  max: 60000, step: 100, unit: "mg/L",  icon: Droplets,    defaultValue: 18000 },
  { id: "Chloramines",     label: "Chloramines",      min: 0,  max: 15,    step: 0.1, unit: "mg/L",  icon: Beaker,      defaultValue: 7.0   },
  { id: "Sulfate",         label: "Sulfate",           min: 0,  max: 500,   step: 1,   unit: "mg/L",  icon: Zap,         defaultValue: 350   },
  { id: "Conductivity",    label: "Conductivity",     min: 0,  max: 800,   step: 1,   unit: "µS/cm", icon: Zap,         defaultValue: 450   },
  { id: "Organic_carbon",  label: "Organic Carbon",   min: 0,  max: 30,    step: 0.1, unit: "mg/L",  icon: Activity,    defaultValue: 10    },
  { id: "Trihalomethanes", label: "Trihalomethanes",  min: 0,  max: 120,   step: 1,   unit: "µg/L",  icon: Thermometer, defaultValue: 80    },
  { id: "Turbidity",       label: "Turbidity",        min: 0,  max: 10,    step: 0.1, unit: "NTU",   icon: Waves,       defaultValue: 4.0   },
];

// ─── Severity configuration ───────────────────────────────────────────────────
const severityConfig = {
  critical: {
    border: "border-danger/40",   bg: "bg-danger/5",
    iconBg: "bg-danger/10",       iconColor: "text-danger",
    badge:  "bg-danger/10 text-danger",
    Icon: ShieldX,
  },
  warning: {
    border: "border-moderate/40", bg: "bg-moderate/5",
    iconBg: "bg-moderate/10",     iconColor: "text-moderate",
    badge:  "bg-moderate/10 text-moderate",
    Icon: AlertTriangle,
  },
  info: {
    border: "border-water-blue/40", bg: "bg-water-blue/5",
    iconBg: "bg-water-blue/10",     iconColor: "text-water-blue",
    badge:  "bg-water-blue/10 text-water-blue",
    Icon: Info,
  },
};

const getStatus = (prediction: string) =>
  prediction === "Safe"
    ? { label: "Safe",   color: "text-safe",   bg: "bg-safe/10",   border: "border-safe/40" }
    : { label: "Unsafe", color: "text-danger",  bg: "bg-danger/10", border: "border-danger/40" };

// ─── Recommendation card ──────────────────────────────────────────────────────
const RecommendationCard = ({ rec, index }: { rec: Recommendation; index: number }) => {
  const cfg = severityConfig[rec.severity] ?? severityConfig.info;
  const { Icon } = cfg;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className={`rounded-xl border-l-4 p-4 ${cfg.border} ${cfg.bg} border border-l-4`}
    >
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <div className={`p-2 rounded-lg flex-shrink-0 ${cfg.iconBg}`}>
          <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{rec.issue}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase ${cfg.badge}`}>
              {rec.severity}
            </span>
          </div>

          {/* Value vs threshold */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              Measured: <strong className="text-foreground">{rec.value} {rec.unit}</strong>
            </span>
            <span>
              WHO limit: <strong className="text-foreground">{rec.threshold}</strong>
            </span>
          </div>

          {/* Actionable recommendation */}
          <div className="flex items-start gap-2 mt-1 pt-2 border-t border-border/50">
            <Wrench className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80 leading-relaxed">{rec.action}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const Prediction = () => {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(parameters.map(p => [p.id, p.defaultValue]))
  );
  const [result, setResult]   = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const predict = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Prediction failed");
      setResult({
        prediction:      data.prediction,
        confidence:      data.confidence,
        ai_explanation:  data.ai_explanation,
        recommendations: data.recommendations ?? [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const status = result ? getStatus(result.prediction) : null;
  const criticalRecs = result?.recommendations.filter(r => r.severity === "critical") ?? [];
  const warningRecs  = result?.recommendations.filter(r => r.severity === "warning")  ?? [];
  const infoRecs     = result?.recommendations.filter(r => r.severity === "info")     ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Water Quality Prediction</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Adjust parameters, predict safety, and get actionable treatment recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Parameter Input Form ─────────────────────────────────────────── */}
        <div className="xl:col-span-2 glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-6">Input Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {parameters.map(param => (
              <div key={param.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <param.icon className="h-4 w-4 text-primary" />
                    {param.label}
                  </label>
                  <span className="text-sm font-mono font-semibold text-primary">
                    {values[param.id]} {param.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={values[param.id]}
                  onChange={e => setValues({ ...values, [param.id]: parseFloat(e.target.value) })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{param.min}</span>
                  <span>{param.max} {param.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={predict}
            disabled={loading}
            className="mt-8 eco-gradient text-primary-foreground px-8 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 w-full justify-center disabled:opacity-50"
          >
            <Droplets className="h-4 w-4" />
            {loading ? "Analyzing…" : "Predict Water Quality"}
          </button>

          {error && (
            <div className="mt-4 p-4 text-sm text-danger bg-danger/10 rounded-xl border border-danger/30">
              {error}
            </div>
          )}
        </div>

        {/* ── Results Panel ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {result && status ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Prediction badge */}
                <div className={`glass-card p-6 ${status.border} border-2`}>
                  <h3 className="font-display font-semibold text-foreground mb-4 text-center">Prediction Result</h3>
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center ${status.bg} border-4 ${status.border}`}>
                      <span className={`text-2xl font-display font-bold ${status.color}`}>
                        {result.prediction}
                      </span>
                    </div>
                    <div className="w-full space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-semibold text-foreground">{(result.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.confidence * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full rounded-full eco-gradient"
                        />
                      </div>
                    </div>

                    {/* Issue summary badges */}
                    {result.recommendations.length > 0 && (
                      <div className="flex flex-wrap gap-2 w-full justify-center mt-1">
                        {criticalRecs.length > 0 && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-danger/10 text-danger">
                            {criticalRecs.length} Critical
                          </span>
                        )}
                        {warningRecs.length > 0 && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-moderate/10 text-moderate">
                            {warningRecs.length} Warning
                          </span>
                        )}
                        {infoRecs.length > 0 && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-water-blue/10 text-water-blue">
                            {infoRecs.length} Info
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Expert Analysis */}
                {result.ai_explanation && (
                  <div className="glass-card p-5 border-primary/20 border">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">AI Expert Analysis</p>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {result.ai_explanation}
                    </p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                className="glass-card p-6 flex flex-col items-center justify-center min-h-[260px] text-center"
              >
                <Droplets className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-sm">
                  Adjust parameters and click Predict to see water quality results and treatment recommendations
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Recommendations Panel (full width, below) ────────────────────────── */}
      <AnimatePresence>
        {result && result.recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl eco-gradient">
                <Wrench className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">
                  Treatment Recommendations
                </h3>
                <p className="text-xs text-muted-foreground">
                  Based on your exact input values — {result.recommendations.length} recommendation
                  {result.recommendations.length !== 1 ? "s" : ""} generated
                </p>
              </div>
              {result.prediction === "Safe" && criticalRecs.length === 0 && (
                <div className="ml-auto flex items-center gap-2 text-safe text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4" /> All limits met
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.recommendations.map((rec, i) => (
                <RecommendationCard key={`${rec.parameter}-${i}`} rec={rec} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Prediction;
