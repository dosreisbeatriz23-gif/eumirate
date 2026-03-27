import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Lock, Globe, Gift } from "lucide-react";
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-24 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Item não encontrado</p>
        <Button variant="ghost" onClick={() => navigate("/home")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Image */}
      {item.image_url && (
        <div className="rounded-2xl overflow-hidden border border-border/30 mb-6">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full object-cover max-h-[400px]"
          />
        </div>
      )}

      {/* Info */}
      <div className="space-y-4">
        <h1 className="text-2xl font-serif font-medium text-foreground">
          {item.name}
        </h1>

        {item.price_range && (
          <span className="inline-block text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            {item.price_range}
          </span>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.visibility === "private" ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              Privado
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5" />
              Público
            </>
          )}
        </div>

        {item.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        )}

        {item.external_link && (
          <a
            href={item.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Ver na loja
          </a>
        )}

        {item.is_reserved && (
          <div className="flex items-center gap-2 text-sm text-secondary-foreground bg-secondary px-4 py-2.5 rounded-xl">
            <Gift className="w-4 h-4" />
            Este item já foi reservado
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetail;
