import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Users,
  Heart,
  Briefcase,
  HeartHandshake,
  Star,
  Plane,
  Settings2,
  ShoppingBag,
  Home,
  Sparkles,
  BookOpen,
  Gamepad2,
  Shirt,
  Gift,
  List,
} from "lucide-react";

const grupos = [
  { label: "Família", icon: Home, color: "bg-primary/15 text-primary" },
  { label: "Amigos", icon: Users, color: "bg-secondary text-secondary-foreground" },
  { label: "Trabalho", icon: Briefcase, color: "bg-accent text-accent-foreground" },
  { label: "Casal", icon: Heart, color: "bg-primary/15 text-primary" },
  { label: "Melhores Amigos", icon: Star, color: "bg-secondary text-secondary-foreground" },
  { label: "Viagem em Grupo", icon: Plane, color: "bg-accent text-accent-foreground" },
  { label: "Grupo Personalizado", icon: Settings2, color: "bg-muted text-muted-foreground" },
];

const categoriasGerais = [
  { label: "Tecnologia", icon: Sparkles },
  { label: "Moda", icon: Shirt },
  { label: "Casa & Decoração", icon: Home },
  { label: "Livros", icon: BookOpen },
  { label: "Games", icon: Gamepad2 },
  { label: "Beleza", icon: HeartHandshake },
  { label: "Presentes", icon: Gift },
  { label: "Compras", icon: ShoppingBag },
];

const Categorias = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();

  const { data: wishlists = [] } = useQuery({
    queryKey: ["wishlists", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, title")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-2xl space-y-10">
        {/* Grupos */}
        <section>
          <h2 className="text-xl font-serif font-medium text-foreground mb-4">Grupos</h2>
          <div className="grid grid-cols-2 gap-3">
            {grupos.map((g) => (
              <button
                key={g.label}
                onClick={() => navigate(`/criar-lista?grupo=${encodeURIComponent(g.label)}`)}
                className={`flex items-center gap-3 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${g.color} border border-border/30`}
              >
                <g.icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium leading-tight">{g.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Categorias Gerais */}
        <section>
          <h2 className="text-xl font-serif font-medium text-foreground mb-4">Categorias Gerais</h2>
          <div className="grid grid-cols-2 gap-3">
            {categoriasGerais.map((c) => (
              <button
                key={c.label}
                onClick={() => navigate(`/criar-lista?categoria=${encodeURIComponent(c.label)}`)}
                className="flex items-center gap-3 rounded-2xl p-4 text-left bg-card border border-border/50 transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-primary/30"
              >
                <c.icon className="w-5 h-5 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground leading-tight">{c.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Listas de Desejos Pessoais */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-serif font-medium text-foreground">Listas de Desejos Pessoais</h2>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => navigate("/criar-lista")}
            >
              Nova Lista
            </Button>
          </div>
          {wishlists.length === 0 ? (
            <div className="text-center py-10">
              <Gift className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma lista ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {wishlists.map((w) => (
                <button
                  key={w.id}
                  onClick={() => navigate(`/lista/${w.id}`)}
                  className="flex items-center gap-3 rounded-2xl p-4 text-left bg-card border border-border/50 transition-all hover:scale-[1.01] active:scale-[0.99] hover:border-primary/30"
                >
                  <List className="w-5 h-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium text-foreground">{w.title}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Categorias;
