import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Plus,
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

  // Get all group-visible items from members' wishlists, with author info
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["group-items", id, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];

      // Get wishlists owned by members (with user_id)
      const { data: wishlists, error: wErr } = await supabase
        .from("wishlists")
        .select("id, user_id")
        .in("user_id", memberIds);
      if (wErr) throw wErr;

      const wishlistIds = wishlists?.map((w) => w.id) || [];
      if (wishlistIds.length === 0) return [];

      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*")
        .in("wishlist_id", wishlistIds)
        .in("visibility", ["group", "public"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Build wishlist_id → user_id map
      const wlUserMap: Record<string, string> = {};
      wishlists?.forEach((w) => { wlUserMap[w.id] = w.user_id; });

      // Fetch profiles for all member user_ids
      const uniqueUserIds = [...new Set(Object.values(wlUserMap))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", uniqueUserIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach((p) => { profileMap[p.user_id] = p.display_name || "Membro"; });

      // Attach author name to each item
      return (data || []).map((item) => ({
        ...item,
        author_name: profileMap[wlUserMap[item.wishlist_id]] || "Membro",
      }));
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
    toast.success("Link copiado com sucesso!", { description: "Envie para quem quiser convidar ao grupo." });
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
        <Button
          size="sm"
          className="rounded-full gap-2 shrink-0"
          onClick={() => navigate(`/adicionar?group=${id}`)}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Adicionar item</span>
        </Button>
      </div>

      {/* Members badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>{memberIds.length} {memberIds.length === 1 ? "membro" : "membros"}</span>
        <span className="text-muted-foreground/40">·</span>
        <span>{items.length} {items.length === 1 ? "presente" : "presentes"} compartilhados</span>
      </div>

      {/* Invite section */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="p-4 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Convidar pessoas
          </h3>
        </div>
        <div className="px-4 pb-4">
          <Button
            variant="outline"
            className="w-full rounded-xl h-11 gap-2 font-medium text-sm"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            {copied ? "Link copiado com sucesso!" : "Copiar link de convite"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center mt-2.5 leading-relaxed">
            Copie este link e envie para quem quiser. Ao acessar, a pessoa poderá entrar no grupo após fazer login.
          </p>
        </div>
        <div className="border-t border-border/40 px-4 py-3 bg-muted/30">
          <div className="flex items-start gap-2.5">
            <div className="flex gap-1.5 shrink-0 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/20" />
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              Funciona com <strong className="text-muted-foreground">WhatsApp, e-mail, Instagram</strong> ou qualquer mensageiro.
            </p>
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
              className="group relative rounded-2xl overflow-hidden border-border/50 hover:border-primary/20 transition-all cursor-pointer"
              onClick={() => navigate(`/item/${item.id}`)}
            >
              {item.image_url ? (
                <div className="h-40 bg-muted overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${item.is_reserved ? "grayscale-[40%] opacity-80" : ""}`}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-40 bg-muted/50 flex items-center justify-center">
                  <Gift className="w-10 h-10 text-muted-foreground/30" />
                </div>
              )}

              {item.is_reserved && (
                <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full shadow-medium">
                  RESERVADO
                </div>
              )}

              <CardContent className="p-4 space-y-2">
                <h3 className="font-serif font-medium text-foreground text-sm leading-tight line-clamp-2">
                  {item.name}
                </h3>
                {item.price_range && (
                  <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {item.price_range}
                  </span>
                )}
                {item.author_name && (
                  <p className="text-[11px] text-muted-foreground/70 truncate">
                    Adicionado por {item.author_name}
                  </p>
                )}
                {item.external_link && (
                  <div className="pt-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
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
