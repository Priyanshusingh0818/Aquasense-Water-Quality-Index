import { motion } from "framer-motion";
import MetricCard from "@/components/MetricCard";
import { Droplets, Radio, AlertTriangle, Activity } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";

const wqiData = [
  { month: "Jan", wqi: 72 }, { month: "Feb", wqi: 68 }, { month: "Mar", wqi: 75 },
  { month: "Apr", wqi: 71 }, { month: "May", wqi: 78 }, { month: "Jun", wqi: 82 },
  { month: "Jul", wqi: 79 }, { month: "Aug", wqi: 74 }, { month: "Sep", wqi: 80 },
  { month: "Oct", wqi: 85 }, { month: "Nov", wqi: 83 }, { month: "Dec", wqi: 88 },
];

const locationData = [
  { location: "Ganga", level: 65 }, { location: "Yamuna", level: 82 },
  { location: "Godavari", level: 48 }, { location: "Narmada", level: 35 },
  { location: "Krishna", level: 52 }, { location: "Kaveri", level: 45 },
];

const pollutionTypes = [
  { name: "Chemical", value: 35, color: "#0EA5E9" },
  { name: "Biological", value: 40, color: "#2ECC71" },
  { name: "Industrial", value: 25, color: "#F59E0B" },
];

const trendData = [
  { day: "Mon", value: 32 }, { day: "Tue", value: 45 }, { day: "Wed", value: 38 },
  { day: "Thu", value: 52 }, { day: "Fri", value: 41 }, { day: "Sat", value: 35 },
  { day: "Sun", value: 28 },
];

const radarData = [
  { param: "pH", A: 78, fullMark: 100 },
  { param: "Hardness", A: 65, fullMark: 100 },
  { param: "Solids", A: 85, fullMark: 100 },
  { param: "Chloramines", A: 62, fullMark: 100 },
  { param: "Sulfate", A: 50, fullMark: 100 },
  { param: "Conductivity", A: 45, fullMark: 100 },
];

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time water quality monitoring overview</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Water Quality Index" value="82.4" change={5.2} icon={Droplets} sparkData={[72, 68, 75, 71, 78, 82, 79, 74, 80, 85, 83, 88]} color="#2ECC71" />
        <MetricCard title="Active Stations" value="156" change={3.1} icon={Radio} sparkData={[140, 142, 148, 150, 152, 155, 153, 156]} color="#0EA5E9" />
        <MetricCard title="Alerts Today" value="12" change={-8.5} icon={AlertTriangle} sparkData={[18, 15, 20, 14, 16, 13, 12]} color="#F59E0B" />
        <MetricCard title="Avg Pollution" value="34.2" change={-12.3} icon={Activity} sparkData={[45, 42, 40, 38, 36, 35, 34]} color="#22C55E" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Water Quality Index Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={wqiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 13 }} />
              <Line type="monotone" dataKey="wqi" stroke="#2ECC71" strokeWidth={3} dot={{ fill: "#2ECC71", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Pollution Levels by Location</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={locationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="location" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 13 }} />
              <Bar dataKey="level" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Pollution Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pollutionTypes} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                {pollutionTypes.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 13 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Area Chart */}
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Contamination Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 13 }} />
              <Area type="monotone" dataKey="value" stroke="#0EA5E9" strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="glass-card p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Parameter Analysis</h3>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="param" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <PolarRadiusAxis stroke="hsl(var(--border))" fontSize={10} />
              <Radar dataKey="A" stroke="#2ECC71" fill="#2ECC71" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
