## Objetivo
No mobile, colocar título e botão na MESMA LINHA (lado a lado) em Home, Grupos e Meus Desejos, e padronizar os textos em Title Case (sem caixa alta), mantendo tudo dentro da tela.

## Causa do texto em CAIXA ALTA
A classe `.title-gliker` em `src/index.css` aplica `text-transform: uppercase`. Por isso "Mural de Inspiração" aparece como "MURAL DE INSPIRAÇÃO" e "Meus Grupos" como "MEUS GRUPOS", mesmo com o JSX em Title Case.

## Alterações

### 1. `src/index.css` (classe `.title-gliker`)
Remover `text-transform: uppercase;` para que os títulos respeitem o casing do JSX (Title Case).
Impacto: Home, Grupos, Meus Desejos, Presentes, Dashboard, AddItem, CreateList passarão a exibir os títulos em Title Case (que é exatamente o pedido recorrente do usuário). Não muda fonte, peso, cor ou tamanho.

### 2. `src/pages/Home.tsx` (header)
- Voltar para layout em linha única no mobile: `flex items-center justify-between gap-3` (sem `flex-col`).
- Título: reduzir um pouco para caber confortavelmente em 390px → `text-2xl sm:text-4xl title-gliker tracking-tight` e `truncate` para evitar overflow.
- Manter subtítulo "Meus Desejos" abaixo do título (dentro do div esquerdo).
- Botão "Adicionar Item": compacto no mobile, expandido no desktop → `shrink-0 rounded-full gap-2 h-10 px-4 sm:h-11 sm:px-6 text-[13px]`. Largura automática (sem `w-full`).

### 3. `src/pages/Grupos.tsx` (header)
- Já está `flex items-center justify-between`. Apenas:
  - Título: `text-2xl sm:text-4xl title-gliker tracking-tight truncate` para caber.
  - Botão: trocar label "Criar Grupo" → "Adicionar" (conforme imagem do usuário). Manter `rounded-full gap-2 h-10 px-4 text-[13px] shrink-0`.

### 4. `src/pages/MeusDesejos.tsx` (header)
- Trocar `flex-col gap-4 sm:flex-row` por `flex items-center justify-between gap-3` (linha única no mobile).
- Título: `text-2xl sm:text-4xl title-gliker tracking-tight truncate`.
- Mover o subtítulo "Organize seus desejos…" para baixo do título (continua dentro do div esquerdo); ele pode quebrar/ocultar via `hidden sm:block` se ficar apertado.
- Botão "Nova lista": `shrink-0 rounded-full gap-2 h-10 px-4 sm:h-11 sm:px-5 shadow-elevated` (sem `w-full`).

## Textos padronizados (Title Case)
- "Mural de Inspiração"
- "Meus Desejos"
- "Adicionar Item"
- "Meus Grupos"
- Botão Grupos: "Adicionar"

## Fora do escopo
Sem mudanças em lógica, queries, rotas ou backend. Apenas classes Tailwind e o CSS do `.title-gliker`.
