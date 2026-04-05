import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Prediction from "./pages/Prediction";
import Recommendations from "./pages/Recommendations";
import Simulation from "./pages/Simulation";
import ModelComparison from "./pages/ModelComparison";
import AnomalyDetection from "./pages/AnomalyDetection";
import DataDrift from "./pages/DataDrift";
import DashboardLayout from "./layouts/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/prediction" element={<Prediction />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/models" element={<ModelComparison />} />
            <Route path="/anomalies" element={<AnomalyDetection />} />
            <Route path="/drift" element={<DataDrift />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
