import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CreateList from "./pages/CreateList";
import ListDetail from "./pages/ListDetail";
import AddItem from "./pages/AddItem";
import MeusDesejos from "./pages/MeusDesejos";
import Categorias from "./pages/Categorias";
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/criar-lista" element={<CreateList />} />
          <Route path="/lista/:id" element={<ListDetail />} />
          <Route path="/lista/:id/adicionar" element={<AddItem />} />
          <Route path="/meus-desejos" element={<MeusDesejos />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
