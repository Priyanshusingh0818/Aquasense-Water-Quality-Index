import { motion } from "framer-motion";
import { ArrowRight, Waves, BarChart3, Shield, Cpu, Droplets, Activity, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedCounter from "@/components/AnimatedCounter";
import heroImage from "@/assets/hero-water.jpg";

const features = [
  { icon: Cpu, title: "AI-Powered Prediction", desc: "Machine learning models predict water quality with 95%+ accuracy using real-time sensor data." },
  { icon: Shield, title: "Real-Time Monitoring", desc: "24/7 monitoring of water parameters across multiple stations with instant alerts." },
  { icon: BarChart3, title: "Data Analytics", desc: "Advanced visualization and trend analysis for informed environmental decisions." },
  { icon: MapPin, title: "Geospatial Mapping", desc: "Interactive pollution maps showing contamination levels across monitoring stations." },
];

const stats = [
  { value: 12847, label: "Water Samples Analyzed", suffix: "+" },
  { value: 342, label: "Pollution Alerts Generated", suffix: "" },
  { value: 156, label: "Active Monitoring Stations", suffix: "" },
  { value: 99.2, label: "System Uptime", suffix: "%", decimals: 1 },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl eco-gradient flex items-center justify-center">
              <Waves className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">AquaSense</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#stats" className="hover:text-foreground transition-colors">Impact</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/prediction" className="text-sm font-medium text-foreground hover:text-primary transition-colors hidden sm:block">
              Check Water Quality
            </Link>
            <Link
              to="/dashboard"
              className="eco-gradient text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Clean river with monitoring sensors" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
        </div>
        <div className="relative container mx-auto px-6 py-32 md:py-44">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary-foreground text-xs font-semibold mb-6 backdrop-blur-sm border border-primary/30">
              <Activity className="h-3.5 w-3.5" />
              AI-Powered Environmental Intelligence
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight mb-6" style={{ color: "white" }}>
              Smart Water Pollution Monitoring with{" "}
              <span className="text-primary">Artificial Intelligence</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
              Predict, analyze, and monitor water quality using machine learning. Protect our water resources with real-time data-driven insights.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/prediction"
                className="eco-gradient text-primary-foreground px-7 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg"
              >
                <Droplets className="h-4 w-4" />
                Check Water Quality
              </Link>
              <Link
                to="/dashboard"
                className="backdrop-blur-md px-7 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-colors"
                style={{ color: "white", borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} decimals={stat.decimals || 0} />
                </div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Why AquaSense?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Leveraging cutting-edge AI and real-time sensor data to protect our most vital resource.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <div className="w-12 h-12 rounded-xl eco-gradient flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 bg-card border-t border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">About AquaSense</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                AquaSense is an AI-powered platform designed to revolutionize water quality monitoring. By combining machine learning algorithms with real-time environmental sensor data, we provide actionable insights for researchers, environmental agencies, and communities to safeguard clean water resources.
              </p>
              <Link
                to="/dashboard"
                className="eco-gradient text-primary-foreground px-7 py-3.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-background">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold text-foreground">AquaSense</span>
          </div>
          <p>© 2026 AquaSense. AI-Powered Water Monitoring Platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
