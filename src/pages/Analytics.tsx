import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";

const monthlyTrend = [
  { month: "Jan", chemical: 35, biological: 28, industrial: 18 },
  { month: "Feb", chemical: 32, biological: 30, industrial: 20 },
  { month: "Mar", chemical: 38, biological: 25, industrial: 22 },
  { month: "Apr", chemical: 30, biological: 32, industrial: 19 },
  { month: "May", chemical: 28, biological: 35, industrial: 16 },
  { month: "Jun", chemical: 25, biological: 30, industrial: 15 },
  { month: "Jul", chemical: 32, biological: 28, industrial: 18 },
  { month: "Aug", chemical: 35, biological: 26, industrial: 20 },
  { month: "Sep", chemical: 30, biological: 29, industrial: 17 },
  { month: "Oct", chemical: 27, biological: 31, industrial: 14 },
  { month: "Nov", chemical: 24, biological: 28, industrial: 12 },
  { month: "Dec", chemical: 22, biological: 25, industrial: 10 },
];

const sourceData = [
  { name: "Agricultural Runoff", value: 32, color: "#2ECC71" },
  { name: "Industrial Waste", value: 28, color: "#0EA5E9" },
  { name: "Sewage", value: 25, color: "#F59E0B" },
  { name: "Mining", value: 15, color: "#EF4444" },
];

const paramCompare = [
  { param: "pH", Ganga: 78, Yamuna: 65, Godavari: 88 },
  { param: "Hardness", Ganga: 85, Yamuna: 72, Godavari: 90 },
  { param: "Solids", Ganga: 45, Yamuna: 58, Godavari: 30 },
  { param: "Sulfate", Ganga: 62, Yamuna: 75, Godavari: 50 },
  { param: "Conductivity", Ganga: 90, Yamuna: 82, Godavari: 95 },
  { param: "Trihalomethanes", Ganga: 55, Yamuna: 68, Godavari: 42 },
];

const yearlyWQI = Array.from({ length: 24 }, (_, i) => ({
  month: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`,
  wqi: 60 + Math.sin(i / 3) * 15 + Math.random() * 8,
}));

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Analytics & Visualization</h1>
        <p className="text-sm text-muted-foreground mt-1">Comprehensive pollution data analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-line pollution trends */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Pollution Trends by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 13 }} />
              <Legend />
              <Area type="monotone" dataKey="chemical" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="biological" stroke="#2ECC71" fill="#2ECC71" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="industrial" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Source pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Pollution Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {sourceData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Radar comparison */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">River Comparison Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={paramCompare}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="param" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <PolarRadiusAxis stroke="hsl(var(--border))" fontSize={10} />
              <Radar name="Ganga" dataKey="Ganga" stroke="#2ECC71" fill="#2ECC71" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Yamuna" dataKey="Yamuna" stroke="#EF4444" fill="#EF4444" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Godavari" dataKey="Godavari" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.15} strokeWidth={2} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Long term WQI */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Long-Term WQI Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={yearlyWQI}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={3} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[40, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 13 }} />
              <Line type="monotone" dataKey="wqi" stroke="#2ECC71" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
