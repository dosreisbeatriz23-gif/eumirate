## Diagnóstico

Verifiquei o banco e o código. A query em `GroupDetail.tsx` e as policies de RLS já estão corretas: itens com `visibility IN ('public','group')` em listas com `visibility IN ('public','group')` ficam visíveis para qualquer membro do mesmo grupo do dono.

O problema está em uma inconsistência de dados: **um item pode estar marcado como `private` mesmo estando dentro de uma lista pública**. Quando isso acontece, ele aparece para o dono em "Minhas Listas" mas não aparece para os outros membros do grupo — e é exatamente esse o sintoma relatado.

Causas em que isso acontece hoje:

1. O usuário adiciona um item escolhendo "privado" e o sistema o coloca em uma lista pessoal (privada), mas se a lista de destino existente for pública, o item entra como `private` dentro de uma lista pública.
2. Itens antigos criados antes da migração de visibilidade ficaram com `visibility='private'` mesmo após a lista virar pública.
3. Em `AddItem.tsx`, a visibilidade do item é decidida pelo toggle do formulário e não pela visibilidade da lista de destino — então é possível salvar item privado dentro de lista pública.

## Plano de correção

### 1. Regra de ouro no backend (migration)

Adicionar trigger em `wishlist_items` que sincroniza a `visibility` do item com a visibilidade da lista de destino sempre que o item é inserido ou atualizado:

- Se a lista é `public` → o item vira `public`.
- Se a lista é `private` → o item vira `private`.
- Se a lista é `group` → o item vira `group`.

Isso elimina a possibilidade de inconsistência futura, independente do que o cliente envie.

### 2. Corrigir os itens já existentes (data fix)

Rodar uma atualização única: para cada item, fazer `wishlist_items.visibility = wishlists.visibility` da lista pai. Isso resolve imediatamente os itens "perdidos" que existem hoje em listas públicas.

### 3. Simplificar `AddItem.tsx` (frontend)

- Remover o toggle "privado/público" do item: a visibilidade passa a ser definida pela lista escolhida.
- Mostrar com clareza qual lista está selecionada e se ela é pública ou privada (badge ao lado do nome).
- Quando o usuário entra em "Adicionar item" a partir de um grupo (`/adicionar?group=...`), pré-selecionar a lista pública padrão "Presentes Que Quero Ganhar" (criando-a se não existir, como já é feito hoje).

### 4. Reforço visual em `GroupDetail.tsx`

- Mostrar contador "X presentes compartilhados por Y membros" no topo (já existe — manter).
- Caso a query retorne zero itens mas existam membros, exibir uma mensagem explicativa: "Os membros ainda não compartilharam presentes públicos neste grupo. Para compartilhar, adicione itens à sua lista 'Presentes Que Quero Ganhar'."
- Manter o realtime já configurado para `wishlist_items` para refletir mudanças imediatamente.

## Detalhes técnicos

```sql
-- Migration
CREATE OR REPLACE FUNCTION public.sync_item_visibility_to_list()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_list_vis text;
BEGIN
  SELECT visibility INTO v_list_vis FROM public.wishlists WHERE id = NEW.wishlist_id;
  NEW.visibility := v_list_vis;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_item_visibility
BEFORE INSERT OR UPDATE OF wishlist_id ON public.wishlist_items
FOR EACH ROW EXECUTE FUNCTION public.sync_item_visibility_to_list();

-- Data fix (insert tool)
UPDATE public.wishlist_items wi
SET visibility = w.visibility, updated_at = now()
FROM public.wishlists w
WHERE w.id = wi.wishlist_id AND wi.visibility <> w.visibility;
```

Frontend: ajustes em `src/pages/AddItem.tsx` (remover toggle e usar visibilidade da lista) e em `src/pages/GroupDetail.tsx` (mensagem vazia mais útil).

## Resultado esperado

- Qualquer item criado dentro de uma lista pública passa a aparecer automaticamente para todos os membros do mesmo grupo, com o botão "Reservar Presente" funcionando.
- Itens em listas privadas continuam invisíveis para terceiros.
- Não há mais possibilidade de o usuário "esquecer" de marcar como público.
