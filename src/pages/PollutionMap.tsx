import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const locations = [
  { name: "Ganges River - Delhi", lat: 28.6139, lng: 77.2090, status: "danger", wqi: 32, ph: 6.2, turbidity: 245, temp: 28, lastUpdated: "2 min ago" },
  { name: "Yamuna River - Agra", lat: 27.1767, lng: 78.0081, status: "polluted", wqi: 48, ph: 6.8, turbidity: 180, temp: 26, lastUpdated: "5 min ago" },
  { name: "Lake Pichola - Udaipur", lat: 24.5764, lng: 73.6833, status: "moderate", wqi: 65, ph: 7.2, turbidity: 45, temp: 24, lastUpdated: "1 min ago" },
  { name: "Chilika Lake - Odisha", lat: 19.7183, lng: 85.3200, status: "safe", wqi: 88, ph: 7.5, turbidity: 12, temp: 27, lastUpdated: "3 min ago" },
  { name: "Brahmaputra - Guwahati", lat: 26.1445, lng: 91.7362, status: "safe", wqi: 82, ph: 7.3, turbidity: 20, temp: 25, lastUpdated: "4 min ago" },
  { name: "Narmada River - Bhopal", lat: 23.2599, lng: 77.4126, status: "moderate", wqi: 61, ph: 7.0, turbidity: 55, temp: 23, lastUpdated: "2 min ago" },
  { name: "Cauvery River - Bangalore", lat: 12.9716, lng: 77.5946, status: "polluted", wqi: 44, ph: 6.5, turbidity: 150, temp: 29, lastUpdated: "6 min ago" },
  { name: "Godavari - Nashik", lat: 19.9975, lng: 73.7898, status: "safe", wqi: 85, ph: 7.4, turbidity: 18, temp: 22, lastUpdated: "1 min ago" },
  { name: "Hooghly River - Kolkata", lat: 22.5726, lng: 88.3639, status: "danger", wqi: 38, ph: 6.4, turbidity: 210, temp: 27, lastUpdated: "8 min ago" },
  { name: "Dal Lake - Srinagar", lat: 34.1136, lng: 74.8741, status: "moderate", wqi: 75, ph: 7.6, turbidity: 30, temp: 15, lastUpdated: "4 min ago" },
  { name: "Krishna River - Vijayawada", lat: 16.5062, lng: 80.6480, status: "moderate", wqi: 58, ph: 6.9, turbidity: 85, temp: 28, lastUpdated: "5 min ago" },
  { name: "Sabarmati River - Ahmedabad", lat: 23.0225, lng: 72.5714, status: "polluted", wqi: 41, ph: 6.3, turbidity: 195, temp: 30, lastUpdated: "12 min ago" },
  { name: "Musi River - Hyderabad", lat: 17.3850, lng: 78.4867, status: "danger", wqi: 28, ph: 5.9, turbidity: 280, temp: 29, lastUpdated: "2 min ago" },
  { name: "Periyar River - Kochi", lat: 9.9312, lng: 76.2673, status: "safe", wqi: 92, ph: 7.8, turbidity: 8, temp: 26, lastUpdated: "1 min ago" },
  { name: "Tapti River - Surat", lat: 21.1702, lng: 72.8311, status: "polluted", wqi: 52, ph: 6.7, turbidity: 130, temp: 28, lastUpdated: "7 min ago" },
  { name: "Mahanadi River - Cuttack", lat: 20.4625, lng: 85.8828, status: "safe", wqi: 81, ph: 7.4, turbidity: 22, temp: 27, lastUpdated: "6 min ago" },
  { name: "Sutlej River - Ludhiana", lat: 30.9010, lng: 75.8573, status: "polluted", wqi: 47, ph: 6.6, turbidity: 160, temp: 24, lastUpdated: "3 min ago" },
  { name: "Beas River - Kullu", lat: 31.9579, lng: 77.1095, status: "safe", wqi: 95, ph: 8.1, turbidity: 5, temp: 12, lastUpdated: "10 min ago" },
  { name: "Gomti River - Lucknow", lat: 26.8467, lng: 80.9462, status: "danger", wqi: 35, ph: 6.1, turbidity: 220, temp: 27, lastUpdated: "4 min ago" },
  { name: "Vembanad Lake - Kerala", lat: 9.5833, lng: 76.3333, status: "moderate", wqi: 68, ph: 7.1, turbidity: 40, temp: 28, lastUpdated: "2 min ago" },
  { name: "Ghaggar River - Chandigarh", lat: 30.7333, lng: 76.7794, status: "polluted", wqi: 55, ph: 6.9, turbidity: 110, temp: 25, lastUpdated: "5 min ago" },
  { name: "Indus River - Leh", lat: 34.1526, lng: 77.5771, status: "safe", wqi: 98, ph: 8.2, turbidity: 2, temp: 8, lastUpdated: "15 min ago" },
  { name: "Hussain Sagar - Telangana", lat: 17.4239, lng: 78.4738, status: "polluted", wqi: 42, ph: 6.4, turbidity: 175, temp: 29, lastUpdated: "1 min ago" },
  { name: "Damodar River - Dhanbad", lat: 23.7957, lng: 86.4304, status: "danger", wqi: 30, ph: 5.8, turbidity: 260, temp: 26, lastUpdated: "6 min ago" },
  { name: "Mandovi River - Goa", lat: 15.4909, lng: 73.8278, status: "moderate", wqi: 72, ph: 7.5, turbidity: 35, temp: 28, lastUpdated: "3 min ago" },
  { name: "Beni River - Rajasthan", lat: 25.0333, lng: 73.0500, status: "safe", wqi: 86, ph: 7.7, turbidity: 15, temp: 27, lastUpdated: "8 min ago" },
  { name: "Pangong Tso - Ladakh", lat: 33.7595, lng: 78.6674, status: "safe", wqi: 96, ph: 8.0, turbidity: 3, temp: 5, lastUpdated: "20 min ago" },
  { name: "Lokhpat Lake - Gujarat", lat: 23.8267, lng: 69.0185, status: "moderate", wqi: 63, ph: 7.2, turbidity: 50, temp: 31, lastUpdated: "9 min ago" },
  { name: "Loktak Lake - Manipur", lat: 24.5500, lng: 93.8000, status: "moderate", wqi: 77, ph: 7.4, turbidity: 25, temp: 22, lastUpdated: "4 min ago" },
  { name: "Kosi River - Bihar", lat: 25.4333, lng: 87.2833, status: "danger", wqi: 37, ph: 6.3, turbidity: 230, temp: 26, lastUpdated: "5 min ago" },
];

