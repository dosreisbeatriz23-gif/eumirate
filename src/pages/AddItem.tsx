import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocalUser } from "@/hooks/useLocalUser";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Link as LinkIcon, Loader2, Gift, Save } from "lucide-react";

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
  const { userId } = useLocalUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check if paramListId is a valid UUID (not the literal ":id")
  const isValidUuid = paramListId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramListId);

  // Fetch user's first list if no valid listId from params
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

  const [resolvedListId, setResolvedListId] = useState<string | null>(isValidUuid ? paramListId! : null);

  useEffect(() => {
    if (isValidUuid && paramListId) {
      setResolvedListId(paramListId);
    } else if (userLists && userLists.length > 0) {
      setResolvedListId(userLists[0].id);
    }
  }, [isValidUuid, paramListId, userLists]);

  const [url, setUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [meta, setMeta] = useState<ExtractedMeta | null>(null);
  const lastExtractedUrl = useRef("");

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [description, setDescription] = useState("");

  const extractMetadata = async (targetUrl: string) => {
    if (!targetUrl.trim() || !isValidUrl(targetUrl)) return;
    if (lastExtractedUrl.current === targetUrl.trim()) return;
    lastExtractedUrl.current = targetUrl.trim();
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-link-metadata", {
        body: { url: targetUrl.trim() },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        const d = data.data as ExtractedMeta & { url: string };
        setMeta(d);
        setName(d.title ?? "");
        setImageUrl(d.image ?? "");
        setDescription(d.description ?? "");
        setPriceRange(d.price ? `R$ ${d.price}` : "");
        toast.success("Dados extraídos!");
      } else {
        toast.error("Não foi possível extrair dados do link");
      }
    } catch {
      toast.error("Erro ao buscar dados do link");
    } finally {
      setExtracting(false);
    }
  };

  // Auto-extract when a valid URL is pasted or typed
  useEffect(() => {
    if (isValidUrl(url) && url.trim() !== lastExtractedUrl.current) {
      const timeout = setTimeout(() => extractMetadata(url), 400);
      return () => clearTimeout(timeout);
    }
  }, [url]);

  const createListAndSave = async () => {
    let targetListId = resolvedListId;

    // If no list exists, create one automatically
    if (!targetListId) {
      const { data: newList, error: listError } = await supabase
        .from("wishlists")
        .insert({ user_id: userId, title: "Minha Lista de Desejos" })
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
      priority: "média",
    });
    if (error) throw error;
    return targetListId;
  };

  const saveMutation = useMutation({
    mutationFn: createListAndSave,
    onSuccess: (savedListId) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items", savedListId] });
      queryClient.invalidateQueries({ queryKey: ["wishlists"] });
      toast.success("Item adicionado!");
      navigate("/dashboard", { replace: true });
    },
    onError: () => toast.error("Erro ao salvar item"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome é obrigatório");
    saveMutation.mutate();
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(resolvedListId ? `/lista/${resolvedListId}` : "/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-serif font-medium text-foreground">
            <span className="text-gradient">EUMIRATE</span>
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-lg">
        <h2 className="text-3xl font-serif font-medium text-foreground mb-8">
          Adicionar Item
        </h2>

        {/* Step 1: Paste link */}
        <div className="space-y-4 mb-8">
          <label className="text-sm font-medium text-foreground block">
            Cole o link do produto
          </label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-9 pr-10"
              autoFocus
            />
            {extracting && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Preview card */}
        {(meta || name) && (
          <Card className="rounded-2xl overflow-hidden border-border/50 mb-8">
            {imageUrl ? (
              <div className="h-48 bg-muted overflow-hidden">
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-48 bg-muted/50 flex items-center justify-center">
                <Gift className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}
            <CardContent className="p-4 space-y-2">
              <h3 className="font-serif font-medium text-foreground text-lg line-clamp-2">
                {name || "Sem título"}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {description}
                </p>
              )}
              {priceRange && (
                <span className="inline-block text-sm bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {priceRange}
                </span>
              )}
            </CardContent>
          </Card>
        )}

        {/* Editable fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nome *</label>
            <Input
              placeholder="Nome do item"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
            <Textarea
              placeholder="Descrição do item"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">URL da imagem</label>
            <Input
              placeholder="https://...imagem.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              maxLength={500}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Preço</label>
            <Input
              placeholder="R$ 100 - 200"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              maxLength={50}
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl gap-2"
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Item"}
          </Button>
        </form>
      </div>
    </main>
  );
};

export default AddItem;
