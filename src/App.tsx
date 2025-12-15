import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ChurnPage from "./pages/ChurnPage";
import InadimplenciaPage from "./pages/InadimplenciaPage";
import SuportePage from "./pages/SuportePage";
import RedePage from "./pages/RedePage";
import NPSPage from "./pages/NPSPage";
import ClientesPage from "./pages/ClientesPage";
import AcoesPage from "./pages/AcoesPage";
import TendenciasPage from "./pages/TendenciasPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/churn" element={<ChurnPage />} />
          <Route path="/inadimplencia" element={<InadimplenciaPage />} />
          <Route path="/suporte" element={<SuportePage />} />
          <Route path="/rede" element={<RedePage />} />
          <Route path="/nps" element={<NPSPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/acoes" element={<AcoesPage />} />
          <Route path="/tendencias" element={<TendenciasPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