const statusColors: Record<string, string> = {
  safe: "#22C55E",
  moderate: "#EAB308",
  polluted: "#F97316",
  danger: "#EF4444",
};

const statusLabels: Record<string, string> = {
  safe: "Clean Water",
  moderate: "Moderate",
  polluted: "Polluted",
  danger: "High Pollution",
};

const PollutionMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [selected, setSelected] = useState<typeof locations[0] | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (!isMounted || !mapRef.current || mapInstance.current) return;

      const map = L.map(mapRef.current).setView([22.5, 80], 5);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      locations.forEach((loc) => {
        const color = statusColors[loc.status];
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:200px;">
            <h3 style="font-weight:700;margin:0 0 8px;font-size:14px;">${loc.name}</h3>
            <div style="display:grid;gap:4px;font-size:12px;">
              <div style="display:flex;justify-content:space-between;"><span style="color:#666;">WQI</span><strong>${loc.wqi}/100</strong></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:#666;">pH</span><strong>${loc.ph}</strong></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:#666;">Turbidity</span><strong>${loc.turbidity} NTU</strong></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:#666;">Temp</span><strong>${loc.temp}°C</strong></div>
              <div style="margin-top:6px;padding:4px 8px;border-radius:6px;text-align:center;font-weight:600;font-size:11px;color:white;background:${color};">${statusLabels[loc.status]}</div>
            </div>
          </div>
        `);
      });
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Pollution Monitoring Map</h1>
        <p className="text-sm text-muted-foreground mt-1">Interactive map of water quality across monitoring stations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 glass-card overflow-hidden">
          <div ref={mapRef} className="h-[500px] lg:h-[600px] w-full" />
        </div>

        <div className="space-y-4">
          {/* Legend */}
          <div className="glass-card p-4">
            <h3 className="font-display font-semibold text-foreground mb-3 text-sm">Legend</h3>
            <div className="space-y-2">
              {Object.entries(statusLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors[key] }} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Station list */}
          <div className="glass-card p-4">
            <h3 className="font-display font-semibold text-foreground mb-3 text-sm">Stations</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {locations.map((loc, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[loc.status] }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">WQI: {loc.wqi} · {loc.lastUpdated}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollutionMap;
