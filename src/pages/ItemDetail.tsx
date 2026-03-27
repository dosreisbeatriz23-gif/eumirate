import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Lock, Users, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const ItemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: item, isLoading } = useQuery({
    queryKey: ["item-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="animate-pulse flex-1 flex flex-col">
          <div className="w-full aspect-[4/3] bg-muted" />
          <div className="p-6 space-y-4">
            <div className="h-7 w-48 bg-muted rounded" />
            <div className="h-5 w-24 bg-muted rounded-full" />
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back button overlay */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-10 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm border border-border/40 shadow-sm flex items-center justify-center text-foreground hover:bg-card transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Hero image */}
      {item.image_url ? (
        <div className="w-full bg-muted">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full max-h-[60vh] object-contain mx-auto"
          />
        </div>
      ) : (
        <div className="w-full aspect-[4/3] bg-muted/50 flex items-center justify-center">
          <Gift className="w-16 h-16 text-muted-foreground/20" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-5 py-6 space-y-5 max-w-lg mx-auto w-full">
        {/* Name */}
        <h1 className="text-xl sm:text-2xl font-serif font-semibold text-foreground leading-tight">
          {item.name}
        </h1>

        {/* Visibility badge */}
        <div className="flex items-center gap-4 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
              isPrivate
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            }`}
          >
            {isPrivate ? <Lock className="w-3 h-3" /> : <Users className="w-3 h-3" />}
            {isPrivate ? "Privado" : "Público"}
          </span>

          {item.price_range && (
            <span className="text-base font-semibold text-foreground">
              {item.price_range}
            </span>
          )}
        </div>

        {item.is_reserved && (
          <div className="flex items-center gap-2 text-sm text-secondary-foreground bg-secondary px-4 py-2.5 rounded-xl">
            <Gift className="w-4 h-4" />
            Este item já foi reservado
          </div>
        )}

        {/* CTA */}
        {item.external_link && (
          <a
            href={item.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full h-12 rounded-xl gap-2 text-base font-medium shadow-md">
              <ExternalLink className="w-4 h-4" />
              Ver na loja
            </Button>
          </a>
        )}
      </div>
    </div>
  );
};

export default ItemDetail;
