import { useNavigate } from "react-router-dom";
import { useLocalUser } from "@/hooks/useLocalUser";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { List, Users, PlusCircle, User, ChevronRight, Gift, Sparkles } from "lucide-react";

const quickActions = [
  {
    label: "Minhas Listas",
    description: "Veja e gerencie suas listas de desejos",
    icon: List,
    path: "/dashboard",
    gradient: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
  },
  {
    label: "Adicionar Item",
    description: "Adicione um novo item à sua lista",
    icon: PlusCircle,
    path: "/adicionar",
    gradient: "from-accent/30 to-accent/10",
    iconColor: "text-accent-foreground",
  },
  {
    label: "Grupos",
    description: "Compartilhe listas com amigos e família",
    icon: Users,
    path: "/grupos",
    gradient: "from-secondary to-secondary/30",
    iconColor: "text-secondary-foreground",
  },
  {
    label: "Perfil",
    description: "Suas configurações e preferências",
    icon: User,
    path: "/perfil",
    gradient: "from-muted to-muted/30",
    iconColor: "text-muted-foreground",
  },
];

const Home = () => {
  const navigate = useNavigate();
  const { userId } = useLocalUser();

  const { data: wishlists = [] } = useQuery({
    queryKey: ["wishlists", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, title")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-3xl">
      {/* Greeting */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary">Bem-vindo ao Eumirate</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground">
          O que deseja fazer?
        </h1>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-10">
        {quickActions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`group relative flex flex-col items-start gap-3 rounded-2xl p-5 sm:p-6 text-left bg-gradient-to-br ${action.gradient} border border-border/40 transition-all duration-200 hover:scale-[1.02] hover:shadow-[var(--shadow-medium)] active:scale-[0.98]`}
          >
            <div className={`w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-sm ${action.iconColor}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight mb-0.5">
                {action.label}
              </h3>
              <p className="text-xs text-muted-foreground leading-snug hidden sm:block">
                {action.description}
              </p>
            </div>
            <ChevronRight className="absolute top-5 right-4 w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </button>
        ))}
      </div>

      {/* Recent Lists */}
      {wishlists.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-medium text-foreground">Listas Recentes</h2>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver todas
            </button>
          </div>
          <div className="space-y-2">
            {wishlists.map((list) => (
              <button
                key={list.id}
                onClick={() => navigate(`/lista/${list.id}`)}
                className="w-full flex items-center gap-3 rounded-xl p-4 bg-card border border-border/50 text-left transition-all hover:border-primary/30 hover:shadow-[var(--shadow-card)]"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Gift className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground truncate">{list.title}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-auto shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
