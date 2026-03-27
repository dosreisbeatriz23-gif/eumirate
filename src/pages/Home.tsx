import { useNavigate } from "react-router-dom";
import { useLocalUser } from "@/hooks/useLocalUser";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, Sparkles, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const Home = () => {
  const navigate = useNavigate();
  const { userId } = useLocalUser();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["all-items-mural", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, name, image_url, created_at, wishlist_id")
        .in(
          "wishlist_id",
          (
            await supabase
              .from("wishlists")
              .select("id")
              .eq("user_id", userId)
          ).data?.map((w) => w.id) ?? []
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container mx-auto px-3 md:px-6 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground tracking-wide uppercase">
            MURAL DE INSPIRAÇÃO
          </h1>
          <p className="text-sm sm:text-base font-medium text-muted-foreground tracking-widest uppercase mt-0.5">
            MEUS DESEJOS
          </p>
        </div>
        <Button
          onClick={() => navigate("/adicionar")}
          className="rounded-full gap-2 shadow-md"
        >
          <PlusCircle className="w-4 h-4" />
          Adicionar Item
        </Button>
      </div>

      {/* Pinterest Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-muted animate-pulse"
              style={{ height: `${140 + Math.random() * 80}px` }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <ImageOff className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-1">
            Seu mural está vazio
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Adicione itens às suas listas para vê-los aqui como inspiração
          </p>
          <Button
            onClick={() => navigate("/adicionar")}
            variant="outline"
            className="rounded-full gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Adicionar primeiro item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="group flex flex-col rounded-2xl overflow-hidden bg-card border border-border/40 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              {item.image_url ? (
                <div className="w-full aspect-square overflow-hidden bg-muted">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-muted/50">
                  <span className="text-xs text-muted-foreground font-medium px-3 text-center leading-snug">
                    {item.name}
                  </span>
                </div>
              )}
              <p className="px-3 py-2 text-xs font-medium text-foreground truncate text-center">
                {item.name}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
