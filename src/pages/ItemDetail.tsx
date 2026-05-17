import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Lock, Users, Gift, Trash2, CalendarIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [message, setMessage] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [isSurprise, setIsSurprise] = useState(true);

  const { data: item, isLoading } = useQuery({
    queryKey: ["item-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: wishlist } = useQuery({
    queryKey: ["item-wishlist", item?.wishlist_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists").select("id, user_id, visibility, title").eq("id", item!.wishlist_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!item?.wishlist_id,
  });

  const { data: ownerProfile } = useQuery({
    queryKey: ["item-owner", wishlist?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles").select("display_name").eq("user_id", wishlist!.user_id).maybeSingle();
      return data;
    },
    enabled: !!wishlist?.user_id,
  });

  // Realtime: refresh on row change
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`item-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wishlist_items", filter: `id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: ["item-detail", id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, queryClient]);

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

  const reserveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("reserve_gift", {
        p_item_id: id!,
        p_message: message || null,
        p_expected_delivery_date: deliveryDate ? format(deliveryDate, "yyyy-MM-dd") : null,
        p_is_surprise: isSurprise,
        p_visitor_name: visitorName || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["group-items"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      toast.success("Presente reservado com sucesso!");
      setReserveOpen(false);
      setMessage(""); setVisitorName(""); setDeliveryDate(undefined); setIsSurprise(true);
    },
    onError: (e: unknown) => {
      const err = e as { message?: string };
      toast.error(err?.message || "Não foi possível reservar este presente");
    },
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
  const isOwner = !!user && !!wishlist && wishlist.user_id === user.id;
  const itemIsShared = item.visibility === "public" || item.visibility === "group";
  const canReserve = !!user && !isOwner && itemIsShared && !item.is_reserved;

  return (
    <div className="min-h-screen bg-background flex flex-col page-enter">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-20 w-10 h-10 rounded-full bg-card/80 backdrop-blur-xl border border-border/40 shadow-card flex items-center justify-center text-foreground hover:bg-card transition-all duration-300"
      >
        <ArrowLeft className="w-[18px] h-[18px]" />
      </button>

      <div className="flex-1 flex flex-col items-center w-full">
        <div className="w-full max-w-lg px-5 pt-16 pb-2">
          <div className={cn(
            "relative w-full aspect-square rounded-2xl overflow-hidden bg-muted/10 border border-border/20 shadow-card transition-all",
            item.is_reserved && "opacity-80"
          )}>
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className={cn(
                "w-full h-full object-cover transition-all",
                item.is_reserved && "grayscale-[40%]"
              )} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gift className="w-16 h-16 text-muted-foreground/15" />
              </div>
            )}
            {item.is_reserved && (
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[11px] font-semibold tracking-wider px-3 py-1.5 rounded-full shadow-medium">
                RESERVADO
              </div>
            )}
          </div>
        </div>

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
          </div>

          {item.is_reserved && (
            <div className="flex items-center gap-2.5 text-sm text-primary bg-primary/5 border border-primary/15 px-4 py-3 rounded-2xl">
              <Gift className="w-4 h-4 shrink-0" />
              Este item já foi reservado.
            </div>
          )}

          <div className="space-y-3 pt-1">
            {item.external_link && (
              <a href={item.external_link} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" className="w-full h-12 rounded-2xl gap-2.5 text-[15px]">
                  <ExternalLink className="w-4 h-4" />
                  Ver na loja
                </Button>
              </a>
            )}

            {canReserve && (
              <Button
                className="w-full h-12 rounded-2xl gap-2.5 text-[15px] font-medium shadow-card hover:shadow-medium transition-all"
                onClick={() => setReserveOpen(true)}
              >
                <Gift className="w-4 h-4" />
                Reservar Presente
              </Button>
            )}

            {!isOwner && listIsPublic && item.is_reserved && (
              <Button disabled className="w-full h-12 rounded-2xl gap-2.5 text-[15px] font-medium">
                Já reservado
              </Button>
            )}

            {isOwner && (
              <Button
                variant="ghost"
                className="w-full h-11 rounded-2xl gap-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="w-4 h-4" />
                Remover item
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Reserve modal */}
      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl" style={{ color: "#54280D" }}>
              Reservar Presente
            </DialogTitle>
            <DialogDescription>
              {ownerProfile?.display_name
                ? `Reserve este presente para ${ownerProfile.display_name}.`
                : "Reserve este presente."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="visitor">Seu nome (como vai aparecer)</Label>
              <Input
                id="visitor"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Como você quer ser identificado"
                maxLength={80}
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="msg">Mensagem (opcional)</Label>
              <Textarea
                id="msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Uma mensagem carinhosa..."
                maxLength={500}
                className="rounded-xl min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Data prevista de entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal rounded-xl h-11",
                      !deliveryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deliveryDate ? format(deliveryDate, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deliveryDate}
                    onSelect={setDeliveryDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
              <div className="space-y-0.5">
                <Label htmlFor="surprise" className="flex items-center gap-1.5 cursor-pointer">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Manter em modo surpresa
                </Label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O dono saberá que foi reservado, mas não quem reservou.
                </p>
              </div>
              <Switch id="surprise" checked={isSurprise} onCheckedChange={setIsSurprise} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setReserveOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl"
              onClick={() => reserveMutation.mutate()}
              disabled={reserveMutation.isPending}
            >
              {reserveMutation.isPending ? "Confirmando..." : "Confirmar Reserva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
