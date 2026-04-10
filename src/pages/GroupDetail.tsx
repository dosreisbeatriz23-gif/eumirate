import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Gift,
  ExternalLink,
  ArrowLeft,
  Copy,
  Check,
  Filter,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

const PRICE_FILTERS = [
  { label: "Todos", min: 0, max: Infinity },
  { label: "Até R$100", min: 0, max: 100 },
  { label: "R$100–300", min: 100, max: 300 },
  { label: "R$300–1.000", min: 300, max: 1000 },
  { label: "R$1.000–3.000", min: 1000, max: 3000 },
  { label: "R$3.000–5.000", min: 3000, max: 5000 },
  { label: "Acima de R$5.000", min: 5000, max: Infinity },
];

function parsePriceRange(priceRange: string | null): number {
  if (!priceRange) return 0;
  const cleaned = priceRange.replace(/[R$\s.]/g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
  // Use the average if there are two numbers, otherwise the first
  if (parsed.length >= 2) return (parsed[0] + parsed[1]) / 2;
  return parsed[0] || 0;
}

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState(0);
  const [copied, setCopied] = useState(false);

  const { data: group } = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Get all member user_ids
  const { data: members = [] } = useQuery({
    queryKey: ["group-members", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const memberIds = members.map((m) => m.user_id);

  // Get all group-visible items from members' wishlists
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["group-items", id, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];

      // Get wishlists owned by members
      const { data: wishlists, error: wErr } = await supabase
        .from("wishlists")
        .select("id")
        .in("user_id", memberIds);
      if (wErr) throw wErr;

      const wishlistIds = wishlists?.map((w) => w.id) || [];
      if (wishlistIds.length === 0) return [];

      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .in("wishlist_id", wishlistIds)
        .eq("visibility", "group")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: memberIds.length > 0,
  });

  const filter = PRICE_FILTERS[activeFilter];
  const filteredItems = items.filter((item) => {
    if (activeFilter === 0) return true;
    const price = parsePriceRange(item.price_range);
    return price >= filter.min && price < filter.max;
  });

  const handleCopy = () => {
    if (!group) return;
    const link = `${window.location.origin}/grupo/convite/${group.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          onClick={() => navigate("/grupos")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-foreground truncate">
            {group?.name ?? "..."}
          </h2>
          {group?.description && (
            <p className="text-sm text-muted-foreground truncate">{group.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" className="rounded-full gap-2 shrink-0" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="hidden sm:inline">{copied ? "Copiado!" : "Convidar"}</span>
        </Button>
      </div>

      {/* Members badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>{memberIds.length} {memberIds.length === 1 ? "membro" : "membros"}</span>
        <span className="text-muted-foreground/40">·</span>
        <span>{items.length} {items.length === 1 ? "presente" : "presentes"} compartilhados</span>
      </div>

      {/* How to invite guide */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Como adicionar integrantes
        </h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <p className="text-xs text-muted-foreground">Clique em <strong className="text-foreground">"Convidar"</strong> acima para copiar o link de convite do grupo.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <p className="text-xs text-muted-foreground">Envie o link por <strong className="text-foreground">WhatsApp, e-mail ou qualquer mensageiro</strong> para quem quiser convidar.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <p className="text-xs text-muted-foreground">Ao abrir o link, a pessoa entra automaticamente no grupo e pode ver as listas dos membros.</p>
          </div>
        </div>
      </div>

      {/* Price Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="w-4 h-4 text-muted-foreground" />
          Filtrar por valor
        </div>
        <div className="flex flex-wrap gap-2">
          {PRICE_FILTERS.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActiveFilter(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${
                  activeFilter === i
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <Gift className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">
            {activeFilter === 0
              ? "Nenhum presente compartilhado ainda"
              : "Nenhum presente nesta faixa de valor"}
          </p>
          {activeFilter !== 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-primary"
              onClick={() => setActiveFilter(0)}
            >
              Limpar filtro
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="group rounded-2xl overflow-hidden border-border/50 hover:border-primary/20 transition-all"
            >
              {item.image_url ? (
                <div className="h-40 bg-muted overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-40 bg-muted/50 flex items-center justify-center">
                  <Gift className="w-10 h-10 text-muted-foreground/30" />
                </div>
              )}

              {item.is_reserved && (
                <div className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-xs px-2.5 py-1 rounded-full">
                  Reservado
                </div>
              )}

              <CardContent className="p-4 space-y-2">
                <h3 className="font-serif font-medium text-foreground text-sm leading-tight line-clamp-2">
                  {item.name}
                </h3>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}
                {item.price_range && (
                  <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {item.price_range}
                  </span>
                )}
                {item.priority && (
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full ml-1 ${
                      item.priority === "alta"
                        ? "bg-destructive/10 text-destructive"
                        : item.priority === "média"
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.priority}
                  </span>
                )}
                {item.external_link && (
                  <div className="pt-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" asChild>
                      <a href={item.external_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                        Ver produto
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupDetail;
