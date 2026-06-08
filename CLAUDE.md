# Instruções do projeto — ATENDE.IA

Instruções permanentes para qualquer agente/assistente que trabalhe neste repositório.
**Estas regras têm prioridade e devem ser seguidas à risca.**

## 🎨 Design system

**Sempre respeite e siga o design system existente do projeto.** Reutilize os componentes, classes, tokens (cores `--accent`/`--surface`/`--border`/`--text`, tipografia, espaçamentos, `Drawer`/`Modal`/`MoneyInput`/`fin-section` etc.) e os padrões visuais já usados nas telas. Não invente estilos novos quando já existe um padrão; mantenha consistência visual com o resto do app. Na dúvida sobre um padrão, pergunte.

### Botões de ação padrão (`ActionButton`)
Para botões de ação, use sempre o componente padrão **`ActionButton`** (global, em `public/shell.jsx`): estilo pílula com fundo *tint* claro + ícone/texto na cor cheia da mesma família. Props: `action`, `size` (`lg`/`md`/`sm`), `onClick`, e `label`/`icon` opcionais.

**Cor + ícone fixos por ação** (não trocar):
| Ação | Cor (texto/ícone) | Fundo (tint) | Ícone |
|---|---|---|---|
| **Salvar** | `#3DA767` (verde) | `#C9F0D3` | `check` ✓ |
| **Voltar / Anterior / Excluir / Cancelar** | `#FF452A` (vermelho) | `#FFEBEC` | `arrow-left` ← (voltar/anterior) · `trash` 🗑 · `x` ✕ |

O botão **Salvar** tem o **efeito de comemoração** (onda de pontinhos → confete) **embutido**: ao clicar, a animação roda (~2s) e o `onClick` dispara no **fim**. Liga por padrão em `action="salvar"`; desligue num botão específico com `efeito={false}`.
| **Editar** | `#165EEE` (azul) | `#EAF0FE` | `edit` (lápis) |
| **Próximo** | `#3DA767` (verde) | `#C9F0D3` | `arrow-right` → (à **direita** do texto) |
| **Atenção** | `#FF8B30` (laranja) | `#FDEEE7` | `alert` |

Tamanhos — **Large** (altura 56 · padding lateral 20 · gap 8 · fonte 18 · ícone 24) · **Medium** (40 · 16 · 8 · 16 · 20) · **Small** (36 · 12 · 6 · 14 · 16). Daqui pra frente, novos botões de ação seguem esse padrão.

### Toasts (notificação) — `Toast` / `showToast`
Notificações usam o componente padrão **`Toast`** + host **`ToastHost`** (global, em `public/shell.jsx`, montado na raiz do app). Dispare de qualquer lugar: **`window.showToast({ tipo, titulo, descricao, duracao })`** (duração padrão 4s).

Estrutura: ícone num **campo branco** arredondado à esquerda · título negrito + descrição embaixo · **X** pra fechar à direita · fundo *tint* arredondado · **barrinha de ~2px** na base com contagem regressiva. Entra **de cima pra baixo** no canto superior direito; some sozinho ou no X.

**Regra de cor (sem preto):** título/ícone na **cor cheia** da família, descrição um tom **mais clara** (mix com branco), fundo no *tint* claro, barrinha na cor da família.
| Tipo | Cor (texto/ícone) | Fundo (tint) | Ícone |
|---|---|---|---|
| **sucesso** | `#3DA767` verde | `#C9F0D3` | `check-double` ✓✓ |
| **erro** | `#FF452A` vermelho | `#FFEBEC` | `x-circle` (círculo com X) |
| **aviso** | `#FF8B30` laranja | `#FDEEE7` | `alert` (triângulo) |
| **info** | `#165EEE` azul | `#EAF0FE` | `info` (i) |
| **neutro** | `#4B5563` cinza | `#EEF1F4` | `bell` (sino) |

### Botão "Criar +" expansível (`FabNovo`) — apelido **"Botão Efeito Criar +"**
Para o botão de **criar/novo** com efeito, use **`FabNovo`** (global, em `public/shell.jsx`; CSS `.fab-novo` em `public/styles.css`). Pílula gradiente verde-lima recolhida só com o **(+)**; no hover o **rótulo desliza pra esquerda** e o **(+) gira 180°** (molejo). **Ancore o botão à direita** (ex.: container `justify-content: flex-end`) pra o rótulo abrir pra esquerda. Props: `size` (`lg`/`md`/`sm`/`mini`), `label`, `onClick`.

