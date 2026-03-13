import { Bell, Search, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

const DashboardTopbar = () => {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Search locations, parameters..."
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDark(!dark)}
          className="p-2.5 rounded-xl hover:bg-muted transition-colors"
        >
          {dark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
        </button>
        <button className="p-2.5 rounded-xl hover:bg-muted transition-colors relative">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger animate-pulse-glow" />
        </button>
        <div className="w-9 h-9 rounded-full eco-gradient flex items-center justify-center text-primary-foreground text-sm font-bold ml-2">
          AS
        </div>
      </div>
    </header>
  );
};

export default DashboardTopbar;
