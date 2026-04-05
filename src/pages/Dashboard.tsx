import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import MetricCard from "@/components/MetricCard";
import { Droplets, ShieldCheck, ShieldX, Percent } from "lucide-react";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const BASE_URL = import.meta.env.DEV ? "http://localhost:5000" : "/api";
const C = { safe: "#2ECC71", unsafe: "#EF4444", blue: "#0EA5E9", amber: "#F59E0B" };

type ParamStat = { mean: number; std: number; min: number; max: number; safe_mean: number; unsafe_mean: number };
interface DashData {
  summary: { total: number; safe: number; unsafe: number; safe_percent: number; unsafe_percent: number; parameter_stats: Record<string, ParamStat> };
  featureImportances: { param: string; importance: number }[];
  radarData: { param: string; safe: number; unsafe: number; fullMark: number }[];
  phDistribution: { labels: number[]; safe: number[]; unsafe: number[] };
  turbidityDistribution: { labels: number[]; safe: number[]; unsafe: number[] };
}

const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 12 };

const Skeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[1, 2, 3, 4].map(i => <div key={i} className="glass-card p-6 h-36 animate-pulse bg-muted/40 rounded-xl" />)}
  </div>
);

const Dashboard = () => {
  const [data, setData]     = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/dashboard-data`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data ? `Water quality overview — ${data.summary.total.toLocaleString()} real samples analyzed` : "Loading water quality data…"}
        </p>
      </div>

      {loading && <Skeleton />}
      {error && (
        <div className="glass-card p-6 border-danger/30 border text-sm text-danger">
          ⚠ Could not load dashboard data. Ensure the backend is running at {BASE_URL}.
          <p className="font-mono text-xs mt-1">{error}</p>
        </div>
      )}

      {data && (() => {
        const { summary, featureImportances, radarData, phDistribution, turbidityDistribution } = data;

        const pieData = [
          { name: "Safe",   value: summary.safe,   color: C.safe },
          { name: "Unsafe", value: summary.unsafe, color: C.unsafe },
        ];

        const phChart = phDistribution.labels.map((l, i) => ({
          ph: l, Safe: phDistribution.safe[i], Unsafe: phDistribution.unsafe[i],
        }));

        const turbChart = turbidityDistribution.labels.map((l, i) => ({
          turbidity: l, Safe: turbidityDistribution.safe[i], Unsafe: turbidityDistribution.unsafe[i],
        }));

        const sparkPh   = phDistribution.safe.map((s, i) => s + phDistribution.unsafe[i]);
        const sparkSafe = phDistribution.safe;
        const sparkUnsf = phDistribution.unsafe;

        return (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Total Samples"  value={summary.total.toLocaleString()}   change={0}                        icon={Droplets}    sparkData={sparkPh}   color={C.blue}  />
              <MetricCard title="Safe Samples"   value={summary.safe.toLocaleString()}    change={summary.safe_percent}     icon={ShieldCheck} sparkData={sparkSafe} color={C.safe}  />
              <MetricCard title="Unsafe Samples" value={summary.unsafe.toLocaleString()}  change={-summary.unsafe_percent}  icon={ShieldX}     sparkData={sparkUnsf} color={C.unsafe}/>
              <MetricCard title="Safety Rate"    value={`${summary.safe_percent}%`}       change={summary.safe_percent - 50} icon={Percent}   sparkData={radarData.map(r => r.safe)} color={C.amber} />
            </div>

            {/* Row 1 — pH Distribution + Safe/Unsafe Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
                <h3 className="font-display font-semibold text-foreground mb-1">pH Level Distribution</h3>
                <p className="text-xs text-muted-foreground mb-4">Safe vs Unsafe sample counts across pH value ranges</p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={phChart}>
                    <defs>
                      <linearGradient id="gSafe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.safe} stopOpacity={0.35} /><stop offset="100%" stopColor={C.safe} stopOpacity={0} /></linearGradient>
                      <linearGradient id="gUnsafe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.unsafe} stopOpacity={0.35} /><stop offset="100%" stopColor={C.unsafe} stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="ph" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Area type="monotone" dataKey="Safe"   stroke={C.safe}   fill="url(#gSafe)"   strokeWidth={2} />
                    <Area type="monotone" dataKey="Unsafe" stroke={C.unsafe} fill="url(#gUnsafe)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-display font-semibold text-foreground mb-1">Water Safety Distribution</h3>
                <p className="text-xs text-muted-foreground mb-4">Proportion of safe vs unsafe samples in the dataset</p>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={4} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString(), "Samples"]} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Row 2 — Feature Importance + Turbidity + Radar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
                <h3 className="font-display font-semibold text-foreground mb-1">Feature Importance</h3>
                <p className="text-xs text-muted-foreground mb-4">Predictive weight of each parameter in the trained RF model</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={featureImportances} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => `${v}%`} />
                    <YAxis dataKey="param" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={90} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Importance"]} />
                    <Bar dataKey="importance" fill={C.blue} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
                <h3 className="font-display font-semibold text-foreground mb-1">Turbidity Distribution</h3>
                <p className="text-xs text-muted-foreground mb-4">Sample distribution by turbidity (NTU)</p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={turbChart}>
                    <defs>
                      <linearGradient id="gTS" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.safe} stopOpacity={0.3} /><stop offset="100%" stopColor={C.safe} stopOpacity={0} /></linearGradient>
                      <linearGradient id="gTU" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.unsafe} stopOpacity={0.3} /><stop offset="100%" stopColor={C.unsafe} stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="turbidity" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="Safe"   stroke={C.safe}   fill="url(#gTS)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Unsafe" stroke={C.unsafe} fill="url(#gTU)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
                <h3 className="font-display font-semibold text-foreground mb-1">Parameter Profile</h3>
                <p className="text-xs text-muted-foreground mb-4">Normalized mean values: Safe vs Unsafe water</p>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="param" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <PolarRadiusAxis stroke="hsl(var(--border))" fontSize={9} domain={[0, 100]} />
                    <Radar name="Safe"   dataKey="safe"   stroke={C.safe}   fill={C.safe}   fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Unsafe" dataKey="unsafe" stroke={C.unsafe} fill={C.unsafe} fillOpacity={0.15} strokeWidth={2} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default Dashboard;
