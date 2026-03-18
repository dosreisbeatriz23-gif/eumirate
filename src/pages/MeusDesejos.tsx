import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Gift,
  ExternalLink,
  Trash2,
  Share2,
  Check,
  Copy,
  ArrowRightLeft,
  LogOut,
  Loader2,
} from "lucide-react";
import { useState } from "react";

const MeusDesejos = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [targetListId, setTargetListId] = useState("");

  // Fetch user's default (first) wishlist
  const { data: wishlist, isLoading: loadingList } = useQuery({
    queryKey: ["default-wishlist", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const listId = wishlist?.id;

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["wishlist-items", listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("wishlist_id", listId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });

  // Other lists for "move" feature
  const { data: otherLists = [] } = useQuery({
    queryKey: ["other-wishlists", user?.id, listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, title")
        .eq("user_id", user!.id)
        .neq("id", listId!);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!listId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("wishlist_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items", listId] });
      toast.success("Item removido");
    },
    onError: () => toast.error("Erro ao remover item"),
  });

  const moveMutation = useMutation({
    mutationFn: async ({ itemId, newListId }: { itemId: string; newListId: string }) => {
      const { error } = await supabase
        .from("wishlist_items")
        .update({ wishlist_id: newListId })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items", listId] });
      setMoveDialogOpen(false);
      setMovingItemId(null);
      setTargetListId("");
      toast.success("Item movido!");
    },
    onError: () => toast.error("Erro ao mover item"),
  });

  const handleShare = () => {
    if (!wishlist) return;
    const url = `${window.location.origin}/compartilhado/${wishlist.share_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const isLoading = loadingList || loadingItems;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-serif font-medium text-foreground">
            <span className="text-gradient">EUMIRATE</span>
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} className="rounded-full">
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
              {copied ? "Copiado!" : "Compartilhar"}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-1">
              {wishlist?.title ?? "Meus Desejos"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "itens"}
            </p>
          </div>
          <Button
            onClick={() => navigate(`/lista/${listId}/adicionar`)}
            className="rounded-full gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Adicionar Item</span>
            <span className="sm:hidden">Adicionar</span>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <Gift className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Sua lista está vazia. Adicione seu primeiro desejo!
            </p>
            <Button
              onClick={() => navigate(`/lista/${listId}/adicionar`)}
              variant="outline"
              className="rounded-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Item
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {items.map((item) => (
              <Card
                key={item.id}
                className="group rounded-2xl overflow-hidden hover-lift border-border/50 relative"
              >
                {item.image_url ? (
                  <div className="h-40 bg-muted overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-muted/50 flex items-center justify-center">
                    <Gift className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}

                {item.is_reserved && (
                  <div className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-xs px-2.5 py-1 rounded-full">
                    Reservado
                  </div>
                )}

                <CardContent className="p-4 space-y-2">
                  <h3 className="font-serif font-medium text-foreground text-base leading-tight line-clamp-2">
                    {item.name}
                  </h3>

                  {item.price_range && (
                    <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {item.price_range}
                    </span>
                  )}

                  <div className="flex items-center gap-1 pt-1">
                    {item.external_link && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={item.external_link} target="_blank" rel="noopener noreferrer" title="Abrir link">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    {otherLists.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setMovingItemId(item.id);
                          setTargetListId("");
                          setMoveDialogOpen(true);
                        }}
                        title="Mover para outra lista"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(item.id)}
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Move dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Mover para outra lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Select value={targetListId} onValueChange={setTargetListId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a lista" />
              </SelectTrigger>
              <SelectContent>
                {otherLists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full rounded-xl"
              disabled={!targetListId || moveMutation.isPending}
              onClick={() =>
                movingItemId &&
                targetListId &&
                moveMutation.mutate({ itemId: movingItemId, newListId: targetListId })
              }
            >
              {moveMutation.isPending ? "Movendo..." : "Mover"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default MeusDesejos;
