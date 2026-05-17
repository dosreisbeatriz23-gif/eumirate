import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Lock, Users, Gift, Trash2, Calendar, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ReserveGiftDialog } from "@/components/reservations/ReserveGiftDialog";

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [showReserve, setShowReserve] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("wishlist_items").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
      queryClient.invalidateQueries({ queryKey: ["all-items"] });
      toast.success("Item removido");
      navigate(-1);
    },
    onError: () => toast.error("Erro ao remover item"),
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ["item-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*, wishlists!inner(user_id, title, visibility)")
        .eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Reservation visible to: the reserver (their own) OR list owner (if not surprise).
  // RLS already filters; we just fetch whatever the user is allowed to see.
  const { data: reservation } = useQuery({
    queryKey: ["item-reservation", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reservations")
        .select("id, visitor_name, message, expected_delivery_date, is_surprise, reserver_user_id")
        .eq("wishlist_item_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center page-enter">
        <div className="w-full max-w-lg px-5 pt-16 space-y-6 animate-pulse">
          <div className="w-full aspect-square rounded-2xl bg-muted/30" />
          <div className="space-y-3">
            <div className="h-7 w-48 bg-muted/40 rounded-lg" />
            <div className="h-5 w-28 bg-muted/30 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Gift className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Item não encontrado</p>
          <Button variant="outline" onClick={() => navigate("/home")} className="rounded-full">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const isPrivate = item.visibility === "private";
  const ownerId = (item as any).wishlists?.user_id;
  const listIsPublic = (item as any).wishlists?.visibility === "public";
  const isOwner = ownerId === user?.id;
  const isReserver = reservation?.reserver_user_id === user?.id;
  const canReserve = listIsPublic && !isOwner && !item.is_reserved;

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      {/* Fixed back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-20 w-10 h-10 rounded-full bg-card/80 backdrop-blur-xl border border-border/40 shadow-card flex items-center justify-center text-foreground hover:bg-card transition-all duration-300"
      >
        <ArrowLeft className="w-[18px] h-[18px]" />
      </button>

      {/* Content container */}
      <div className="flex-1 flex flex-col items-center w-full">
        {/* Image section */}
        <div className="w-full max-w-lg px-5 pt-16 pb-2">
          <div className={`w-full aspect-square rounded-2xl overflow-hidden bg-muted/10 border border-border/20 shadow-card ${item.is_reserved ? "grayscale-[30%]" : ""}`}>
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gift className="w-16 h-16 text-muted-foreground/15" />
              </div>
            )}
          </div>
        </div>

        {/* Details section */}
        <div className="w-full max-w-lg px-5 py-6 space-y-5">
          <h1 className="text-xl sm:text-2xl font-serif text-foreground leading-snug">
            {item.name}
          </h1>

          <div className="flex items-center gap-3 flex-wrap">
            {item.price_range && (
              <span className="text-lg font-semibold text-foreground tracking-tight">
                {item.price_range}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full ${
                isPrivate ? "bg-muted/50 text-muted-foreground" : "bg-primary/10 text-primary"
              }`}
            >
              {isPrivate ? <Lock className="w-3 h-3" /> : <Users className="w-3 h-3" />}
              {isPrivate ? "Privado" : "Público"}
            </span>
            {item.is_reserved && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground border border-border/40">
                <Gift className="w-3 h-3" /> Reservado
              </span>
            )}
          </div>

          {/* Reservation details (owner non-surprise, or reserver themself) */}
          {item.is_reserved && (
            <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-2.5">
              {isOwner && reservation && !reservation.is_surprise && (
                <>
                  <p className="text-sm font-medium text-foreground">Reservado por {reservation.visitor_name || "alguém"}</p>
                  {reservation.message && (
                    <p className="text-sm text-muted-foreground italic">"{reservation.message}"</p>
                  )}
                  {reservation.expected_delivery_date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Entrega prevista: {new Date(reservation.expected_delivery_date).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </>
              )}
              {isOwner && (!reservation || reservation.is_surprise) && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <EyeOff className="w-4 h-4" />
                  Este item foi reservado.
                </p>
              )}
              {isReserver && reservation && (
                <>
                  <p className="text-sm font-medium text-foreground">Você reservou este presente</p>
                  {reservation.expected_delivery_date && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(reservation.expected_delivery_date).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => setShowReserve(true)}>
                      Editar reserva
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="rounded-full text-xs text-destructive hover:text-destructive hover:bg-destructive/5"
                      onClick={async () => {
                        const { error } = await supabase.from("reservations").delete().eq("id", reservation.id);
                        if (error) toast.error("Erro ao cancelar"); else {
                          toast.success("Reserva cancelada");
                          queryClient.invalidateQueries({ queryKey: ["item-reservation", id] });
                          queryClient.invalidateQueries({ queryKey: ["item-detail", id] });
                        }
                      }}
                    >
                      Cancelar reserva
                    </Button>
                  </div>
                </>
              )}
              {!isOwner && !isReserver && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Gift className="w-4 h-4" /> Este item já foi reservado
                </p>
              )}
            </div>
          )}

          <div className="space-y-3 pt-1">
            {canReserve && (
              <Button
                onClick={() => setShowReserve(true)}
                className="w-full h-12 rounded-2xl gap-2.5 text-[15px] font-medium shadow-card hover:shadow-medium transition-all duration-300"
              >
                <Gift className="w-4 h-4" />
                Reservar Presente
              </Button>
            )}

            {item.external_link && (
              <a href={item.external_link} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant={canReserve ? "outline" : "default"} className="w-full h-12 rounded-2xl gap-2.5 text-[15px] font-medium shadow-card hover:shadow-medium transition-all duration-300">
                  <ExternalLink className="w-4 h-4" />
                  Ver na loja
                </Button>
              </a>
            )}

            {isOwner && (
              <Button
                variant="ghost"
                className="w-full h-11 rounded-2xl gap-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-300"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="w-4 h-4" />
                Remover item
              </Button>
            )}
          </div>
        </div>
      </div>

      <ReserveGiftDialog
        open={showReserve}
        onOpenChange={setShowReserve}
        itemId={item.id}
        itemName={item.name}
        reservation={isReserver ? (reservation as any) : null}
      />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Remover item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este item? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={() => deleteMutation.mutate()}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ItemDetail;
