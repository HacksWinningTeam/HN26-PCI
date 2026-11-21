# 02 — Shared UI System (Global Baseline)

> Lightweight global foundation only. Product screens and UX rules are defined in [`docs/PROJECT_KNOWLEDGE.md`](PROJECT_KNOWLEDGE.md) (Section 9), and interactive tokens/patterns are showcased at `/design-system`. Per-screen layouts, component hierarchies, and interactive states are designed **per task** inside each `docs/tasks/TXX-*.md` via `hackathon-ui-design` immediately before implementing that task.

## Baseline & Constraints

- **Framework:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (`@import "tailwindcss";` in `frontend/src/app/globals.css`).
- **Accessibility Baseline:** **WCAG 2.2 AA** with `light` / `dark` / `system` appearance support (`DEC-001`) using CSS `light-dark()` semantic tokens (`--color-canvas`, `--color-surface`, `--color-text`, `--color-border`, `--color-accent`).
- **Localization Baseline:** `pl-PL` (default) and `en-US` via `LocaleProvider` + `useTranslations()` (`DEC-001`), persisted in `localStorage` (`hn26-locale`) with pre-hydration sync.
- **Contrast & Targets:** `>= 4.5:1` normal text contrast, `>= 3:1` borders/controls contrast, visible `:focus-visible` outlines, `>= 44px` (`min-h-11`) interactive targets, non-color status cues (`PASS`/`FAIL` badges or icons + text), and `aria-live="polite"` for live updates.

## App Shell & Navigation

- **Global Layout (`frontend/src/app/layout.tsx`):** `<Header brand/nav, max-width container, footer>`
- **Primary Navigation Items:** `Szukaj rozwiązania`, `Innowacje`, `Porównaj`; po zalogowaniu także `Moje wdrożenia`; dla uprawnionego operatora `Panel PCI`. `Źródła` i `Trendy` mogą być drugorzędne.
- **Public-to-Account Boundary:** katalog, wyszukiwanie problemu, karty i porównanie są publiczne. Rejestrację pokazujemy dopiero przy akcji wymagającej zapisu: generowanie planu, odsłonięcie dostępnych zweryfikowanych danych kontaktowych, zapis porównania albo śledzenie postępu.
- **Audience Labels:** określenia takie jak `Seniorzy`, `Dzieci` lub `Osoby z niepełnosprawnościami` są tagami beneficjentów innowacji. Nie mogą być prezentowane jako role konta.
- **Nested Information Depth:** poziom 1 to skrócona karta w wynikach; poziom 2 to publiczny ekran szczegółów ze źródłami i oceną; poziom 3 „Odkryj” jest dostępny po rejestracji i zawiera plan odpowiedni do dojrzałości, dane kontaktowe potrzebne do wykonania planu oraz zapis postępu.
- **Match Explanation:** wynik pokazuje łączny procent oraz cztery podpisane składowe (`Problem 40%`, `Branża 20%`, `Beneficjenci 20%`, `Typ organizacji 20%`). Lokalizacja pozostaje osobnym filtrem/polem i nie może być podpisana jako obszar innowacji.
- **Innovation Taxonomy:** główny obszar (`Technologiczny`, `Edukacyjny`, `Administracyjny`) oraz charakter (`Produktowy`, `Procesowy`, `Organizacyjny`, `Społeczny`) są prezentowane jako osobne grupy tagów.

## Color & Typography Tokens

- **Page Surface / Card Surface:** `#f8fafc` (`bg-slate-50`) / `#ffffff` (`bg-white`)
- **Primary / Secondary Text:** `#0f172a` (`text-slate-900`) / `#334155` (`text-slate-700`)
- **Primary Action / Focus Accent:** `#1d4ed8` (`bg-blue-700` / `hover:bg-blue-800`)
- **Semantic Statuses:** Success (`emerald-50` / `emerald-700` / `emerald-950`), Warning (`amber-50` / `amber-700` / `amber-950`), Error (`red-50` / `red-700` / `red-950`)
- **Typography Scale:** `<Display / H1 / H2 / Body / Mono notes>`

## Shared UI Primitives

Track reusable components as tasks create or update them:

| Component | Path | Purpose | Introduced In |
| --- | --- | --- | --- |
| `HealthStatusCard` | `frontend/src/components/HealthStatusCard.tsx` | Live API & DB connectivity banner pattern | Starter template |
| `DesignSystemPage` & `GalleryShell` | `frontend/src/app/design-system/` | Interactive design system gallery (`/design-system`) with section search, hash navigation, foundations, and planned slots | `DEC-003` |
| `Popover` | `frontend/src/components/ui/popover.tsx` | Anchored floating card with viewport placement, Escape/outside dismissal, and mobile modal dialog fallback | `DEC-006` |
| `SimpleTable` & `DataTable` | `frontend/src/components/ui/simple-table.tsx`, `data-table.tsx` | Accessible lightweight presentation table (`SimpleTable`) and query/selection/detail-drawer table (`DataTable`) with scoped feature set | `DEC-006` |
| `Brand*Icon` | `frontend/src/components/ui/brand-icons.tsx` | 24 custom SVG brand illustrations, status pills, and organic accents driven by `--brand-icon-*` tokens across light, dark, high-contrast, and grayscale themes | Design system |
| `BrandPhoto` | `frontend/src/components/ui/brand-photo.tsx` | Responsive photo masks (`pebble`, `arch`, `hillside`), optional cyan/lime bursts at top-right or bottom-left, required `alt`, `objectPosition`, Next Image `sizes`, per-instance SVG clip IDs; gallery examples use local demo photos | `DEC-007` |

## Reference Assets (`docs/inputs/ui/`)

- `<List any logo, palette, or screenshot filenames placed in docs/inputs/ui/>`
