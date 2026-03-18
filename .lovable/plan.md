

# EUMIRATE - Plano de Implementação

## Visão Geral
Um ecossistema digital minimalista onde pessoas expressam seus desejos e criam conexões significativas através de presentes. Design clean, premium e emocionalmente acolhedor.

---

## 🏠 Página Inicial (Landing Page)
- Hero section com proposta de valor do EUMIRATE
- Mensagem acolhedora sobre o propósito da plataforma
- Botão de chamada para ação: "Criar minha lista"
- Visualização prévia de como uma lista se parece

---

## 🔐 Autenticação
- Login rápido com Google (1 clique)
- Experiência fluida sem fricção
- Redirecionamento automático após login

---

## 📋 Minha Lista de Desejos
**Funcionalidades principais:**
- Visualização elegante dos itens desejados
- Cada item mostra: foto, nome, descrição, faixa de preço, prioridade
- Indicador visual de itens já reservados (sem revelar quem reservou)
- Organização por categorias opcionais

**Adicionar novo item:**
- Formulário simples com campos: nome, descrição, faixa de preço, link externo (opcional), imagem
- Quando colar um link, tentar extrair automaticamente título e imagem
- Upload de foto manual como alternativa

---

## 🔗 Compartilhamento
- Botão para gerar link único da lista
- Link copiável com um clique
- Visitantes acessam sem precisar de conta
- Página pública mostra apenas a lista (sem dados sensíveis)

---

## 🎁 Experiência do Visitante
- Visualiza a lista completa
- Pode "Reservar" um presente (marcar que vai dar)
- Após reservar, item aparece com indicador visual sutil
- Reserva é anônima para o dono da lista (surpresa!)
- Opção de cancelar reserva caso mude de ideia

---

## 👤 Perfil do Usuário
- Nome e foto (do Google)
- Bio curta opcional ("Sobre mim")
- Configurações básicas da conta
- Gerenciar/deletar lista

---

## 🎨 Design & Experiência
- Tipografia elegante e legível
- Muito espaço em branco
- Cores neutras com acentos sutis
- Animações suaves e discretas
- Totalmente responsivo (mobile-first)
- Interface calma, sem sobrecarga visual

---

## 📱 Estrutura de Páginas
1. `/` - Landing page
2. `/login` - Autenticação
3. `/minha-lista` - Lista pessoal (logado)
4. `/lista/:id` - Lista pública (visitante)
5. `/perfil` - Configurações do perfil

