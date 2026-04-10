import { useState } from "react";
import { handleCurrencyChange } from "@/lib/currency";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  LogOut,
  Link as LinkIcon,
  Trash2,
  Pencil,
  Share2,
  ExternalLink,
  Check,
  Copy,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type WishlistItem = Tables<"wishlist_items">;

const emptyForm = {
  name: "",
  description: "",
  price_range: "",
  external_link: "",
  image_url: "",
  priority: "média",
};

const MinhaLista = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [shareUrl, setShareUrl] = useState("");
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch wishlist
  const { data: wishlist } = useQuery({
    queryKey: ["wishlist", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wishlist-items", wishlist?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("wishlist_id", wishlist!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!wishlist,
  });

  // Add item
  const addMutation = useMutation({
    mutationFn: async (item: typeof emptyForm) => {
      const { error } = await supabase.from("wishlist_items").insert({
        wishlist_id: wishlist!.id,
        name: item.name.trim(),
        description: item.description.trim() || null,
        price_range: item.price_range || null,
        external_link: item.external_link.trim() || null,
        image_url: item.image_url.trim() || null,
        priority: item.priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
      toast.success("Item adicionado!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao adicionar item"),
  });

  // Update item
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: { id: string } & typeof emptyForm) => {
      const { error } = await supabase
        .from("wishlist_items")
        .update({
          name: item.name.trim(),
          description: item.description.trim() || null,
          price_range: item.price_range || null,
          external_link: item.external_link.trim() || null,
          image_url: item.image_url.trim() || null,
          priority: item.priority,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
      toast.success("Item atualizado!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao atualizar item"),
  });

  // Delete item
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
      toast.success("Item removido");
    },
    onError: () => toast.error("Erro ao remover item"),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  };

  const openEdit = (item: WishlistItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price_range: item.price_range ?? "",
      external_link: item.external_link ?? "",
      image_url: item.image_url ?? "",
      priority: item.priority ?? "média",
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...form });
    } else {
      addMutation.mutate(form);
    }
  };

  const handleShare = () => {
    if (!wishlist) return;
    const url = `${window.location.origin}/lista/${wishlist.share_token}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const priorityLabel: Record<string, string> = {
    alta: "Alta",
    média: "Média",
    baixa: "Baixa",
  };

  const priorityColor: Record<string, string> = {
    alta: "bg-primary/20 text-primary",
    média: "bg-accent text-accent-foreground",
    baixa: "bg-secondary text-secondary-foreground",
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-serif font-medium text-foreground">
            <span className="text-gradient">EUMIRATE</span>
          </h1>
          <div className="flex items-center gap-3">
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

      <div className="container mx-auto px-6 py-10 max-w-4xl">
        {/* Title area */}
        <div className="mb-10">
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-2">
            Minha Lista de Desejos
          </h2>
          <p className="text-muted-foreground">
            {items.length === 0
              ? "Adicione seu primeiro desejo ✨"
              : `${items.length} ${items.length === 1 ? "item" : "itens"} na sua lista`}
          </p>
        </div>

        {/* Items Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Add Item Card */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else { setForm(emptyForm); setEditingItem(null); } setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <button className="group h-64 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 flex flex-col items-center justify-center gap-3 transition-all hover-lift cursor-pointer bg-transparent">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors font-sans">
                    Adicionar item
                  </span>
                </button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-serif">
                    {editingItem ? "Editar item" : "Novo desejo"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block font-sans">Nome *</label>
                    <Input
                      placeholder="Ex: Fone de ouvido Sony"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block font-sans">Descrição</label>
                    <Textarea
                      placeholder="Detalhes sobre o que você quer"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      maxLength={500}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block font-sans">Faixa de preço</label>
                      <Input
                        placeholder="R$ 0,00"
                        value={form.price_range}
                        onChange={(e) => handleCurrencyChange(e.target.value, (v) => setForm({ ...form, price_range: v }))}
                        inputMode="numeric"
                        maxLength={20}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block font-sans">Prioridade</label>
                      <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="média">Média</SelectItem>
                          <SelectItem value="baixa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block font-sans">Link externo</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="https://..."
                        value={form.external_link}
                        onChange={(e) => setForm({ ...form, external_link: e.target.value })}
                        className="pl-9"
                        maxLength={500}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block font-sans">URL da imagem</label>
                    <Input
                      placeholder="https://...imagem.jpg"
                      value={form.image_url}
                      onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                      maxLength={500}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full rounded-xl"
                    disabled={addMutation.isPending || updateMutation.isPending}
                  >
                    {editingItem ? "Salvar alterações" : "Adicionar à lista"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Item Cards */}
            {items.map((item) => (
              <Card key={item.id} className="group rounded-2xl overflow-hidden hover-lift border-border/50 relative cursor-pointer" onClick={() => navigate(`/item/${item.id}`)}>
                {/* Image */}
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

                {/* Reserved badge */}
                {item.is_reserved && (
                  <div className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-xs px-2.5 py-1 rounded-full font-sans">
                    Reservado
                  </div>
                )}

                <CardContent className="p-4 space-y-2">
                  <h3 className="font-serif font-medium text-foreground text-base leading-tight line-clamp-2">
                    {item.name}
                  </h3>

                  <div className="flex items-center gap-2 flex-wrap">
                    {item.price_range && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {item.price_range}
                      </span>
                    )}
                    {item.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor[item.priority] ?? "bg-muted text-muted-foreground"}`}>
                        {priorityLabel[item.priority] ?? item.priority}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-1">
                    {item.external_link && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <a href={item.external_link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeletingItemId(item.id); }}
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

      <AlertDialog open={!!deletingItemId} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Remover item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este item? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingItemId) deleteMutation.mutate(deletingItemId);
                setDeletingItemId(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default MinhaLista;
