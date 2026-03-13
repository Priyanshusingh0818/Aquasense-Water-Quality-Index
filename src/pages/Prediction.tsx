import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Thermometer, Zap, Beaker, Activity, Waves } from "lucide-react";

interface Parameter {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  icon: typeof Droplets;
  defaultValue: number;
}

const parameters: Parameter[] = [
  { id: "ph", label: "pH Level", min: 0, max: 14, step: 0.1, unit: "", icon: Beaker, defaultValue: 7.0 },
  { id: "Hardness", label: "Hardness", min: 0, max: 400, step: 1, unit: "mg/L", icon: Activity, defaultValue: 200 },
  { id: "Solids", label: "Solids", min: 0, max: 60000, step: 100, unit: "mg/L", icon: Droplets, defaultValue: 18000 },
  { id: "Chloramines", label: "Chloramines", min: 0, max: 15, step: 0.1, unit: "mg/L", icon: Beaker, defaultValue: 7.0 },
  { id: "Sulfate", label: "Sulfate", min: 0, max: 500, step: 1, unit: "mg/L", icon: Zap, defaultValue: 350 },
  { id: "Conductivity", label: "Conductivity", min: 0, max: 800, step: 1, unit: "µS/cm", icon: Zap, defaultValue: 450 },
  { id: "Organic_carbon", label: "Organic Carbon", min: 0, max: 30, step: 0.1, unit: "mg/L", icon: Activity, defaultValue: 10 },
  { id: "Trihalomethanes", label: "Trihalomethanes", min: 0, max: 120, step: 1, unit: "µg/L", icon: Thermometer, defaultValue: 80 },
  { id: "Turbidity", label: "Turbidity", min: 0, max: 10, step: 0.1, unit: "NTU", icon: Waves, defaultValue: 4.0 },
];

const getStatus = (prediction: string) => {
  if (prediction === "Safe") return { label: "Safe", color: "text-safe", bg: "bg-safe/10", border: "border-safe/30" };
  return { label: "Unsafe", color: "text-danger", bg: "bg-danger/10", border: "border-danger/30" };
};

const Prediction = () => {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(parameters.map((p) => [p.id, p.defaultValue]))
  );
  const [result, setResult] = useState<{ prediction: string; confidence: number; ai_explanation: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch prediction");
      }
      
      setResult({
        prediction: data.prediction,
        confidence: data.confidence,
        ai_explanation: data.ai_explanation
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const status = result ? getStatus(result.prediction) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Water Quality Prediction</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter water parameters to predict quality index</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-6">Input Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {parameters.map((param) => (
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
                  onChange={(e) => setValues({ ...values, [param.id]: parseFloat(e.target.value) })}
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
            {loading ? "Predicting..." : "Predict Water Quality"}
          </button>
          
          {error && (
            <div className="mt-4 p-4 text-sm text-danger bg-danger/10 rounded-xl border border-danger/30">
              {error}
            </div>
          )}
        </div>

        {/* Result */}
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
                <div className={`glass-card p-6 ${status.border} border-2`}>
                  <h3 className="font-display font-semibold text-foreground mb-6 text-center">Prediction Result</h3>
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center ${status.bg} border-4 ${status.border}`}>
                      <span className={`text-3xl font-display font-bold ${status.color}`}>
                        {result.prediction}
                      </span>
                    </div>
                    <div className="w-full space-y-3 mt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-semibold text-foreground">{(result.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.confidence * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full rounded-full eco-gradient"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {result.ai_explanation && (
                  <div className="glass-card p-6 border-primary/20 border-2">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-primary font-bold">AI Expert Analysis</span>
                    </div>
                    <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {result.ai_explanation}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                className="glass-card p-6 flex flex-col items-center justify-center min-h-[300px] text-center"
              >
                <Droplets className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-sm">
                  Adjust parameters and click predict to see water quality results
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Prediction;
