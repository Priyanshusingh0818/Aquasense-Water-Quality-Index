import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ChevronDown, ChevronUp, Download } from "lucide-react";

const historicalData = [
  { id: 1, location: "Ganges River - Delhi", ph: 6.2, turbidity: 245, temp: 28, tds: 890, do: 4.2, nitrate: 38, level: "Highly Polluted", date: "2026-03-12" },
  { id: 2, location: "Yamuna River - Agra", ph: 6.8, turbidity: 180, temp: 26, tds: 720, do: 5.1, nitrate: 28, level: "Polluted", date: "2026-03-12" },
  { id: 3, location: "Lake Pichola - Udaipur", ph: 7.2, turbidity: 45, temp: 24, tds: 380, do: 7.2, nitrate: 12, level: "Moderate", date: "2026-03-12" },
  { id: 4, location: "Chilika Lake - Odisha", ph: 7.5, turbidity: 12, temp: 27, tds: 280, do: 8.5, nitrate: 5, level: "Safe", date: "2026-03-12" },
  { id: 5, location: "Brahmaputra - Guwahati", ph: 7.3, turbidity: 20, temp: 25, tds: 320, do: 8.0, nitrate: 8, level: "Safe", date: "2026-03-11" },
  { id: 6, location: "Narmada River - Bhopal", ph: 7.0, turbidity: 55, temp: 23, tds: 420, do: 6.8, nitrate: 15, level: "Moderate", date: "2026-03-11" },
  { id: 7, location: "Cauvery River - Bangalore", ph: 6.5, turbidity: 150, temp: 29, tds: 650, do: 5.5, nitrate: 22, level: "Polluted", date: "2026-03-11" },
  { id: 8, location: "Godavari - Nashik", ph: 7.4, turbidity: 18, temp: 22, tds: 300, do: 8.2, nitrate: 6, level: "Safe", date: "2026-03-11" },
  { id: 9, location: "Tapi River - Surat", ph: 6.9, turbidity: 95, temp: 27, tds: 550, do: 6.0, nitrate: 18, level: "Moderate", date: "2026-03-10" },
  { id: 10, location: "Krishna River - Pune", ph: 7.1, turbidity: 35, temp: 24, tds: 350, do: 7.8, nitrate: 10, level: "Safe", date: "2026-03-10" },
];

const levelStyles: Record<string, string> = {
  Safe: "bg-safe/10 text-safe",
  Moderate: "bg-moderate/10 text-moderate",
  Polluted: "bg-polluted/10 text-polluted",
  "Highly Polluted": "bg-danger/10 text-danger",
};

const HistoricalData = () => {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("date");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = historicalData
    .filter((d) => d.location.toLowerCase().includes(search.toLowerCase()) || d.level.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = (a as any)[sortField];
      const bVal = (b as any)[sortField];
      if (typeof aVal === "number") return sortAsc ? aVal - bVal : bVal - aVal;
      return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });

  const toggleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const SortIcon = ({ field }: { field: string }) => sortField === field ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Historical Data</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse past water quality measurements</p>
      </div>

      <div className="glass-card">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 bg-muted/50 rounded-xl px-3 py-2 w-full sm:max-w-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search locations or status..."
              className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { key: "location", label: "Location" },
                  { key: "ph", label: "pH" },
                  { key: "turbidity", label: "Turbidity" },
                  { key: "temp", label: "Temp (°C)" },
                  { key: "tds", label: "TDS" },
                  { key: "do", label: "DO" },
                  { key: "level", label: "Status" },
                  { key: "date", label: "Date" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    <span className="flex items-center gap-1">{col.label} <SortIcon field={col.key} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">{row.location}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{row.ph}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{row.turbidity}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{row.temp}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{row.tds}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{row.do}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${levelStyles[row.level]}`}>
                      {row.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{row.date}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoricalData;
