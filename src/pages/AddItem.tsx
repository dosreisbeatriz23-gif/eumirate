import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Link as LinkIcon,
  Loader2,
  Gift,
  Save,
  Lock,
  Users,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

interface ExtractedMeta {
  title: string | null;
  image: string | null;
  price: string | null;
  description: string | null;
}

const isValidUrl = (str: string) => {
  try {
    const u = new URL(str.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};


const AddItem = () => {
  const { id: paramListId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isValidUuid =
    paramListId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramListId);

  const { data: userLists } = useQuery({
    queryKey: ["user-wishlists-for-add", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, title")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      return data;
    },
    enabled: !isValidUuid,
  });

  const [resolvedListId, setResolvedListId] = useState<string | null>(
    isValidUuid ? paramListId! : null
  );

  useEffect(() => {
    if (isValidUuid && paramListId) {
      setResolvedListId(paramListId);
    } else if (userLists && userLists.length > 0) {
      setResolvedListId(userLists[0].id);
    }
  }, [isValidUuid, paramListId, userLists]);

  // Form state
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [meta, setMeta] = useState<ExtractedMeta | null>(null);
  const lastExtractedUrl = useRef("");

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "group">("private");
  const [showDetails, setShowDetails] = useState(false);

  const extractMetadata = async (targetUrl: string) => {
    if (!targetUrl.trim() || !isValidUrl(targetUrl)) return;
    if (lastExtractedUrl.current === targetUrl.trim()) return;
    lastExtractedUrl.current = targetUrl.trim();
    setExtracting(true);
    setExtracted(false);
    try {
      const { data, error } = await supabase.functions.invoke("extract-link-metadata", {
        body: { url: targetUrl.trim() },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        const d = data.data as ExtractedMeta & { url: string };
        setMeta(d);
        const shortName = (d.title ?? "").split(/\s+/).slice(0, 4).join(" ");
        setName(shortName);
        setImageUrl(d.image ?? "");
        setDescription("");
        setPriceRange(d.price ? `R$ ${d.price}` : "");
        setExtracted(true);
        toast.success("Dados extraídos automaticamente!");
      } else {
        toast.error("Não foi possível extrair dados do link");
      }
    } catch {
      toast.error("Erro ao buscar dados do link");
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    if (isValidUrl(url) && url.trim() !== lastExtractedUrl.current) {
      const timeout = setTimeout(() => extractMetadata(url), 500);
      return () => clearTimeout(timeout);
    }
  }, [url]);

  const createListAndSave = async () => {
    let targetListId = resolvedListId;
    if (!targetListId) {
      const { data: newList, error: listError } = await supabase
        .from("wishlists")
        .insert({ user_id: userId, title: "Meu Wishlist Geral" })
        .select("id")
        .single();
      if (listError) throw listError;
      targetListId = newList.id;
      setResolvedListId(targetListId);
    }

    const { error } = await supabase.from("wishlist_items").insert({
      wishlist_id: targetListId,
      name: name.trim(),
      external_link: url.trim() || null,
      image_url: imageUrl.trim() || null,
      price_range: priceRange.trim() || null,
      description: description.trim() || null,
      
      visibility,
    });
    if (error) throw error;
    return targetListId;
  };

  const saveMutation = useMutation({
    mutationFn: createListAndSave,
    onSuccess: (savedListId) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items", savedListId] });
      queryClient.invalidateQueries({ queryKey: ["wishlists"] });
      toast.success("Item adicionado com sucesso!");
      navigate("/meus-desejos", { replace: true });
    },
    onError: () => toast.error("Erro ao salvar item"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Dê um nome ao item");
    saveMutation.mutate();
  };

  const hasPreview = !!(meta || name);

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-10 max-w-lg">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-serif font-medium text-foreground">
          Adicionar Item
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cole um link ou preencha manualmente
        </p>
      </div>

      {/* Link Input */}
      <div className="mb-6">
        <div className="relative group">
          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Cole o link do produto aqui..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-10 pr-12 h-12 rounded-xl border-border/60 bg-card text-base focus:border-primary transition-all"
            autoFocus
          />
          {extracting && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Buscando...</span>
            </div>
          )}
          {extracted && !extracting && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
          )}
        </div>
      </div>

      {/* Preview Card */}
      {hasPreview && (
        <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-[var(--shadow-soft)] mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {imageUrl ? (
            <div className="h-44 bg-muted overflow-hidden relative">
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="h-32 bg-muted/30 flex items-center justify-center">
              <Gift className="w-10 h-10 text-muted-foreground/20" />
            </div>
          )}
          <div className="p-4 space-y-1.5">
            <h3 className="font-serif font-medium text-foreground text-lg leading-tight line-clamp-2">
              {name || "Sem título"}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            )}
            {priceRange && (
              <span className="inline-block text-sm font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                {priceRange}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            Nome do item <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="Ex: Fone de ouvido Sony WH-1000XM5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="h-11 rounded-xl"
          />
        </div>

        {/* Price Range */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Faixa de preço</label>
          <Input
            placeholder="R$ 100 - 200"
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            maxLength={50}
            className="h-11 rounded-xl"
          />
        </div>




        {/* Visibility */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Visibilidade</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility("private")}
              className={`flex items-center gap-2 rounded-xl p-3 border text-sm font-medium transition-all ${
                visibility === "private"
                  ? "border-primary bg-primary/8 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Lock className="w-4 h-4" />
              Privado
            </button>
            <button
              type="button"
              onClick={() => setVisibility("group")}
              className={`flex items-center gap-2 rounded-xl p-3 border text-sm font-medium transition-all ${
                visibility === "group"
                  ? "border-primary bg-primary/8 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Users className="w-4 h-4" />
              Público
            </button>
          </div>
        </div>

        {/* Expandable Details */}
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showDetails ? "Ocultar detalhes" : "Editar detalhes"}
        </button>

        {showDetails && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
              <Textarea
                placeholder="Detalhes do item..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="rounded-xl resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">URL da imagem</label>
              <Input
                placeholder="https://...imagem.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                maxLength={500}
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Faixa de preço</label>
              <Input
                placeholder="R$ 100 - 200"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                maxLength={50}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 rounded-xl gap-2 text-base font-medium shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-medium)] transition-shadow"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Item
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddItem;
