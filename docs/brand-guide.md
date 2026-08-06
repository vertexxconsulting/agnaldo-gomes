# Brand Guide — Agnaldo Gomes Studio de Beleza

> Documento de referência para manter a identidade visual consistente em todos os pontos de contato digitais.

---

## 1. Paleta de Cores

### Primárias
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-primary` | `#D4AF37` | Dourado premium — botões, links, destaques |
| `--color-primary-foreground` | `#0D0D0D` | Texto sobre fundo dourado |
| `--color-primary-hover` | `#B5952F` | Hover dos botões primários |

### Neutras (Tema Escuro)
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-background` | `#0F0F11` | Fundo principal do site |
| `--color-foreground` | `#EBEBEB` | Texto principal sobre fundo escuro |
| `--color-card` | `#1A1A1D` | Superfícies de cards e painéis |
| `--color-secondary` | `#F5F5DC` | Bege claro — acentos e destaques |

> **Fonte oficial:** os tokens vivem em `app/globals.css` no bloco `@theme inline`. É lá que a paleta é definida — qualquer alteração deve ser feita nesse arquivo. O antigo `app/design/tokens.css` foi removido por ser órfão e conflitar com o `@theme`.

### Status
| Token | Valor | Uso |
|-------|-------|-----|
| `--color-success` | `#10B981` | Confirmações, badges de sucesso |
| `--color-warning` | `#F59E0B` | Alertas, atenção |
| `--color-danger` | `#EF4444` | Erros, cancelamentos |

### Grayscale
O Tailwind v4 já fornece a escala completa `gray-*` (de `gray-50` `#F9FAFB` até `gray-900` `#111827`) via utilitários nativos (`text-gray-400`, `bg-gray-800`, etc.) — não é necessário declarar tokens manuais para isso.

---

## 2. Tipografia

### Fontes
| Variável | Fonte | Uso |
|----------|-------|-----|
| `--font-family-sans` | **Inter** | Corpo de texto, labels, botões, UI |
| `--font-family-serif` | **Playfair Display** | Títulos de seções, headlines de destaque |

### Pesos
- `400` Regular — corpo de texto
- `500` Medium — labels, subtítulos
- `600` Semibold — botões, navegação
- `700` Bold — títulos, headings

### Escala de Tamanhos
| Token | Valor | Contexto |
|-------|-------|----------|
| `--font-size-xs` | 12px | Micro-labels, badges |
| `--font-size-sm` | 14px | Subtextos, links menores |
| `--font-size-base` | 16px | Corpo de texto padrão |
| `--font-size-lg` | 18px | Texto de destaque |
| `--font-size-xl` | 20px | Subtítulos |
| `--font-size-2xl` | 24px | Títulos de cards |
| `--font-size-3xl` | 30px | Títulos de seção (mobile) |
| `--font-size-4xl` | 36px | Títulos de seção (tablet) |
| `--font-size-5xl` | 48px | Headlines (desktop) |
| `--font-size-6xl` | 60px | Hero titles |

---

## 3. Espaçamento

Base de **4px** (`--spacing-1 = 0.25rem`). Escala completa de `--spacing-1` até `--spacing-16`.

**Regras gerais:**
- Padding interno de cards: `--spacing-8` (32px)
- Gap entre cards em grid: `--spacing-5` (20px) ou `--spacing-6` (24px)
- Margem entre seções: `--spacing-12` (48px) a `--spacing-16` (64px)

---

## 4. Componentes

### Button
Variantes: `primary`, `secondary`, `outline`, `ghost`
Tamanhos: `sm` (h-9), `md` (h-11), `lg` (h-14)

```tsx
<Button variant="primary" size="lg">Agendar Horário</Button>
<Button variant="outline" size="sm">Editar</Button>
```

### CardGlass
Card com efeito glassmorphism (fundo semi-transparente + blur).
Propriedade `withBorder` controla a borda sutil.

```tsx
<CardGlass>Conteúdo aqui</CardGlass>
<CardGlass withBorder={false}>Sem borda</CardGlass>
```

### SectionTitle
Título de seção com subtítulo em uppercase, barra dourada decorativa.
Alinhamentos: `left`, `center`, `right`.

```tsx
<SectionTitle title="Academy" subtitle="Formação de Elite" align="center" />
```

---

## 5. Efeitos Visuais

### Glassmorphism
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

### Text Gradient
```css
background-image: linear-gradient(to right, var(--color-primary), var(--color-secondary));
-webkit-background-clip: text;
color: transparent;
```

---

## 6. Elevação (Sombras)

| Nível | Token | Uso |
|-------|-------|-----|
| Sutil | `--shadow-sm` | Elementos de UI menores |
| Médio | `--shadow-md` | Cards, dropdowns |
| Alto | `--shadow-lg` | Modais, elementos elevados |
| Extra | `--shadow-xl` | Hover states, destaque |
| Max | `--shadow-2xl` | Hero, overlay |

---

## 7. Breakpoints

| Token | Largura | Uso |
|-------|---------|-----|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop pequeno |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Telas grandes |

**Regra:** Sempre design mobile-first. Usar `grid-cols-1` como base e adicionar colunas via `md:grid-cols-2`, `lg:grid-cols-3`.

---

## 8. Regras de Uso

1. **Nunca** usar o dourado (#D4AF37) como cor de fundo de grandes áreas — apenas para CTAs, bordas, ícones e textos de destaque.
2. **Sempre** manter contraste mínimo WCAG AA entre texto e fundo (4.5:1 para texto normal, 3:1 para texto grande).
3. **Imagens** devem ser grandes, bem tratadas e com filtro escuro sobreposto quando usadas como background.
4. **Fontes**: Inter para todo texto funcional, Playfair Display exclusivamente para títulos de impacto visual.
5. **Espaçamento**: Usar sempre múltiplos de 4px. Nunca valores arbitrários.
