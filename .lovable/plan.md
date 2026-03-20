

## Plano: Estrutura Completa de Navegacao EUMIRATE

### O que sera feito

Criar um layout responsivo com navegacao global que envolve todas as paginas internas do app, separando desktop (header fixo com menu) e mobile (bottom tab bar com icones).

### Estrutura

```text
App.tsx
  └─ AppLayout (wrapper com navegacao)
       ├─ Desktop: Header fixo (logo + menu horizontal)
       ├─ Mobile: Bottom tab bar (5 icones)
       └─ <Outlet /> (conteudo da pagina)
```

**Desktop Header**: Logo "Eumirate" a esquerda, links a direita: Criar Lista, Minhas Listas, Grupos, Perfil.

**Mobile Bottom Bar**: 5 tabs com icones - Home (`Home`), Listas (`List`), Adicionar (`PlusCircle`), Grupos (`Users`), Perfil (`User`).

### Arquivos a criar/editar

1. **Criar `src/components/layout/AppLayout.tsx`**
   - Componente com header desktop (hidden no mobile) e bottom bar mobile (hidden no desktop)
   - Header: sticky top, logo clicavel, nav links com destaque no ativo
   - Bottom bar: fixed bottom, 5 icones com label pequeno, destaque no ativo
   - Padding-bottom no conteudo mobile para nao cobrir a tab bar
   - Usa `useLocation` para destacar a tab ativa

2. **Criar `src/pages/Perfil.tsx`**
   - Pagina simples de perfil placeholder com nome do usuario local e opcoes basicas

3. **Criar `src/pages/Grupos.tsx`**
   - Mover o conteudo de grupos que esta em `Categorias.tsx` para esta pagina dedicada

4. **Editar `src/App.tsx`**
   - Criar rota agrupada com `AppLayout` como layout pai usando nested routes
   - Redirecionar `/` para landing (sem layout) e paginas internas com layout
   - Adicionar rotas: `/grupos`, `/perfil`
   - Manter `/` (landing) e `*` (404) fora do layout

5. **Editar paginas existentes** (Dashboard, CreateList, ListDetail, AddItem, MeusDesejos, Categorias)
   - Remover headers individuais duplicados (logo + back button) de cada pagina
   - O header agora vem do AppLayout
   - Manter apenas o conteudo interno de cada pagina

### Mapeamento de rotas

| Rota | Pagina | Tab ativa (mobile) |
|------|--------|-------------------|
| /dashboard | Dashboard (Minhas Listas) | Listas |
| /criar-lista | CreateList | Listas |
| /lista/:id | ListDetail | Listas |
| /lista/:id/adicionar | AddItem | Adicionar |
| /meus-desejos | MeusDesejos | Listas |
| /categorias | Categorias | Home |
| /grupos | Grupos | Grupos |
| /perfil | Perfil | Perfil |

### Design

- Header desktop: bg-card/50 backdrop-blur, border-bottom sutil, altura ~60px
- Bottom bar mobile: bg-card border-top, altura ~64px, icones 20px, labels 10px
- Tab ativa: cor primary, inativa: muted-foreground
- Transicoes suaves nos icones
- Conteudo com padding-bottom de 80px no mobile

