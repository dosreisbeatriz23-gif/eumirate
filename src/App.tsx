import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import AppLayout from "./components/layout/AppLayout";
import Home from "./pages/Home";
import ListDetail from "./pages/ListDetail";
import AddItem from "./pages/AddItem";
import MeusDesejos from "./pages/MeusDesejos";
import Categorias from "./pages/Categorias";
import Grupos from "./pages/Grupos";
import GroupDetail from "./pages/GroupDetail";
import Perfil from "./pages/Perfil";
import ItemDetail from "./pages/ItemDetail";
import GroupInvite from "./pages/GroupInvite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Onboarding />} />
            <Route path="/landing" element={<Index />} />
            <Route path="/login" element={<Login />} />

            {/* App pages with shared layout */}
            <Route element={<AppLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/dashboard" element={<MeusDesejos />} />
              <Route path="/lista/:id" element={<ListDetail />} />
              <Route path="/lista/:id/adicionar" element={<AddItem />} />
              <Route path="/adicionar" element={<AddItem />} />
              <Route path="/meus-desejos" element={<MeusDesejos />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/grupos" element={<Grupos />} />
              <Route path="/grupo/convite/:code" element={<GroupInvite />} />
              <Route path="/grupo/:id" element={<GroupDetail />} />
              <Route path="/item/:id" element={<ItemDetail />} />
              <Route path="/perfil" element={<Perfil />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
