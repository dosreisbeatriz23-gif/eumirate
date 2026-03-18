
Objetivo: corrigir de vez o fluxo de “Criar Lista”, que hoje parece quebrado mesmo com o clique funcionando.

Diagnóstico
- O botão está disparando corretamente o submit.
- O erro real acontece no backend: a inserção retorna `409` com `duplicate key value violates unique constraint "wishlists_user_id_key"`.
- Isso confirma que a tabela `wishlists` ainda está configurada para permitir apenas 1 lista por `user_id`, enquanto a interface já foi construída para múltiplas listas.

Plano de correção
1. Corrigir a estrutura do banco
- Criar uma migration para remover a constraint única `wishlists_user_id_key` da tabela `public.wishlists`.
- Manter o índice normal em `user_id` para continuar rápido listar as listas do usuário local.
- Não alterar as políticas atuais agora, porque o bloqueio não é RLS; a inserção já está chegando ao banco.

2. Ajustar o fluxo de criação no frontend
- Manter o `insert` do `CreateList` como está, porque a lógica está correta.
- Melhorar o `onError` para mostrar a mensagem real retornada pelo backend quando houver falha, em vez de sempre “Erro ao criar lista”.
- Invalidar a query de listas após sucesso para garantir que “Minhas Listas” atualize imediatamente ao voltar.

3. Revisar compatibilidade com múltiplas listas
- Confirmar que `Dashboard` e `Categorias` continuam listando todas as listas normalmente.
- Confirmar que `ListDetail` continua abrindo pelo `id` da lista criada.
- Confirmar que `AddItem` continua salvando em uma lista válida sem criar conflito com a nova estrutura.
- Manter `MeusDesejos` usando a primeira lista como lista padrão, sem quebrar o restante do app.

4. Validar o fluxo completo
- Criar uma primeira lista.
- Criar uma segunda lista com outro nome.
- Verificar se ambas aparecem em “Minhas Listas”.
- Abrir cada lista e confirmar que a navegação funciona.
- Salvar um item dentro de uma das listas e verificar se ele aparece no lugar certo.

Detalhes técnicos
- Constraint problemática: `public.wishlists -> wishlists_user_id_key`
- Evidência confirmada: `POST /rest/v1/wishlists` respondendo `409` com código `23505`
- Estado atual do schema: a foreign key já foi removida, mas a unicidade em `user_id` ainda ficou ativa
- Conclusão: o problema não é no clique do botão, e sim na regra antiga do banco que ainda impede criar mais de uma lista