| Tamanho | Altura | Círculo (+) | Fonte |
|---|---|---|---|
| **lg** | 56 | 47 | 18 |
| **md** | 40 | 33 | 16 |
| **sm** | 36 | 30 | 14 |
| **mini** | 28 | 23 | 12 |

### Card de criação (`AddCard`)
Para criar via **card tile** (não pílula), use **`AddCard`** (global, em `public/shell.jsx`; CSS `.add-card` em `public/styles.css`) — o mesmo modelo do **"Cadastrar conta"**: cartão tracejado com **círculo gradiente** (`--accent-grad`) + **(+) que gira 180° no hover**, título e subtítulo. Estica no grid pra acompanhar os cards irmãos. Props: `title`, `subtitle`, `icon` (padrão `plus`), `onClick`. Use quando o "criar" é um **bloco/card** numa grade (ex.: novo agente, novo modelo), não um botão de cabeçalho (esse é o `FabNovo`).

### Skeleton de carregamento (`Skeleton`) — apelido **"skeleton Carregamento"**
Para o esqueleto de carregamento, use o componente padrão **`Skeleton`** (global, em `public/shell.jsx`; CSS `.skeleton` em `public/styles.css`) — bloco cinza (`--surface-3`, respeita o tema escuro) com **shimmer leve**. API: `<Skeleton w={120} h={12} />` · `<Skeleton circle w={40} h={40} />` · `r` = raio.

**Regras (pra não "pular" e bater 100%):**
1. **Mesmo tamanho do real:** monte o skeleton a partir da **estrutura/medidas do próprio card/linha real** — reutilize as MESMAS classes e contêineres, só trocando texto/valores/imagem por `<Skeleton>`. Assim altura, largura, padding, border-radius e grid batem sozinhos.
2. **Mesmo grid / responsividade:** renderize o skeleton **DENTRO do mesmo grid/container** do conteúdo real (renderize o grid 1× e troque só o conteúdo: `{carregando ? <skeletons/> : itens.map(...)}`) — herda os breakpoints automaticamente, sem duplicar regra.
3. **Quantidade real:** use os helpers **`skelCount(key, fallback)`** / **`skelRemember(key, n)`** (lembram no `localStorage` a última quantidade carregada). Sem valor salvo, use **2–3** — nunca a tela toda. Grave a contagem real ao carregar (`skelRemember`).
4. **Some só quando o conteúdo chega:** o skeleton só desaparece quando os **dados realmente carregaram** (use um estado `loaded`/loading real) — **nunca por tempo fixo**, senão pisca o empty state antes do conteúdo. Padrão: `const showSkel = !loaded || skel;`.

Primeiro uso: CRM (funis + kanban) e Financeiro › Contas.

## 🔒 Regras de segurança ao mexer no banco de dados e no código

1. **Nunca apague nem destrua o que já existe** — tabelas, colunas, dados, funções ou políticas (RLS) — **sem me avisar claramente e pedir confirmação ANTES**.

2. **Prefira sempre mudanças aditivas e idempotentes:** usar `create table if not exists`, `add column if not exists`, `insert ... on conflict do nothing`, etc. **Adicionar é seguro; remover/alterar exige cuidado e aprovação.**

3. **Qualquer operação destrutiva** (`DROP`, `DELETE`, `TRUNCATE`, `ALTER` que remove ou muda algo existente) **deve ser sinalizada e aprovada por mim antes de rodar. Nunca execute por conta própria.**

4. **Preserve o que já funciona:** não quebre integrações de API já configuradas, a função `user_empresa_ids()`, as políticas de RLS existentes, nem o login.

5. **Versione tudo em migrations** (em `supabase/migrations/`), pra ser reproduzível e reversível. Nada de mudança de schema só no painel do Supabase.

6. **Reaproveite o que já existe** em vez de recriar do zero.

7. **Na dúvida, pare e me pergunte** — me mostre o plano antes de mexer em qualquer coisa que já existe.

### Como aplicar na prática
- Migrações de banco: eu (usuário) rodo o SQL no Supabase. O assistente **escreve o arquivo da migration + mostra o SQL no chat** para eu revisar e rodar — não executa DDL destrutivo sozinho.
- Mudanças de schema só podem **adicionar** (tabela/coluna/política nova). Para **remover ou alterar** algo existente: apresentar o plano, sinalizar o impacto e **esperar minha aprovação explícita**.
- Sempre validar a sintaxe antes de entregar (ex.: `node --check` no backend; transform Babel nos `.jsx`).
- Testar de ponta a ponta quando possível, e **limpar dados de teste** no fim.
