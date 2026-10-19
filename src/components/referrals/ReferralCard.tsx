import { useEffect, useRef, useState } from "react";
import { Gift, Users, Copy, Share2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useReferrals, trackReferral } from "@/hooks/useReferrals";
import { copyReferralLink, INVITE_MESSAGE, referralProgress } from "@/lib/referrals";
import { toast } from "sonner";

const date = (value: string) => new Date(value).toLocaleDateString("pt-BR");

export function ReferralCard() {
  const { data, isLoading, isError, refetch } = useReferrals();
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const viewed = useRef(false);
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!data || !card.current || viewed.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !viewed.current) { viewed.current = true; void trackReferral("card_viewed"); observer.disconnect(); }
    });
    observer.observe(card.current);
    return () => observer.disconnect();
  }, [data]);

  if (isLoading) return <div className="h-44 bg-muted/30 rounded-2xl animate-pulse mb-8" aria-label="Carregando indicações" />;
  if (isError || !data) return <div className="mb-8 text-sm text-muted-foreground">Não foi possível carregar suas indicações. <Button variant="link" onClick={() => void refetch()}>Tentar novamente</Button></div>;
  const progress = referralProgress(data.qualified);
  const link = `${window.location.origin}/login?mode=signup&ref=${data.code}`;
  const message = data.reward
    ? !data.reward.starts_at ? "Você conseguiu! Seus 30 dias estão guardados para quando seu Premium pago terminar."
      : data.premium_active ? "Você conseguiu! Seus 30 dias de Premium foram desbloqueados."
      : "Você conquistou sua recompensa de 30 dias de Premium."
    : progress === 2 ? "Falta só mais 1 amigo para desbloquear sua recompensa"
    : progress === 1 ? "Faltam só mais 2 amigos para ganhar seu Premium"
    : data.pending > 0 ? "Você já está mais perto de ganhar seu Premium"
    : "Sua primeira indicação começa aqui";
  const copy = async () => {
    try { await copyReferralLink(link); setCopied(true); toast.success("Link copiado!"); void trackReferral("link_copied"); }
    catch { toast.error("Não foi possível copiar. Selecione o link para copiar manualmente."); }
  };
  const share = async () => {
    setSharing(true);
    try {
      if (navigator.share) { void trackReferral("share_started"); await navigator.share({ title: "EUMIRATE", text: INVITE_MESSAGE, url: link }); }
      else await copy();
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) toast.error("Não foi possível compartilhar. Você pode copiar o link."); }
    finally { setSharing(false); }
  };
  const progressBar = <div className="space-y-2"><div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>Indicações qualificadas</span><span className="font-semibold text-primary">{progress} de 3</span></div><div role="progressbar" aria-label="Indicações qualificadas" aria-valuemin={0} aria-valuemax={3} aria-valuenow={progress} className="h-2 rounded-full bg-primary/10 overflow-hidden"><div className={`h-full rounded-full bg-primary transition-all motion-reduce:transition-none ${["w-0", "w-1/3", "w-2/3", "w-full"][progress]}`} /></div></div>;

  return <>
    <section ref={card} className="mb-8 rounded-2xl border border-primary/20 bg-card shadow-card p-5 sm:p-7" aria-label="Indique amigos e ganhe Premium">
      <div className="grid gap-5 sm:grid-cols-[1fr_240px] sm:items-center">
        <div className="min-w-0"><div className="flex items-center gap-2 text-primary text-xs font-medium mb-3"><Gift className="w-4 h-4" />30 dias de Premium grátis</div>
          <h2 className="font-serif text-xl sm:text-2xl text-foreground leading-snug">Seus amigos ganham desejos. Você ganha Premium!</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-lg">Convide 3 amigos para conhecer o EUMIRATE. Quando eles criarem suas primeiras listas, você desbloqueia 30 dias de Premium grátis</p>
        </div>
        <div className="space-y-3">{progressBar}<Button className="w-full rounded-full gap-2" onClick={() => { setRules(false); setOpen(true); void trackReferral("invite_clicked"); }}><Users className="w-4 h-4" />Convidar amigos</Button><Button variant="link" className="w-full h-7 text-xs" onClick={() => { setRules(true); setOpen(true); }}>Como funciona?</Button></div>
      </div>
      <p className="mt-4 pt-4 border-t border-border/50 text-xs text-primary" role="status">{message}</p>
    </section>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-2xl max-h-[85dvh] overflow-y-auto p-5 sm:p-6">
      <DialogHeader><DialogTitle className="font-serif text-2xl">Compartilhe com quem você gosta</DialogTitle><DialogDescription>Três amigos novos, uma primeira lista de cada um e 30 dias de Premium para você.</DialogDescription></DialogHeader>
      <div className="space-y-5 min-w-0">
        <div className="flex items-center gap-3 text-primary"><Gift className="w-7 h-7 shrink-0" /><p className="text-sm font-medium">{message}</p></div>
        {progressBar}
        <div className="space-y-2"><label htmlFor="referral-link" className="text-xs text-muted-foreground">Seu link exclusivo</label><textarea id="referral-link" readOnly value={link} rows={3} onFocus={(e) => e.target.select()} className="w-full resize-none rounded-xl border border-input bg-background text-foreground p-3 text-sm break-all" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Button variant="outline" className="rounded-xl gap-2" onClick={() => void copy()}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? "Link copiado" : "Copiar link"}</Button><Button className="rounded-xl gap-2" disabled={sharing} onClick={() => void share()}>{sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}Compartilhar convite</Button></div>
        </div>
        {data.reward?.starts_at && data.reward.ends_at && <p className="text-xs text-muted-foreground">Benefício de {date(data.reward.starts_at)} até {date(data.reward.ends_at)}. {data.premium_active ? "Premium ativo." : "Benefício encerrado."}</p>}
        <div><h3 className="text-base font-serif mb-2">Suas indicações</h3>{data.history.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há cadastros pelo seu link.</p> : <ul className="divide-y divide-border/50">{data.history.map((entry, index) => <li key={entry.id} className="flex justify-between gap-3 py-3 text-xs"><span className="text-muted-foreground">Convite {index + 1} · {date(entry.signed_up_at)}</span><span className={entry.qualified_at ? "text-primary font-medium" : "text-muted-foreground"}>{entry.qualified_at ? "Qualificada" : "Aguardando primeira lista"}</span></li>)}</ul>}{data.pending > 0 && <p className="text-xs text-muted-foreground mt-2">{data.pending} {data.pending === 1 ? "cadastro pendente" : "cadastros pendentes"}. Só contam após confirmação da conta e criação da lista.</p>}</div>
        <Accordion type="single" collapsible value={rules ? "rules" : undefined} onValueChange={(value) => setRules(value === "rules")}><AccordionItem value="rules"><AccordionTrigger>Como funciona?</AccordionTrigger><AccordionContent><ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground"><li>Compartilhe seu link exclusivo.</li><li>Seus amigos se cadastram, confirmam a conta e criam a primeira lista.</li><li>Quando três amigos concluírem essas etapas, você ganha 30 dias de Premium grátis.</li></ol><h4 className="mt-5 mb-2 font-semibold text-foreground">Regras do programa</h4><p className="text-xs text-muted-foreground leading-relaxed">A recompensa é única por conta. Apenas pessoas novas, com origem registrada antes do cadastro, podem qualificar. A lista automática do cadastro não conta. Cliques, compartilhamentos, contas existentes, autoindicações e cadastros repetidos não contam. O primeiro convite registrado vale por 30 dias. Contas artificiais e abuso não são permitidos. Os dados pessoais dos convidados não são exibidos.</p><p className="text-xs text-muted-foreground mt-3 leading-relaxed">Os 30 dias começam automaticamente ao conquistar a recompensa. Se você já tem Premium pago, o benefício fica guardado e começa quando o acesso pago terminar. Sua assinatura e cobranças não são alteradas; cancelar convites ou excluir listas depois da qualificação não gera nova recompensa. O plano Free continua disponível sem convidar ninguém.</p></AccordionContent></AccordionItem></Accordion>
      </div>
    </DialogContent></Dialog>
  </>;
}