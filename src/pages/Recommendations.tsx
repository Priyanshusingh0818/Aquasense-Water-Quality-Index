import { motion } from "framer-motion";
import { Beaker, Droplets, Zap, Activity, Thermometer, ShieldCheck } from "lucide-react";

// WHO Guidelines / Treatment Rules derived from the recommender engine
const GUIDELINES = [
  {
    parameter: "pH",
    icon: <Beaker className="h-5 w-5" />,
    safeRange: "6.5 – 8.5",
    issues: [
      {
        condition: "pH < 6.5 (Acidic)",
        severity: "critical",
        action: "Add lime (calcium hydroxide) or soda ash (sodium carbonate) to raise pH. Install a calcite neutralizing filter or a chemical dosing system for sustained correction."
      },
      {
        condition: "pH > 8.5 (Alkaline)",
        severity: "warning",
        action: "Inject CO₂ or dilute food-grade muriatic acid (hydrochloric acid) to lower pH. Consider a carbon dioxide injection system for large-scale treatment."
      }
    ]
  },
  {
    parameter: "Turbidity",
    icon: <Droplets className="h-5 w-5" />,
    safeRange: "< 4 NTU",
    issues: [
      {
        condition: "Turbidity > 10.0 NTU",
        severity: "critical",
        action: "Apply coagulation and flocculation treatment (e.g., alum or ferric chloride), followed by sedimentation and multi-layer filtration (sand + activated carbon). Retest before any use."
      },
      {
        condition: "4.0 < Turbidity ≤ 10.0 NTU",
        severity: "warning",
        action: "Install a sediment pre-filter (5–10 µm) followed by a sand or multimedia filter. Regular backwashing required. UV disinfection is recommended as a secondary step."
      }
    ]
  },
  {
    parameter: "Chloramines",
    icon: <Beaker className="h-5 w-5" />,
    safeRange: "< 4 mg/L",
    issues: [
      {
        condition: "Chloramines > 4.0 mg/L",
        severity: "warning",
        action: "Install a granular activated carbon (GAC) or catalytic carbon filter — these are specifically effective against chloramines unlike standard carbon blocks. Replace filter media every 6–12 months."
      }
    ]
  },
  {
    parameter: "Sulfate",
    icon: <Zap className="h-5 w-5" />,
    safeRange: "< 250 mg/L",
    issues: [
      {
        condition: "Sulfate > 250.0 mg/L",
        severity: "warning",
        action: "Use a reverse osmosis (RO) system or ion exchange (anion resin) to reduce sulfate. Nanofiltration membranes are also effective. Blending with a low-sulfate source is an alternative."
      }
    ]
  },
  {
    parameter: "Total Dissolved Solids (TDS)",
    icon: <Droplets className="h-5 w-5" />,
    safeRange: "< 500 mg/L",
    issues: [
      {
        condition: "TDS > 1000 mg/L",
        severity: "critical",
        action: "Deploy a reverse osmosis (RO) or electrodialysis system. For industrial sources, zero-liquid-discharge (ZLD) treatment may be required. Identify and eliminate the contamination source."
      },
      {
        condition: "500 < TDS ≤ 1000 mg/L",
        severity: "warning",
        action: "Install a reverse osmosis (RO) filter or a distillation unit. A high-quality nanofiltration membrane can also reduce dissolved solids effectively."
      }
    ]
  },
  {
    parameter: "Organic Carbon (TOC)",
    icon: <Activity className="h-5 w-5" />,
    safeRange: "< 10 mg/L",
    issues: [
      {
        condition: "TOC > 10.0 mg/L",
        severity: "warning",
        action: "Apply activated carbon adsorption (GAC beds) to remove organic compounds. High TOC can react with disinfectants to form harmful by-products — pair with advanced oxidation (ozone or UV/H₂O₂) for thorough removal."
      }
    ]
  },
  {
    parameter: "Trihalomethanes (THMs)",
    icon: <Thermometer className="h-5 w-5" />,
    safeRange: "< 80 µg/L",
    issues: [
      {
        condition: "THMs > 80.0 µg/L",
        severity: "critical",
        action: "Install a granular activated carbon (GAC) filter — the most effective method for THM removal. Reduce source chlorine dose if THMs are disinfection by-products. Aeration (packed tower or spray aeration) can also strip volatile THMs."
      }
    ]
  },
  {
    parameter: "Hardness",
    icon: <Activity className="h-5 w-5" />,
    safeRange: "< 300 mg/L",
    issues: [
      {
        condition: "Hardness > 300 mg/L",
        severity: "info",
        action: "Install a cation exchange water softener (sodium or potassium cycle) to replace calcium and magnesium ions. Alternatively, use a lime softening process for municipal-scale treatment."
      }
    ]
  },
  {
    parameter: "Conductivity",
    icon: <Zap className="h-5 w-5" />,
    safeRange: "< 400 µS/cm",
    issues: [
      {
        condition: "Conductivity > 400 µS/cm",
        severity: "info",
        action: "High conductivity indicates elevated dissolved ions. Investigate potential industrial or agricultural runoff. Apply RO or electrodialysis reversal (EDR) to reduce ionic load."
      }
    ]
  }
];

export default function Recommendations() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Treatment Recommendations Reference</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standard operating procedures and WHO guidelines for resolving water quality parameter violations.
          </p>
        </div>
        <div className="bg-safe/10 text-safe px-3 py-1.5 rounded-lg flex items-center gap-2 border border-safe/20 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4" />
          WHO Compliant
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GUIDELINES.map((item, idx) => (
          <motion.div
            key={item.parameter}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass-card flex flex-col overflow-hidden"
          >
            <div className="p-5 border-b border-border/50 bg-muted/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  {item.icon}
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground">{item.parameter}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Safe Range</p>
                <p className="font-mono text-sm font-medium text-foreground">{item.safeRange}</p>
              </div>
            </div>

            <div className="p-5 space-y-4 flex-1">
              {item.issues.map((issue, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      issue.severity === "critical" ? "bg-danger/10 text-danger border border-danger/20" :
                      issue.severity === "warning" ? "bg-moderate/10 text-moderate border border-moderate/20" :
                      "bg-primary/10 text-primary border border-primary/20"
                    }`}>
                      {issue.severity}
                    </span>
                    <span className="font-mono text-sm font-medium text-foreground">{issue.condition}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-1 border-l-2 border-border/40">
                    {issue.action}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
