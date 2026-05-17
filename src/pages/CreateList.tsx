import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CreateList = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      queryClient.invalidateQueries({ queryKey: ["wishlists"] });
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
    <div>
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-10 max-w-lg">
        <h2 className="text-3xl title-gliker mb-8">
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
    </div>
  );
};

export default CreateList;
