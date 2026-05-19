import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

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
    <div className="container mx-auto px-5 md:px-8 py-8 md:py-12 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-10">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl title-gliker tracking-tight">
            Mural de Inspiração
          </h1>
          <p className="text-xs sm:text-sm font-medium tracking-widest uppercase mt-2 flex items-center gap-2">
            <span className="inline-block w-5 h-0.5 bg-primary rounded-full" />
            <span className="text-primary">Meus Desejos</span>
            <span className="inline-block w-5 h-0.5 bg-primary rounded-full" />
          </p>
        </div>
        <Button
          onClick={() => navigate("/adicionar")}
          className="w-full sm:w-auto inline-flex justify-center rounded-full gap-2.5 h-11 px-6 shadow-card hover:shadow-medium transition-shadow duration-300 text-[13px] font-medium"
        >
          <PlusCircle className="w-4 h-4" />
          Adicionar Item
        </Button>
      </div>

      {/* Pinterest Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-muted/50 animate-pulse"
              style={{ height: `${160 + Math.random() * 60}px`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-5">
            <ImageOff className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-serif text-foreground mb-1.5">
            Seu mural está vazio
          </h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-xs leading-relaxed">
            Adicione itens às suas listas para vê-los aqui como inspiração
          </p>
          <Button
            onClick={() => navigate("/adicionar")}
            variant="outline"
            className="rounded-full gap-2.5 h-11 px-6 border-border/60 hover:bg-muted/50 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Adicionar primeiro item
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => navigate(`/item/${item.id}`)}
              className="group flex flex-col rounded-2xl overflow-hidden bg-card border border-border/20 shadow-soft transition-all duration-500 hover:shadow-medium hover:border-border/40 active:scale-[0.98]"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {item.image_url ? (
                <div className="w-full aspect-square overflow-hidden bg-muted/30">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-muted/20">
                  <span className="text-xs text-muted-foreground/60 font-medium px-4 text-center leading-relaxed">
                    {item.name}
                  </span>
                </div>
              )}
              <div className="px-3 py-3">
                <p className="text-[13px] font-medium text-foreground/80 truncate text-center leading-tight">
                  {item.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
