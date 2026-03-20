import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocalUser } from "@/hooks/useLocalUser";
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
  ArrowRightLeft,
  Loader2,
  Lock,
  Users,
} from "lucide-react";
import { useState } from "react";

interface WishlistItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_range: string | null;
  external_link: string | null;
  is_reserved: boolean;
  visibility: string;
  wishlist_id: string;
  created_at: string;
  updated_at: string;
  priority: string | null;
}

const ItemCard = ({
  item,
  onDelete,
  onMove,
  showMoveButton,
}: {
  item: WishlistItem;
  onDelete: (id: string) => void;
  onMove: (id: string) => void;
  showMoveButton: boolean;
}) => (
  <Card className="group rounded-2xl overflow-hidden border-border/50 hover:shadow-[var(--shadow-medium)] transition-all duration-300 relative">
    {item.image_url ? (
      <div className="h-44 bg-muted overflow-hidden">
        <img
          src={item.image_url}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
    ) : (
      <div className="h-44 bg-muted/30 flex items-center justify-center">
        <Gift className="w-10 h-10 text-muted-foreground/20" />
      </div>
    )}

    {item.is_reserved && (
      <div className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-xs px-2.5 py-1 rounded-full font-medium">
        Reservado
      </div>
    )}

    <CardContent className="p-4 space-y-2">
      <h3 className="font-serif font-medium text-foreground text-base leading-tight line-clamp-2">
        {item.name}
      </h3>
      {item.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
      )}
      {item.price_range && (
        <span className="inline-block text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
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
        {showMoveButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove(item.id)}
            title="Mover para outra lista"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onDelete(item.id)}
          title="Remover"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

const MeusDesejos = () => {
  const { userId } = useLocalUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [targetListId, setTargetListId] = useState("");

  // Fetch default wishlist (first one, "Meu Wishlist Geral")
  const { data: wishlist, isLoading: loadingList } = useQuery({
    queryKey: ["default-wishlist", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
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
      return data as WishlistItem[];
    },
    enabled: !!listId,
  });

  const { data: otherLists = [] } = useQuery({
    queryKey: ["other-wishlists", userId, listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, title")
        .eq("user_id", userId)
        .neq("id", listId!);
      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });

  const privateItems = items.filter((i) => i.visibility === "private");
  const groupItems = items.filter((i) => i.visibility === "group");

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("wishlist_items").delete().eq("id", itemId);
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <Gift className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div>
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-1">
              Meu Wishlist Geral
            </h2>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "itens"} no total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} className="rounded-full">
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Share2 className="w-4 h-4 mr-1" />}
              {copied ? "Copiado!" : "Compartilhar"}
            </Button>
            <Button
              onClick={() => navigate(`/lista/${listId}/adicionar`)}
              className="rounded-full gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Adicionar</span>
            </Button>
          </div>
        </div>

        {/* Desejos Privados */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-medium text-foreground">Desejos Privados</h3>
              <p className="text-xs text-muted-foreground">Apenas você pode ver</p>
            </div>
          </div>

          {privateItems.length === 0 ? (
            <EmptyState message="Nenhum desejo privado ainda. Adicione itens que só você quer ver." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {privateItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onMove={(id) => {
                    setMovingItemId(id);
                    setTargetListId("");
                    setMoveDialogOpen(true);
                  }}
                  showMoveButton={otherLists.length > 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* Presentes Que Quero Ganhar */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-medium text-foreground">Presentes Que Quero Ganhar</h3>
              <p className="text-xs text-muted-foreground">Visível para seus grupos</p>
            </div>
          </div>

          {groupItems.length === 0 ? (
            <EmptyState message="Nenhum presente compartilhado. Adicione itens que seus amigos e família podem ver." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {groupItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onMove={(id) => {
                    setMovingItemId(id);
                    setTargetListId("");
                    setMoveDialogOpen(true);
                  }}
                  showMoveButton={otherLists.length > 0}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Move Dialog */}
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
    </div>
  );
};

export default MeusDesejos;
