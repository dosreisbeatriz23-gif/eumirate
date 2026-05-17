import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  User, Settings, Shield, HelpCircle, LogOut, Camera,
  ChevronRight, List, Plus, Share2, Users, Gift,
  Eye, EyeOff, Lock, Mail, KeyRound
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";
import { toast } from "sonner";

const helpItems = [
  {
    id: "create-list",
    icon: List,
    question: "Como criar uma lista?",
    answer: "Vá até a aba \"Listas\" na barra de navegação. Toque no botão \"Nova Lista\", dê um nome e uma descrição opcional. Pronto, sua lista está criada!"
  },
  {
    id: "add-item",
    icon: Plus,
    question: "Como adicionar um item?",
    answer: "Toque no botão \"+\" na barra de navegação. Cole o link do produto ou preencha manualmente o nome e detalhes. O sistema extrairá automaticamente a imagem e o nome do produto."
  },
  {
    id: "share-friends",
    icon: Share2,
    question: "Como compartilhar com amigos?",
    answer: "Abra a lista que deseja compartilhar e toque no ícone de compartilhamento. Um link será gerado para você enviar por WhatsApp, e-mail ou qualquer outro meio."
  },
  {
    id: "join-group",
    icon: Users,
    question: "Como entrar em um grupo?",
    answer: "Peça o link de convite ao administrador do grupo. Ao abrir o link, você será redirecionado automaticamente para o grupo e poderá visualizar as listas compartilhadas."
  },
];

const Perfil = () => {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: { display_name?: string }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Perfil atualizado!");
      setEditingName(false);
    },
    onError: () => toast.error("Erro ao atualizar perfil"),
  });

  const handleSaveName = () => {
    if (newName.trim()) {
      updateProfile.mutate({ display_name: newName.trim() });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Você saiu da conta");
  };

  const displayName = profile?.display_name || user?.user_metadata?.full_name || "Usuário";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const email = user?.email || "";

  return (
    <div className="container mx-auto px-4 md:px-8 py-6 md:py-10 max-w-lg page-enter">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover shadow-card" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted/40 flex items-center justify-center shadow-card">
              <User className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
          <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
        <h2 className="text-xl font-serif text-foreground">{displayName}</h2>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-6 bg-muted/30 rounded-2xl p-1 h-auto">
          <TabsTrigger value="settings" className="rounded-xl py-2.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="privacy" className="rounded-xl py-2.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Conta
          </TabsTrigger>
          <TabsTrigger value="help" className="rounded-xl py-2.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Ajuda
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          {/* Name */}
          <div className="p-4 rounded-2xl bg-card border border-border/20 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nome</p>
                  <p className="text-xs text-muted-foreground">{displayName}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
                onClick={() => { setEditingName(!editingName); setNewName(displayName); }}
              >
                {editingName ? "Cancelar" : "Editar"}
              </Button>
            </div>
            {editingName && (
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Seu nome"
                  className="rounded-xl text-sm"
                />
                <Button size="sm" className="rounded-xl" onClick={handleSaveName}>
                  Salvar
                </Button>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="p-4 rounded-2xl bg-card border border-border/20 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">E-mail</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
            </div>
          </div>

          {/* Password */}
          <div className="p-4 rounded-2xl bg-card border border-border/20 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Senha</p>
                <p className="text-xs text-muted-foreground">••••••••</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
            </div>
          </div>

          {/* Photo */}
          <div className="p-4 rounded-2xl bg-card border border-border/20 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center">
                <Camera className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Foto de perfil</p>
                <p className="text-xs text-muted-foreground">Alterar imagem</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
            </div>
          </div>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-border/20 shadow-soft space-y-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Privacidade
            </h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Perfil público</p>
                  <p className="text-xs text-muted-foreground">Outros podem ver seu perfil</p>
                </div>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <EyeOff className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Listas privadas por padrão</p>
                  <p className="text-xs text-muted-foreground">Novas listas começam privadas</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-destructive/20 shadow-soft hover:shadow-card transition-all duration-300 group"
          >
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-sm font-medium text-destructive flex-1 text-left">Sair da conta</span>
            <ChevronRight className="w-4 h-4 text-destructive/30" />
          </button>
        </TabsContent>

        {/* Help Tab */}
        <TabsContent value="help" className="space-y-2">
          <Accordion type="single" collapsible className="space-y-2">
            {helpItems.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="rounded-2xl bg-card border border-border/20 shadow-soft px-4 overflow-hidden"
              >
                <AccordionTrigger className="py-4 hover:no-underline gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground text-left">{item.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pl-12 text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Perfil;
