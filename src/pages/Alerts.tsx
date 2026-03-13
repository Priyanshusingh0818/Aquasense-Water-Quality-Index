import { motion } from "framer-motion";
import { AlertTriangle, ShieldAlert, Beaker, Factory, Droplets, Clock, CheckCircle } from "lucide-react";

const alerts = [
  { id: 1, type: "critical", title: "High Turbidity Detected", location: "Ganges River - Delhi", value: "245 NTU", threshold: "50 NTU", time: "2 minutes ago", icon: Droplets, resolved: false },
  { id: 2, type: "critical", title: "Unsafe pH Level", location: "Cauvery River - Bangalore", value: "6.2", threshold: "6.5 - 8.5", time: "15 minutes ago", icon: Beaker, resolved: false },
  { id: 3, type: "warning", title: "Industrial Contamination Detected", location: "Yamuna River - Agra", value: "High", threshold: "Safe limits", time: "32 minutes ago", icon: Factory, resolved: false },
  { id: 4, type: "warning", title: "Low Dissolved Oxygen", location: "Ganges River - Delhi", value: "4.2 mg/L", threshold: "6.0 mg/L", time: "1 hour ago", icon: Droplets, resolved: false },
  { id: 5, type: "info", title: "Elevated Nitrate Levels", location: "Narmada River - Bhopal", value: "15 mg/L", threshold: "10 mg/L", time: "2 hours ago", icon: Beaker, resolved: true },
  { id: 6, type: "critical", title: "TDS Exceeds Safe Limit", location: "Ganges River - Delhi", value: "890 mg/L", threshold: "500 mg/L", time: "3 hours ago", icon: ShieldAlert, resolved: true },
  { id: 7, type: "info", title: "Temperature Anomaly", location: "Cauvery River - Bangalore", value: "29°C", threshold: "25°C", time: "4 hours ago", icon: AlertTriangle, resolved: true },
];

const typeStyles = {
  critical: { bg: "bg-danger/5", border: "border-danger/20", icon: "text-danger", badge: "bg-danger/10 text-danger" },
  warning: { bg: "bg-moderate/5", border: "border-moderate/20", icon: "text-moderate", badge: "bg-moderate/10 text-moderate" },
  info: { bg: "bg-water-blue/5", border: "border-water-blue/20", icon: "text-water-blue", badge: "bg-water-blue/10 text-water-blue" },
};

const Alerts = () => {
  const active = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Alerts & Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time pollution alerts from monitoring stations</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-danger/10 text-danger text-sm font-semibold">
          <AlertTriangle className="h-4 w-4" />
          {active.length} Active
        </div>
      </div>

      {/* Active alerts */}
      <div className="space-y-3">
        <h2 className="font-display font-semibold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Active Alerts</h2>
        {active.map((alert, i) => {
          const styles = typeStyles[alert.type as keyof typeof typeStyles];
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`glass-card p-5 border-l-4 ${styles.border} ${styles.bg}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${styles.badge}`}>
                  <alert.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-foreground">{alert.title}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge} uppercase`}>
                      {alert.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert.location}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>Recorded: <strong className="text-foreground">{alert.value}</strong></span>
                    <span>Threshold: <strong className="text-foreground">{alert.threshold}</strong></span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{alert.time}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Resolved */}
      <div className="space-y-3">
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-muted-foreground">Resolved</h2>
        {resolved.map((alert, i) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 opacity-60"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-safe flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">{alert.title}</span>
                <span className="text-xs text-muted-foreground ml-2">{alert.location} · {alert.time}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Alerts;
