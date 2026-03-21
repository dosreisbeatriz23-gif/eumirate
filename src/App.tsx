import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AppLayout from "./components/layout/AppLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CreateList from "./pages/CreateList";
import ListDetail from "./pages/ListDetail";
import AddItem from "./pages/AddItem";
import MeusDesejos from "./pages/MeusDesejos";
import Categorias from "./pages/Categorias";
import Grupos from "./pages/Grupos";
import GroupDetail from "./pages/GroupDetail";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Landing page without layout */}
          <Route path="/" element={<Index />} />

          {/* App pages with shared layout */}
          <Route element={<AppLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/criar-lista" element={<CreateList />} />
            <Route path="/lista/:id" element={<ListDetail />} />
            <Route path="/lista/:id/adicionar" element={<AddItem />} />
            <Route path="/adicionar" element={<AddItem />} />
            <Route path="/meus-desejos" element={<MeusDesejos />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/grupos" element={<Grupos />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
