import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Gift, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { captureReferral } from "@/components/referrals/ReferralCapture";

interface PublicList {
  title: string;
  description: string | null;
  referral_code: string | null;
  items: { id: string; name: string; description: string | null; price_range: string | null; image_url: string | null; external_link: string | null; is_reserved: boolean }[];
}

export default function PublicWishlist() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-wishlist", token],
    enabled: Boolean(token),
    queryFn: async () => {
      if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null;
      const { data, error } = await supabase.rpc("get_public_wishlist", { p_token: token });
      if (error) throw error;
      return data as unknown as PublicList | null;
    },
  });
  useEffect(() => {
    if (!loading && !user && data?.referral_code) void captureReferral(data.referral_code);
  }, [data?.referral_code, loading, user]);

  return <main className="min-h-screen bg-background">
    <header className="bg-primary px-5 sm:px-8 h-14 flex items-center"><Link to={user ? "/home" : "/login"} className="font-gliker text-primary-foreground text-3xl">eumirate</Link></header>
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
      {isLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" aria-label="Carregando lista" /></div>
      : isError ? <div className="text-center py-20"><p className="text-muted-foreground">Não foi possível carregar a lista.</p><Button variant="link" onClick={() => void refetch()}>Tentar novamente</Button></div>
      : !data ? <div className="text-center py-20"><Gift className="mx-auto text-primary mb-4" /><h1 className="text-2xl">Lista indisponível</h1><p className="text-sm text-muted-foreground mt-2">O link não é válido ou a lista não é pública.</p></div>
      : <><h1 className="text-3xl sm:text-4xl break-words">{data.title}</h1>{data.description && <p className="text-muted-foreground mt-3 break-words">{data.description}</p>}
        <p className="text-xs text-muted-foreground mt-3 mb-7">{data.items.length} {data.items.length === 1 ? "desejo" : "desejos"}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">{data.items.map((item) => <Card key={item.id} className="rounded-2xl overflow-hidden border-border/30 shadow-card"><div className="aspect-square bg-muted/30 flex items-center justify-center">{item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" /> : <Gift className="w-8 h-8 text-muted-foreground/40" />}</div><CardContent className="p-4 space-y-2"><h2 className="text-base break-words">{item.name}</h2>{item.price_range && <p className="text-xs text-muted-foreground">{item.price_range}</p>}{item.is_reserved && <p className="text-xs text-primary">Reservado</p>}{item.external_link && /^https?:\/\//i.test(item.external_link) && <Button variant="link" size="sm" className="px-0 h-auto text-xs" asChild><a href={item.external_link} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 mr-1" />Ver produto</a></Button>}</CardContent></Card>)}</div>
        {data.items.length === 0 && <p className="text-sm text-muted-foreground py-10">Ainda não há desejos nesta lista.</p>}
        <section className="mt-10 pt-8 border-t border-border text-center"><h2 className="text-xl sm:text-2xl max-w-lg mx-auto">Gostou da ideia? Crie sua própria lista de desejos no EUMIRATE</h2><Button className="mt-5 rounded-full" asChild><Link to={user ? "/meus-desejos" : `/login?mode=signup${data.referral_code ? `&ref=${data.referral_code}` : ""}`}>Criar minha lista grátis</Link></Button></section>
      </>}
    </div>
  </main>;
}