import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Gift, Calendar, EyeOff, Eye, Trash2, Pencil, ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { ReserveGiftDialog } from "@/components/reservations/ReserveGiftDialog";

const Presentes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["my-reservations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("reservations")
        .select(`
          id, visitor_name, message, expected_delivery_date, is_surprise, created_at,
          wishlist_item_id,
          wishlist_items!inner (
            id, name, image_url, price_range, wishlist_id,
            wishlists!inner ( id, title, user_id, visibility )
          )
        `)
        .eq("reserver_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const items = data || [];
      const ownerIds = [
        ...new Set(items.map((r: any) => r.wishlist_items?.wishlists?.user_id).filter(Boolean)),
      ];

      const profileMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", ownerIds);
        profiles?.forEach((p) => { profileMap[p.user_id] = p.display_name || "Pessoa"; });
      }

      return items.map((r: any) => ({
        ...r,
        owner_name: profileMap[r.wishlist_items?.wishlists?.user_id] || "Pessoa",
      }));
    },
    enabled: !!user?.id,
  });

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel("my-reservations-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, queryClient]);

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reservations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["group-items"] });
      toast.success("Reserva cancelada");
    },
    onError: () => toast.error("Erro ao cancelar reserva"),
  });

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-foreground">Meus Presentes Reservados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe e gerencie suas reservas de presentes.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          [1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />)
        ) : reservations.length === 0 ? (
          <div className="text-center py-16">
            <Gift className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              Você ainda não reservou nenhum presente.
            </p>
            <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate("/grupos")}>
              <Users className="w-4 h-4 mr-2" />
              Explorar grupos
            </Button>
          </div>
        ) : (
          reservations.map((r: any) => {
            const item = r.wishlist_items;
            const list = item?.wishlists;
            return (
              <Card key={r.id} className="rounded-2xl border-border/50 overflow-hidden">
                <div className="flex gap-4 p-4">
                  <div className="w-20 h-20 rounded-xl bg-muted/40 overflow-hidden shrink-0">
                    {item?.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gift className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-base font-medium text-foreground leading-tight line-clamp-2">
                        {item?.name}
                      </h3>
                      <Badge variant={r.is_surprise ? "secondary" : "outline"} className="shrink-0 gap-1 rounded-full text-[10px]">
                        {r.is_surprise ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {r.is_surprise ? "Surpresa" : "Visível"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      Para <span className="font-medium text-foreground">{r.owner_name}</span>
                      {list?.title && <> · {list.title}</>}
                    </p>
                    {r.expected_delivery_date && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(r.expected_delivery_date).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {item?.price_range && (
                      <span className="inline-block text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        {item.price_range}
                      </span>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline" size="sm" className="rounded-full text-xs gap-1.5 h-8"
                        onClick={() => setEditing(r)}
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="rounded-full text-xs gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/5"
                        onClick={() => setDeleting(r.id)}
                      >
                        <Trash2 className="w-3 h-3" /> Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <ReserveGiftDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        itemId={editing?.wishlist_item_id ?? null}
        itemName={editing?.wishlist_items?.name}
        reservation={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Cancelar reserva</AlertDialogTitle>
            <AlertDialogDescription>
              O item ficará novamente disponível para outras pessoas reservarem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={() => { if (deleting) cancelMutation.mutate(deleting); setDeleting(null); }}
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
