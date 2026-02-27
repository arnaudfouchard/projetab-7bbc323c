import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import Dashboard from "./pages/Dashboard";
import SelectEntity from "./pages/SelectEntity";
import SelectModules from "./pages/SelectModules";
import Workspace from "./pages/Workspace";
import Explore from "./pages/Explore";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects/select-entity" element={<SelectEntity />} />
              <Route path="/projects/select-modules" element={<SelectModules />} />
              <Route path="/projects/:id" element={<Workspace />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
