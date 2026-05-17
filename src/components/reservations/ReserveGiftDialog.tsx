import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Gift, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  itemName?: string;
  /** Existing reservation to edit (optional) */
  reservation?: {
    id: string;
    visitor_name: string | null;
    message: string | null;
    expected_delivery_date: string | null;
    is_surprise: boolean;
  } | null;
}

export function ReserveGiftDialog({ open, onOpenChange, itemId, itemName, reservation }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [visitorName, setVisitorName] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [isSurprise, setIsSurprise] = useState(true);

  const isEdit = !!reservation;

  useEffect(() => {
    if (open) {
      if (reservation) {
        setVisitorName(reservation.visitor_name || "");
        setMessage(reservation.message || "");
        setDate(reservation.expected_delivery_date || "");
        setIsSurprise(reservation.is_surprise);
      } else {
        setVisitorName(user?.user_metadata?.full_name || user?.user_metadata?.name || "");
        setMessage("");
        setDate("");
        setIsSurprise(true);
      }
    }
  }, [open, reservation, user]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit && reservation) {
        const { error } = await supabase
          .from("reservations")
          .update({
            visitor_name: visitorName.trim() || null,
            message: message.trim() || null,
            expected_delivery_date: date || null,
            is_surprise: isSurprise,
          })
          .eq("id", reservation.id);
        if (error) throw error;
      } else {
        if (!itemId) throw new Error("Item inválido");
        const { error } = await supabase.rpc("reserve_gift", {
          p_item_id: itemId,
          p_message: message.trim() || null,
          p_expected_delivery_date: date || null,
          p_is_surprise: isSurprise,
          p_visitor_name: visitorName.trim() || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-items"] });
      queryClient.invalidateQueries({ queryKey: ["my-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["item-reservation"] });
      queryClient.invalidateQueries({ queryKey: ["item-detail"] });
      toast.success(isEdit ? "Reserva atualizada" : "Presente reservado");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível reservar");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2 text-xl">
            <Gift className="w-5 h-5 text-primary" />
            {isEdit ? "Editar reserva" : "Reservar presente"}
          </DialogTitle>
          {itemName && (
            <DialogDescription className="text-sm">
              {itemName}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="visitor-name" className="text-xs font-medium">Nome de quem vai presentear</Label>
            <Input
              id="visitor-name"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="Seu nome"
              maxLength={80}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message" className="text-xs font-medium">Mensagem (opcional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Uma mensagem carinhosa para o dono da lista..."
              maxLength={400}
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="delivery-date" className="text-xs font-medium">Data prevista de entrega</Label>
            <Input
              id="delivery-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-muted/30 border border-border/40">
            <div className="flex items-start gap-3">
              <EyeOff className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <Label htmlFor="surprise" className="text-sm font-medium cursor-pointer">
                  Manter reserva em modo surpresa
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  O dono da lista verá apenas que o item foi reservado, sem seu nome ou mensagem.
                </p>
              </div>
            </div>
            <Switch id="surprise" checked={isSurprise} onCheckedChange={setIsSurprise} />
          </div>

          <Button
            className="w-full h-11 rounded-xl"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? "Salvando..."
              : isEdit
                ? "Salvar alterações"
                : "Confirmar reserva"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
