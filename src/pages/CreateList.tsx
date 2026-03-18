import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocalUser } from "@/hooks/useLocalUser";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const CreateList = () => {
  const { userId } = useLocalUser();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .insert({
          user_id: userId,
          title: title.trim() || "Minha Lista de Desejos",
          description: description.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Lista criada!");
      navigate(`/lista/${data.id}`, { replace: true });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao criar lista"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-serif font-medium text-foreground">
            <span className="text-gradient">EUMIRATE</span>
          </h1>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 max-w-lg">
        <h2 className="text-3xl font-serif font-medium text-foreground mb-8">
          Criar Nova Lista
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Nome da lista *
            </label>
            <Input
              placeholder="Ex: Aniversário 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Descrição
            </label>
            <Textarea
              placeholder="Uma breve descrição da sua lista"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              className="min-h-[100px]"
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Criando..." : "Criar Lista"}
          </Button>
        </form>
      </div>
    </main>
  );
};

export default CreateList;
