import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Heart, Home, Plus, Copy, Check, Crown, UserPlus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const defaultSuggestions = [
  { name: "Família", icon: Home, color: "bg-primary/8 text-primary border-primary/15" },
  { name: "Amigos", icon: Users, color: "bg-secondary text-secondary-foreground border-secondary" },
  { name: "Casal", icon: Heart, color: "bg-accent text-accent-foreground border-accent/50" },
];

const Grupos = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [groupToEdit, setGroupToEdit] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups", userId],
    queryFn: async () => {
      // Get all group IDs where user is a member
      const { data: memberships, error: memErr } = await supabase
        .from("group_members").select("group_id").eq("user_id", userId!);
      if (memErr) throw memErr;
      const groupIds = memberships?.map((m) => m.group_id) || [];
      if (groupIds.length === 0) return [];
      const { data, error } = await supabase
        .from("groups").select("*, group_members(count)").in("id", groupIds).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const createGroup = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const { data, error } = await supabase
        .from("groups").insert({ name, description: description || null, owner_id: userId }).select().single();
      if (error) throw error;
      await supabase.from("group_members").insert({ group_id: data.id, user_id: userId, role: "owner" });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", userId] });
      setShowCreate(false); setName(""); setDescription("");
      toast.success("Grupo criado com sucesso!");
    },
    onError: () => toast.error("Erro ao criar grupo"),
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", userId] });
      setGroupToDelete(null);
      toast.success("Grupo excluído com sucesso!");
    },
    onError: () => toast.error("Erro ao excluir grupo"),
  });

  const updateGroupName = useMutation({
    mutationFn: async ({ groupId, name }: { groupId: string; name: string }) => {
      const { error } = await supabase.from("groups").update({ name }).eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", userId] });
      setGroupToEdit(null);
      toast.success("Nome do grupo atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar o grupo"),
  });
  const handleQuickCreate = (groupName: string) => { setName(groupName); setShowCreate(true); };

  const copyInviteLink = (inviteCode: string, groupId: string) => {
    const link = `${window.location.origin}/grupo/convite/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(groupId);
    toast.success("Link copiado com sucesso!", { description: "Envie para quem quiser convidar ao grupo." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const existingNames = groups.map((g: any) => g.name);
  const suggestions = defaultSuggestions.filter((s) => !existingNames.includes(s.name));

  return (
    <div className="container mx-auto px-5 md:px-8 py-8 md:py-12 max-w-2xl space-y-8 md:space-y-10 page-enter">
      <div className="flex items-center justify-between gap-3">
        <h2 className="sm:text-4xl title-gliker tracking-tight truncate flex-1 min-w-0 text-xl mx-0 my-0 px-0 py-0">Meus Grupos</h2>
        <Button onClick={() => setShowCreate(true)} className="shrink-0 rounded-full gap-2 h-10 px-4 sm:px-5 text-[13px] font-medium" size="sm">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {suggestions.length > 0 && (
        <section>
          <p className="text-xs text-muted-foreground mb-3 uppercase tracking-widest font-medium">Sugestões</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.name}
                onClick={() => handleQuickCreate(s.name)}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium border transition-all duration-300 hover:shadow-soft active:scale-[0.97] ${s.color}`}
              >
                <s.icon className="w-4 h-4" />
                {s.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-14 h-14 text-muted-foreground/15 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Você ainda não tem grupos</p>
          <p className="text-muted-foreground/50 text-xs mt-1">Crie um grupo para compartilhar desejos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group: any) => {
            const memberCount = group.group_members?.[0]?.count || 1;
            return (
              <div
                key={group.id}
                className="rounded-2xl p-4 premium-card cursor-pointer"
                onClick={() => navigate(`/grupo/${group.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground text-sm truncate">{group.name}</h3>
                      {group.owner_id === userId && <Crown className="w-3.5 h-3.5 text-primary/40 shrink-0" />}
                    </div>
                    {group.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{group.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1.5">
                      <UserPlus className="w-3 h-3 text-muted-foreground/40" />
                      <span className="text-xs text-muted-foreground/50">
                        {memberCount} {memberCount === 1 ? "membro" : "membros"}
                      </span>
                    </div>
                  </div>
                  {group.owner_id === userId && (
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); setGroupToEdit({ id: group.id, name: group.name }); setEditName(group.name); }}
                        aria-label="Editar nome do grupo"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setGroupToDelete(group.id); }}
                        aria-label="Excluir grupo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-full gap-1.5 h-9 text-xs font-medium"
                    onClick={(e) => { e.stopPropagation(); copyInviteLink(group.invite_code, group.id); }}
                  >
                    {copiedId === group.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>{copiedId === group.id ? "Copiado!" : "Convidar"}</span>
                  </Button>
                  {group.owner_id === userId && (
                    <div className="flex sm:hidden items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); setGroupToEdit({ id: group.id, name: group.name }); setEditName(group.name); }}
                        aria-label="Editar nome do grupo"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setGroupToDelete(group.id); }}
                        aria-label="Excluir grupo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Excluir grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este grupo? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => groupToDelete && deleteGroup.mutate(groupToDelete)}
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!groupToEdit} onOpenChange={(o) => !o && setGroupToEdit(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Editar nome do grupo</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editName.trim() || !groupToEdit) return;
              updateGroupName.mutate({ groupId: groupToEdit.id, name: editName.trim() });
            }}
            className="space-y-4 mt-2"
          >
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              className="h-12 rounded-xl"
              placeholder="Nome do grupo"
            />
            <Button type="submit" className="w-full h-12 rounded-xl font-medium" disabled={!editName.trim() || updateGroupName.isPending}>
              {updateGroupName.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Criar Grupo</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              createGroup.mutate({ name: name.trim(), description: description.trim() });
            }}
            className="space-y-4 mt-2"
          >
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do grupo</label>
              <Input placeholder="Ex: Família, Amigos do trabalho..." value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-12 rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Descrição <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Textarea placeholder="Uma breve descrição do grupo..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="resize-none rounded-xl" />
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl font-medium" disabled={!name.trim() || createGroup.isPending}>
              {createGroup.isPending ? "Criando..." : "Criar Grupo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Grupos;
