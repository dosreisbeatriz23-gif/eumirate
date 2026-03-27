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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plus,
  Gift,
  Lock,
  Globe,
  List,
  Loader2,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const MeusDesejos = () => {
  const { userId } = useLocalUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [createVisibility, setCreateVisibility] = useState<"private" | "public">("private");
  const [newTitle, setNewTitle] = useState("");

  const { data: wishlists = [], isLoading } = useQuery({
    queryKey: ["wishlists", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Count items per wishlist
  const wishlistIds = wishlists.map((w) => w.id);
  const { data: allItems = [] } = useQuery({
    queryKey: ["all-items-count", wishlistIds],
    queryFn: async () => {
      if (wishlistIds.length === 0) return [];
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, wishlist_id, image_url")
        .in("wishlist_id", wishlistIds);
      if (error) throw error;
      return data;
    },
    enabled: wishlistIds.length > 0,
  });

  const privateLists = wishlists.filter((w) => (w as any).visibility !== "public");
  const publicLists = wishlists.filter((w) => (w as any).visibility === "public");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("wishlists").insert({
        user_id: userId,
        title: newTitle.trim() || (createVisibility === "private" ? "Meus Desejos" : "Ideias de Presentes"),
        visibility: createVisibility,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlists"] });
      setCreateOpen(false);
      setNewTitle("");
      toast.success("Lista criada!");
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao criar lista"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase.from("wishlists").delete().eq("id", listId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlists"] });
      toast.success("Lista removida");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const openCreate = (vis: "private" | "public") => {
    setCreateVisibility(vis);
    setNewTitle("");
    setCreateOpen(true);
  };

  const getItemCount = (id: string) => allItems.filter((i) => i.wishlist_id === id).length;
  const getThumbnail = (id: string) => allItems.find((i) => i.wishlist_id === id && i.image_url)?.image_url;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ListCard = ({ list }: { list: typeof wishlists[0] }) => {
    const count = getItemCount(list.id);
    const thumb = getThumbnail(list.id);
    return (
      <Card
        className="group rounded-2xl overflow-hidden border-border/50 hover:shadow-[var(--shadow-medium)] transition-all cursor-pointer"
        onClick={() => navigate(`/lista/${list.id}`)}
      >
        <div className="h-28 bg-muted/30 overflow-hidden flex items-center justify-center">
          {thumb ? (
            <img src={thumb} alt={list.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          ) : (
            <List className="w-8 h-8 text-muted-foreground/20" />
          )}
        </div>
        <CardContent className="p-3 flex items-center justify-between">
          <div className="min-w-0">
            <h4 className="font-serif font-medium text-foreground text-sm line-clamp-1">{list.title}</h4>
            <p className="text-xs text-muted-foreground">{count} {count === 1 ? "item" : "itens"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setDeletingListId(list.id); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-5xl space-y-10">
        {/* Header */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground mb-1">Minhas Listas</h2>
          <p className="text-sm text-muted-foreground">Organize seus desejos em listas privadas e públicas</p>
        </div>

        {/* Privadas */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-foreground">Meus Desejos</h3>
                <p className="text-xs text-muted-foreground">Somente você pode ver</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5" onClick={() => openCreate("private")}>
              <Plus className="w-3.5 h-3.5" /> Nova Lista
            </Button>
          </div>

          {privateLists.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-2xl">
              <Gift className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Nenhuma lista privada</p>
              <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => openCreate("private")}>
                Criar primeira lista
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {privateLists.map((l) => <ListCard key={l.id} list={l} />)}
            </div>
          )}
        </section>

        {/* Públicas */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-medium text-foreground">Ideias de Presentes</h3>
                <p className="text-xs text-muted-foreground">Visível para amigos e grupos</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5" onClick={() => openCreate("public")}>
              <Plus className="w-3.5 h-3.5" /> Nova Lista
            </Button>
          </div>

          {publicLists.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-2xl">
              <Globe className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Nenhuma lista pública</p>
              <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => openCreate("public")}>
                Criar lista para amigos
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {publicLists.map((l) => <ListCard key={l.id} list={l} />)}
            </div>
          )}
        </section>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {createVisibility === "private" ? "Nova Lista Privada" : "Nova Lista Pública"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              placeholder={createVisibility === "private" ? "Ex: Aniversário 2026" : "Ex: Presentes para amigos"}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {createVisibility === "private"
                ? "Apenas você poderá ver os itens desta lista."
                : "Amigos e membros dos seus grupos poderão ver esta lista."}
            </p>
            <Button
              className="w-full rounded-xl"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Criando..." : "Criar Lista"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingListId} onOpenChange={(open) => !open && setDeletingListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Remover lista</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta lista e todos os seus itens? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingListId) deleteMutation.mutate(deletingListId);
                setDeletingListId(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MeusDesejos;
