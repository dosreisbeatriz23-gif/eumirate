import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users } from "lucide-react";

interface MemberProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface GroupMember {
  user_id: string;
  joined_at: string;
  role: string;
  profile: MemberProfile | null;
}

const GroupMembers = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState(false);

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

  const { data: members = [], isLoading } = useQuery<GroupMember[]>({
    queryKey: ["group-members-detailed", id],
    queryFn: async () => {
      if (!id) return [];

      // Buscar membros do grupo com perfis
      const { data: memberData, error: memberError } = await supabase
        .from("group_members")
        .select("user_id, joined_at, role")
        .eq("group_id", id)
        .order("joined_at", { ascending: true });

      if (memberError) throw memberError;
      if (!memberData || memberData.length === 0) return [];

      const userIds = memberData.map((m) => m.user_id);

      // Buscar perfis dos membros
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      const profileMap: Record<string, MemberProfile> = {};
      profiles?.forEach((p) => {
        profileMap[p.user_id] = p;
      });

      return memberData.map((m) => ({
        user_id: m.user_id,
        joined_at: m.joined_at,
        role: m.role,
        profile: profileMap[m.user_id] || null,
      })) as GroupMember[];
    },
    enabled: !!id && isMember,
  });

  // Verificar se usuário atual é membro do grupo
  useEffect(() => {
    const checkMembership = async () => {
      if (!user || !id) {
        setIsMember(false);
        return;
      }
      const { data } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setIsMember(!!data);
    };
    checkMembership();
  }, [user, id]);

  // Redirecionar se não for membro
  useEffect(() => {
    if (!isMember && !isLoading && user && id) {
      navigate("/grupos");
    }
  }, [isMember, isLoading, user, id, navigate]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getDisplayName = (member: GroupMember) => {
    return member.profile?.display_name || "Membro";
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0"
          onClick={() => navigate(`/grupo/${id}`)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-foreground truncate">
            Membros do Grupo
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            {group?.name ? `Grupo: ${group.name}` : "Visualize todos os participantes deste grupo."}
          </p>
        </div>
      </div>

      {/* Members count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>
          {members.length} {members.length === 1 ? "membro" : "membros"}
        </span>
      </div>

      {/* Members list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Nenhum membro encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/20 transition-all"
            >
              <Avatar className="w-12 h-12 shrink-0">
                <AvatarImage
                  src={member.profile?.avatar_url || undefined}
                  alt={getDisplayName(member)}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getInitials(getDisplayName(member))}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {getDisplayName(member)}
                </p>
                {member.role === "owner" && (
                  <span className="inline-block text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium tracking-wider">
                    ADMIN
                  </span>
                )}
                {member.role === "member" && (
                  <span className="text-[11px] text-muted-foreground/70">
                    Membro
                  </span>
                )}
              </div>
              {member.user_id === user?.id && (
                <span className="text-[11px] text-muted-foreground/60 shrink-0">
                  Você
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupMembers;
