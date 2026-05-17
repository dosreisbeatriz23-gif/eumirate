import { useState, useEffect, useRef } from "react";
import { handleCurrencyChange, formatBRL } from "@/lib/currency";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  Camera,
  ImagePlus,
  X,
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
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group");
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isValidUuid =
    paramListId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramListId);

  const { data: userLists = [] } = useQuery({
    queryKey: ["user-wishlists-for-add", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, title, visibility")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const [resolvedListId, setResolvedListId] = useState<string | null>(
    isValidUuid ? paramListId! : null
  );

  useEffect(() => {
    if (isValidUuid && paramListId) {
      setResolvedListId(paramListId);
      return;
    }

    const targetListVisibility = groupId ? "public" : "private";
    const preferredList = userLists.find((list) => list.visibility === targetListVisibility) ?? userLists[0];
    if (preferredList) setResolvedListId(preferredList.id);
  }, [groupId, isValidUuid, paramListId, userLists]);

  // Form state
  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [meta, setMeta] = useState<ExtractedMeta | null>(null);
  const lastExtractedUrl = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">(groupId ? "public" : "private");
  const [showDetails, setShowDetails] = useState(false);
  const [showImageEdit, setShowImageEdit] = useState(false);
  const [customImageUrl, setCustomImageUrl] = useState("");

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
        setPriceRange(d.price ? formatBRL(String(d.price).replace(/\D/g, "")) : "");
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

  const ensureListForVisibility = async (targetVisibility: "private" | "public") => {
    const existing = userLists.find((list) => list.visibility === targetVisibility);
    if (existing) return existing.id;

    const { data: newList, error: listError } = await supabase
      .from("wishlists")
      .insert({
        user_id: userId,
        title: targetVisibility === "private" ? "Minha Lista Pessoal" : "Presentes Que Quero Ganhar",
        visibility: targetVisibility,
      })
      .select("id")
      .single();
    if (listError) throw listError;
    return newList.id;
  };

  const createListAndSave = async () => {
    const targetListVisibility = visibility === "private" ? "private" : "public";
    const selectedList = userLists.find((list) => list.id === resolvedListId);
    let targetListId = selectedList?.visibility === targetListVisibility ? selectedList.id : null;

    if (!targetListId) {
      targetListId = await ensureListForVisibility(targetListVisibility);
      setResolvedListId(targetListId);
    }

    if (!targetListId) {
      const { data: newList, error: listError } = await supabase
        .from("wishlists")
        .insert({
          user_id: userId,
          title: targetListVisibility === "private" ? "Minha Lista Pessoal" : "Presentes Que Quero Ganhar",
          visibility: targetListVisibility,
        })
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
      queryClient.invalidateQueries({ queryKey: ["all-items-mural"] });
      if (groupId && visibility !== "private") {
        queryClient.invalidateQueries({ queryKey: ["group-items"] });
        toast.success("Item adicionado ao grupo!");
        navigate(`/grupo/${groupId}`, { replace: true });
      } else {
        toast.success("Item adicionado com sucesso!");
        navigate(`/lista/${savedListId}`, { replace: true });
      }
    },
    onError: () => toast.error("Erro ao salvar item"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Dê um nome ao item");
    saveMutation.mutate();
  };

  const hasPreview = !!(meta || name);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setShowImageEdit(false);
      toast.success("Imagem atualizada!");
    };
    reader.readAsDataURL(file);
  };

  const handleCustomImageUrl = () => {
    if (!customImageUrl.trim()) return;
    setImageUrl(customImageUrl.trim());
    setCustomImageUrl("");
    setShowImageEdit(false);
    toast.success("Imagem atualizada!");
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 md:py-10 max-w-lg">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl title-gliker">
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
          <div className="relative w-full aspect-square bg-muted/20 overflow-hidden group">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gift className="w-10 h-10 text-muted-foreground/20" />
              </div>
            )}
            {/* Image edit overlay */}
            <button
              type="button"
              onClick={() => setShowImageEdit(!showImageEdit)}
              className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm border border-border/60 rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm md:opacity-70"
              title="Alterar imagem"
            >
              <Camera className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Image edit panel */}
          {showImageEdit && (
            <div className="p-4 border-t border-border/30 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 bg-muted/10">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Alterar imagem</span>
                <button type="button" onClick={() => setShowImageEdit(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-xl p-3 border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ImagePlus className="w-4 h-4" />
                  Galeria
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const urlInput = document.getElementById("custom-image-url");
                    if (urlInput) urlInput.focus();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl p-3 border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  URL
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  id="custom-image-url"
                  placeholder="Cole a URL da imagem..."
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="h-10 rounded-xl text-sm flex-1"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCustomImageUrl())}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCustomImageUrl}
                  disabled={!customImageUrl.trim()}
                  className="h-10 rounded-xl px-4"
                >
                  OK
                </Button>
              </div>
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
            placeholder="R$ 0,00"
            value={priceRange}
            onChange={(e) => handleCurrencyChange(e.target.value, setPriceRange)}
            inputMode="numeric"
            maxLength={20}
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
              onClick={() => setVisibility("public")}
              className={`flex items-center gap-2 rounded-xl p-3 border text-sm font-medium transition-all ${
                visibility === "public"
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
