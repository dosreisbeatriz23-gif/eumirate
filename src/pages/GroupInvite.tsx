import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLocalUser } from "@/hooks/useLocalUser";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Status = "loading" | "preview" | "joining" | "joined" | "already" | "error";

const GroupInvite = () => {
  const { code } = useParams<{ code: string }>();
  const { userId } = useLocalUser();
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("loading");
  const [group, setGroup] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    if (!code || !userId) return;

    const load = async () => {
      // Find group by invite_code
      const { data: g, error } = await supabase
        .from("groups")
        .select("*")
        .eq("invite_code", code)
        .single();

      if (error || !g) {
        setStatus("error");
        return;
      }
      setGroup(g);

      // Check member count
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", g.id);
      setMemberCount(count || 0);

      // Check if already a member
      const { data: existing } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", g.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        setStatus("already");
      } else {
        setStatus("preview");
      }
    };

    load();
  }, [code, userId]);

  const handleJoin = async () => {
    if (!group || !userId) return;
    setStatus("joining");

    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: userId, role: "member" });

    if (error) {
      toast.error("Erro ao entrar no grupo");
      setStatus("preview");
      return;
    }

    setStatus("joined");
    toast.success("Você entrou no grupo!");
  };

  if (status === "loading" || status === "joining") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">
          {status === "joining" ? "Entrando no grupo..." : "Carregando convite..."}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <XCircle className="w-12 h-12 text-destructive/60" />
        <h2 className="text-xl font-serif font-medium text-foreground">Convite inválido</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Este link de convite não é válido ou o grupo não existe mais.
        </p>
        <Button variant="outline" className="rounded-full mt-2" onClick={() => navigate("/grupos")}>
          Ir para Meus Grupos
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Users className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-serif font-medium text-foreground">{group?.name}</h2>
        {group?.description && (
          <p className="text-sm text-muted-foreground max-w-xs">{group.description}</p>
        )}
        <p className="text-xs text-muted-foreground/60">
          {memberCount} {memberCount === 1 ? "membro" : "membros"}
        </p>
      </div>

      {status === "already" ? (
        <>
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Você já faz parte deste grupo</span>
          </div>
          <Button className="rounded-full" onClick={() => navigate(`/grupo/${group.id}`)}>
            Abrir grupo
          </Button>
        </>
      ) : status === "joined" ? (
        <>
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Você entrou no grupo!</span>
          </div>
          <Button className="rounded-full" onClick={() => navigate(`/grupo/${group.id}`)}>
            Ver grupo
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground max-w-xs">
            Você foi convidado para este grupo. Ao entrar, poderá ver as listas de desejos dos membros.
          </p>
          <Button className="rounded-full gap-2 px-8" onClick={handleJoin}>
            <Users className="w-4 h-4" />
            Entrar no Grupo
          </Button>
        </>
      )}
    </div>
  );
};

export default GroupInvite;
