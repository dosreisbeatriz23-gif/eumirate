import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Lock, Users, Gift, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState } from "react";

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

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
      <div className="min-h-screen bg-background flex flex-col page-enter">
        <div className="animate-pulse flex-1 flex flex-col">
          <div className="w-full aspect-[4/3] bg-muted/30" />
          <div className="p-8 space-y-5">
            <div className="h-7 w-48 bg-muted/50 rounded-lg" />
            <div className="h-5 w-24 bg-muted/50 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Item não encontrado</p>
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
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-10 w-11 h-11 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/30 shadow-card flex items-center justify-center text-foreground hover:bg-card transition-all duration-300"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Hero image */}
      {item.image_url ? (
        <div className="w-full bg-muted/20">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full max-h-[65vh] object-contain mx-auto"
          />
        </div>
      ) : (
        <div className="w-full aspect-[4/3] bg-muted/20 flex items-center justify-center">
          <Gift className="w-20 h-20 text-muted-foreground/10" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-6 py-8 space-y-6 max-w-lg mx-auto w-full">
        <h1 className="text-2xl sm:text-3xl font-serif text-foreground leading-tight">
          {item.name}
        </h1>

        <div className="flex items-center gap-4 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full ${
              isPrivate
                ? "bg-muted/60 text-muted-foreground"
                : "bg-primary/8 text-primary"
            }`}
          >
            {isPrivate ? <Lock className="w-3 h-3" /> : <Users className="w-3 h-3" />}
            {isPrivate ? "Privado" : "Público"}
          </span>

          {item.price_range && (
            <span className="text-lg font-medium text-foreground tracking-tight">
              {item.price_range}
            </span>
          )}
        </div>

        {item.is_reserved && (
          <div className="flex items-center gap-2.5 text-sm text-secondary-foreground bg-secondary/60 px-5 py-3.5 rounded-2xl">
            <Gift className="w-4 h-4" />
            Este item já foi reservado
          </div>
        )}

        <div className="space-y-3 pt-2">
          {item.external_link && (
            <a href={item.external_link} target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full h-13 rounded-2xl gap-2.5 text-[15px] font-medium shadow-card hover:shadow-medium transition-all duration-300">
                <ExternalLink className="w-4 h-4" />
                Ver na loja
              </Button>
            </a>
          )}

          <Button
            variant="ghost"
            className="w-full h-12 rounded-2xl gap-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-300"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="w-4 h-4" />
            Remover item
          </Button>
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
