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
        .from("wishlist_items").select("*").eq("id", id!).single();
      if (error) throw error;
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
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-muted/10 border border-border/20 shadow-card">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gift className="w-16 h-16 text-muted-foreground/15" />
              </div>
            )}
          </div>
        </div>

        {/* Details section */}
        <div className="w-full max-w-lg px-5 py-6 space-y-5">
          {/* Name */}
          <h1 className="text-xl sm:text-2xl font-serif text-foreground leading-snug">
            {item.name}
          </h1>

          {/* Price + visibility */}
          <div className="flex items-center gap-3 flex-wrap">
            {item.price_range && (
              <span className="text-lg font-semibold text-foreground tracking-tight">
                {item.price_range}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full ${
                isPrivate
                  ? "bg-muted/50 text-muted-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isPrivate ? <Lock className="w-3 h-3" /> : <Users className="w-3 h-3" />}
              {isPrivate ? "Privado" : "Público"}
            </span>
          </div>

          {/* Reserved banner */}
          {item.is_reserved && (
            <div className="flex items-center gap-2.5 text-sm text-secondary-foreground bg-secondary/50 px-4 py-3 rounded-2xl">
              <Gift className="w-4 h-4 shrink-0" />
              Este item já foi reservado
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-1">
            {item.external_link && (
              <a href={item.external_link} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full h-12 rounded-2xl gap-2.5 text-[15px] font-medium shadow-card hover:shadow-medium transition-all duration-300">
                  <ExternalLink className="w-4 h-4" />
                  Ver na loja
                </Button>
              </a>
            )}

            <Button
              variant="ghost"
              className="w-full h-11 rounded-2xl gap-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-300"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="w-4 h-4" />
              Remover item
            </Button>
          </div>
        </div>
      </div>

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
