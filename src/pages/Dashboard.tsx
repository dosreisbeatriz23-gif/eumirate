import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Gift, List } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();

  const { data: wishlists = [], isLoading } = useQuery({
    queryKey: ["wishlists", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, user_id, title, description, visibility, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
    <div>
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-10 max-w-5xl">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl title-gliker mb-1">
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
              const thumbnails = listItems.filter((i) => i.image_url).slice(0, 4);
              return (
                <Card
                  key={list.id}
                  className="group rounded-2xl overflow-hidden hover-lift border-border/50 cursor-pointer transition-all"
                  onClick={() => navigate(`/lista/${list.id}`)}
                >
                  <div className="h-40 bg-muted/30 grid grid-cols-2 grid-rows-2 gap-px overflow-hidden">
                    {thumbnails.length > 0 ? (
                      thumbnails.map((item) => (
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
    </div>
  );
};

export default Dashboard;
