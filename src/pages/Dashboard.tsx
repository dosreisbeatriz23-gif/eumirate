import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Gift, LogOut, List } from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: wishlists = [], isLoading } = useQuery({
    queryKey: ["wishlists", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch items for all wishlists to show thumbnails & counts
  const wishlistIds = wishlists.map((w) => w.id);
  const { data: allItems = [] } = useQuery({
    queryKey: ["all-wishlist-items", wishlistIds],
    queryFn: async () => {
      if (wishlistIds.length === 0) return [];
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, name, image_url, wishlist_id")
        .in("wishlist_id", wishlistIds);
      if (error) throw error;
      return data;
    },
    enabled: wishlistIds.length > 0,
  });

  const getItemsForList = (wishlistId: string) =>
    allItems.filter((i) => i.wishlist_id === wishlistId);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-serif font-medium text-foreground">
            <span className="text-gradient">EUMIRATE</span>
          </h1>
          <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-5xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-1">
              Minhas Listas
            </h2>
            <p className="text-muted-foreground">
              {wishlists.length === 0
                ? "Crie sua primeira lista de desejos ✨"
                : `${wishlists.length} ${wishlists.length === 1 ? "lista" : "listas"}`}
            </p>
          </div>
          <Button
            onClick={() => navigate("/criar-lista")}
            className="rounded-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar Lista
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlists.map((list) => {
              const listItems = getItemsForList(list.id);
              const thumbnails = listItems
                .filter((i) => i.image_url)
                .slice(0, 4);
              return (
                <Card
                  key={list.id}
                  className="group rounded-2xl overflow-hidden hover-lift border-border/50 cursor-pointer transition-all"
                  onClick={() => navigate(`/lista/${list.id}`)}
                >
                  {/* Thumbnail grid */}
                  <div className="h-40 bg-muted/30 grid grid-cols-2 grid-rows-2 gap-px overflow-hidden">
                    {thumbnails.length > 0 ? (
                      thumbnails.map((item, idx) => (
                        <div key={item.id} className="bg-muted overflow-hidden">
                          <img
                            src={item.image_url!}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 row-span-2 flex items-center justify-center">
                        <List className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Fill remaining slots */}
                    {thumbnails.length > 0 &&
                      thumbnails.length < 4 &&
                      Array.from({ length: 4 - thumbnails.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-muted/50 flex items-center justify-center">
                          <Gift className="w-5 h-5 text-muted-foreground/20" />
                        </div>
                      ))}
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-serif font-medium text-foreground text-base mb-1 line-clamp-1">
                      {list.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {listItems.length} {listItems.length === 1 ? "item" : "itens"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default Dashboard;
