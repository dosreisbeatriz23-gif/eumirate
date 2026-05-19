import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Gift, Lock, Globe, List, Loader2, Trash2, Check } from "lucide-react";
import { useState } from "react";

const MeusDesejos = () => {
  const { user } = useAuth();
  const userId = user?.id;
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
        .select("id, user_id, title, description, visibility, created_at, updated_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const wishlistIds = wishlists.map((w) => w.id);
  const { data: allItems = [] } = useQuery({
    queryKey: ["all-items-count", wishlistIds],
    queryFn: async () => {
      if (wishlistIds.length === 0) return [];
      const { data, error } = await supabase
        .from("wishlist_items").select("id, wishlist_id, image_url").in("wishlist_id", wishlistIds);
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
        title: newTitle.trim() || (createVisibility === "private" ? "Minha Lista Pessoal" : "Presentes Que Quero Ganhar"),
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

  const openCreate = () => {
    setCreateVisibility("private");
    setNewTitle("");
    setCreateOpen(true);
  };

  const getItemCount = (id: string) => allItems.filter((i) => i.wishlist_id === id).length;
  const getThumbnail = (id: string) => allItems.find((i) => i.wishlist_id === id && i.image_url)?.image_url;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  const ListCard = ({ list, isPublic }: { list: typeof wishlists[0]; isPublic: boolean }) => {
    const count = getItemCount(list.id);
    const thumb = getThumbnail(list.id);
    return (
      <div
        className="group premium-card cursor-pointer relative transition-all duration-300 hover:shadow-elevated"
        onClick={() => navigate(`/lista/${list.id}`)}
      >
        <div className={`absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm ${
          isPublic ? "bg-primary/90 text-primary-foreground" : "bg-background/90 text-foreground border border-border/50"
        }`}>
          {isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
          {isPublic ? "Pública" : "Privada"}
        </div>
        <div className="h-32 bg-muted/20 overflow-hidden flex items-center justify-center">
          {thumb ? (
            <img src={thumb} alt={list.title} className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" loading="lazy" />
          ) : (
            <List className="w-8 h-8 text-muted-foreground/15" />
          )}
        </div>
        <div className="p-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <h4 className="font-serif text-foreground text-sm line-clamp-1">{list.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{count} {count === 1 ? "item" : "itens"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-300"
            onClick={(e) => { e.stopPropagation(); setDeletingListId(list.id); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ icon: Icon, title, subtitle, accent }: any) => (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/30">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-xl sm:text-2xl font-serif text-foreground tracking-tight">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );

  const EmptyState = ({ icon: Icon, text, onAction, actionText }: any) => (
    <div className="text-center py-14 border border-dashed border-border/40 rounded-2xl bg-muted/10">
      <Icon className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground mb-4">{text}</p>
      <Button variant="outline" size="sm" className="rounded-full text-xs border-border/40" onClick={onAction}>
        {actionText}
      </Button>
    </div>
  );

  const openCreateWith = (vis: "private" | "public") => {
    setCreateVisibility(vis);
    setNewTitle("");
    setCreateOpen(true);
  };

  return (
    <div className="page-enter">
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 max-w-6xl space-y-12">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="sm:text-4xl title-gliker tracking-tight text-3xl">Minhas Listas</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Organize seus desejos em listas privadas e públicas</p>
          </div>
          <Button
            onClick={openCreate}
            className="rounded-full gap-2 h-11 px-5 shadow-elevated"
          >
            <Plus className="w-4 h-4" />
            Nova lista
          </Button>
        </div>

        <section>
          <SectionHeader
            icon={Lock}
            title="Minha Lista Pessoal"
            subtitle="Somente você pode visualizar"
            accent="bg-muted/60 text-muted-foreground"
          />
          {privateLists.length === 0 ? (
            <EmptyState icon={Gift} text="Você ainda não criou nenhuma lista pessoal" onAction={() => openCreateWith("private")} actionText="Criar primeira lista" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {privateLists.map((l) => <ListCard key={l.id} list={l} isPublic={false} />)}
            </div>
          )}
        </section>

        <section>
          <SectionHeader
            icon={Globe}
            title="Presentes Que Quero Ganhar"
            subtitle="Membros dos seus grupos podem visualizar"
            accent="bg-primary/10 text-primary"
          />
          {publicLists.length === 0 ? (
            <EmptyState icon={Globe} text="Nenhuma lista pública criada ainda" onAction={() => openCreateWith("public")} actionText="Criar lista para amigos" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {publicLists.map((l) => <ListCard key={l.id} list={l} isPublic={true} />)}
            </div>
          )}
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Nova lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {([
                { v: "private", icon: Lock, label: "Privada", desc: "Só você vê" },
                { v: "public", icon: Globe, label: "Pública", desc: "Visível aos grupos" },
              ] as const).map(({ v, icon: Icon, label, desc }) => {
                const active = createVisibility === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCreateVisibility(v)}
                    className={`relative rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 hover:border-border bg-background"
                    }`}
                  >
                    {active && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <Icon className={`w-5 h-5 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-sm font-medium text-foreground">{label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
                  </button>
                );
              })}
            </div>

            <Input
                placeholder={createVisibility === "private" ? "Ex: Minha Lista Pessoal" : "Ex: Presentes Que Quero Ganhar"}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={100}
              autoFocus
              className="h-12 rounded-xl"
            />

            <Button
              className="w-full h-12 rounded-xl font-medium"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Criando..." : "Criar Lista"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingListId} onOpenChange={(open) => !open && setDeletingListId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Remover lista</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta lista e todos os seus itens? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={() => { if (deletingListId) deleteMutation.mutate(deletingListId); setDeletingListId(null); }}
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
