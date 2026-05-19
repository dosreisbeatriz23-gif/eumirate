import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Gift, Loader2, Calendar, Sparkles, Package, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Reservation = {
  id: string;
  wishlist_item_id: string;
  message: string | null;
  expected_delivery_date: string | null;
  is_surprise: boolean;
  visitor_name: string | null;
  created_at: string;
};

type FilterKey = "all" | "surprise" | "normal" | "soon";

const formatDate = (d: string | null) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
};

const daysUntil = (d: string | null) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};

const Presentes = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSurprise, setEditSurprise] = useState(true);

  useEffect(() => {
    if (editing) {
      setEditName(editing.visitor_name ?? "");
      setEditMessage(editing.message ?? "");
      setEditDate(editing.expected_delivery_date ?? "");
      setEditSurprise(editing.is_surprise);
    }
  }, [editing]);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["my-reservations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("reserver_user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Reservation[];
    },
  });

  const itemIds = reservations.map((r) => r.wishlist_item_id);
  const { data: items = [] } = useQuery({
    queryKey: ["reservation-items", itemIds],
    enabled: itemIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, name, image_url, wishlist_id")
        .in("id", itemIds);
      if (error) throw error;
      return data;
    },
  });

  const wishlistIds = Array.from(new Set(items.map((i: any) => i.wishlist_id)));
  const { data: lists = [] } = useQuery({
    queryKey: ["reservation-wishlists", wishlistIds],
    enabled: wishlistIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, title, user_id")
        .in("id", wishlistIds);
      if (error) throw error;
      return data;
    },
  });

  const ownerIds = Array.from(new Set(lists.map((l: any) => l.user_id)));
  const { data: owners = [] } = useQuery({
    queryKey: ["reservation-owners", ownerIds],
    enabled: ownerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ownerIds);
      if (error) throw error;
      return data;
    },
  });

  // Find a shared group between current user and each owner (for display)
  const { data: sharedGroups = [] } = useQuery({
    queryKey: ["shared-groups", userId, ownerIds],
    enabled: !!userId && ownerIds.length > 0,
    queryFn: async () => {
      const { data: myMemberships, error: e1 } = await supabase
        .from("group_members").select("group_id").eq("user_id", userId);
      if (e1) throw e1;
      const myGroupIds = (myMemberships || []).map((m: any) => m.group_id);
      if (myGroupIds.length === 0) return [];
      const { data: otherMembers, error: e2 } = await supabase
        .from("group_members").select("group_id, user_id").in("group_id", myGroupIds).in("user_id", ownerIds);
      if (e2) throw e2;
      const groupIds = Array.from(new Set((otherMembers || []).map((m: any) => m.group_id)));
      if (groupIds.length === 0) return [] as any[];
      const { data: gs, error: e3 } = await supabase.from("groups").select("id, name").in("id", groupIds);
      if (e3) throw e3;
      return (otherMembers || []).map((m: any) => ({
        user_id: m.user_id,
        group: gs?.find((g: any) => g.id === m.group_id),
      }));
    },
  });

  const itemMap = useMemo(() => Object.fromEntries(items.map((i: any) => [i.id, i])), [items]);
  const listMap = useMemo(() => Object.fromEntries(lists.map((l: any) => [l.id, l])), [lists]);
  const ownerMap = useMemo(() => Object.fromEntries(owners.map((o: any) => [o.user_id, o])), [owners]);
  const groupByOwner = useMemo(() => {
    const m: Record<string, { id: string; name: string }> = {};
    (sharedGroups as any[]).forEach((s) => { if (s.group && !m[s.user_id]) m[s.user_id] = s.group; });
    return m;
  }, [sharedGroups]);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (filter === "surprise") return r.is_surprise;
      if (filter === "normal") return !r.is_surprise;
      if (filter === "soon") {
        const d = daysUntil(r.expected_delivery_date);
        return d !== null && d >= 0 && d <= 7;
      }
      return true;
    });
  }, [reservations, filter]);

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reserva cancelada");
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
      setCancelingId(null);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao cancelar"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("reservations").update({
        visitor_name: editName.trim() || null,
        message: editMessage.trim() || null,
        expected_delivery_date: editDate || null,
        is_surprise: editSurprise,
      }).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reserva atualizada");
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "surprise", label: "Surpresa" },
    { key: "normal", label: "Normais" },
    { key: "soon", label: "Entrega próxima" },
  ];

  return (
    <div className="container mx-auto px-5 md:px-8 py-8 md:py-12 max-w-6xl overflow-x-hidden">
      <header className="mb-8 md:mb-10">
        <h1 className="title-gliker tracking-tight text-3xl sm:text-4xl md:text-5xl">
          Presentes Reservados
        </h1>
        <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
          Acompanhe os presentes reservados dentro dos grupos. Itens reservados ajudam a evitar presentes repetidos e tornam a experiência mais organizada.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-foreground/70 border-border hover:border-primary/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 px-6 rounded-2xl bg-card/60 border border-border/50">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Gift className="w-7 h-7 text-primary" />
          </div>
          <p className="text-foreground/80 mb-1 font-medium">
            {reservations.length === 0
              ? "Você ainda não reservou nenhum presente."
              : "Nenhum presente neste filtro."}
          </p>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Encontre presentes incríveis nas listas públicas dos seus grupos.
          </p>
          <Button onClick={() => navigate("/grupos")} className="rounded-full">
            Explorar listas públicas
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => {
            const item = itemMap[r.wishlist_item_id];
            const list = item ? listMap[item.wishlist_id] : null;
            const owner = list ? ownerMap[list.user_id] : null;
            const group = list ? groupByOwner[list.user_id] : null;
            const days = daysUntil(r.expected_delivery_date);
            const soon = days !== null && days >= 0 && days <= 7;

            return (
              <article
                key={r.id}
                className="group rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-elevated transition-all overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {item?.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary text-primary-foreground shadow">
                      Reservado
                    </span>
                    {r.is_surprise && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/90 text-foreground inline-flex items-center gap-1 shadow">
                        <Sparkles className="w-3 h-3" /> Surpresa
                      </span>
                    )}
                    {soon && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-100 text-amber-900 shadow">
                        Entrega próxima
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-medium text-foreground leading-snug line-clamp-2">
                    {item?.name ?? "Item"}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {owner && (
                      <p>Para <span className="text-foreground/80 font-medium">{owner.display_name}</span></p>
                    )}
                    {list && <p className="truncate">Lista: {list.title}</p>}
                    {group && <p className="truncate">Grupo: {group.name}</p>}
                    {r.expected_delivery_date && (
                      <p className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(r.expected_delivery_date)}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={() => setEditing(r)}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setCancelingId(r.id)}
                    >
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-gliker uppercase tracking-tight text-[#54280D]">
              Editar Reserva
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="visitor_name">Quem vai presentear</Label>
              <Input id="visitor_name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea id="message" value={editMessage} onChange={(e) => setEditMessage(e.target.value)} placeholder="Mensagem opcional" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data prevista</Label>
              <Input id="date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <Label className="font-medium">Modo surpresa</Label>
                <p className="text-xs text-muted-foreground">Esconde a reserva do dono da lista</p>
              </div>
              <Switch checked={editSurprise} onCheckedChange={setEditSurprise} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-full">Cancelar</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="rounded-full">
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm */}
      <AlertDialog open={!!cancelingId} onOpenChange={(o) => !o && setCancelingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente cancelar esta reserva? O item voltará a ficar disponível na lista original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelingId && cancelMutation.mutate(cancelingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Presentes;
