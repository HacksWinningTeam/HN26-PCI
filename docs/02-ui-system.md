# 02 — Shared UI System (Global Baseline)

> Lightweight global foundation only. Product screens and UX rules are defined in [`docs/PROJECT_KNOWLEDGE.md`](PROJECT_KNOWLEDGE.md) (Section 9), and interactive tokens/patterns are showcased at `/design-system`. Per-screen layouts, component hierarchies, and interactive states are designed **per task** inside each `docs/tasks/TXX-*.md` via `hackathon-ui-design` immediately before implementing that task.

## Baseline & Constraints

- **Framework:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (`@import "tailwindcss";` in `frontend/src/app/globals.css`).
- **Accessibility Baseline:** **WCAG 2.2 AA** with `light` / `dark` / `system` appearance support (`DEC-001`) using CSS `light-dark()` semantic tokens (`--color-canvas`, `--color-surface`, `--color-text`, `--color-border`, `--color-accent`).
- **Localization Baseline:** `pl-PL` (default) and `en-US` via `LocaleProvider` + `useTranslations()` (`DEC-001`), persisted in `localStorage` (`hn26-locale`) with pre-hydration sync.
- **Contrast & Targets:** `>= 4.5:1` normal text contrast, `>= 3:1` borders/controls contrast, visible `:focus-visible` outlines, `>= 44px` (`min-h-11`) interactive targets, non-color status cues (`PASS`/`FAIL` badges or icons + text), and `aria-live="polite"` for live updates.

## App Shell & Navigation

- **Application shell width (`DEC-012`, `DEC-013`):** the shared `AppShellLayout` fills the viewport, keeping the sidebar at the left with its existing outer padding. Page content, footer contents, and navbar controls are centered within the right column and capped at 1600px via `--app-shell-content-max-width`. Navbar and footer backgrounds/borders span the entire right column. Narrower screens and embedded previews remain fluid; the public footer retains its separate width/padding.
- **Layout patterns:** sidebar + page-context `NavBar` for application views; a separate `PublicNavBar` for the landing page and future login/registration views (`DEC-008`). The public pattern is available in `/design-system#navigation-bars` before integration into product routes.
- **Mobile application shell (`DEC-009`):** one header row holds the sidebar menu toggle, page title, and icon-only actions with accessible names. Breadcrumbs are hidden on mobile. Search stays in the navbar on desktop and appears inside the expanded sidebar menu on mobile, above its links; both inputs share the same query. Sidebar collapse/mini-rail behavior remains available on desktop only (`DEC-010`). Mobile always shows the full sidebar with labels and no collapse button, including after switching from a collapsed desktop sidebar; mobile menu disclosure remains. The Navigation bars gallery includes a forced mobile preview with working menu, search, actions, and Escape/focus restoration.
- **Public navbar:** logo links home; landing links are `Przeglądaj innowacje` and `Znajdź rozwiązanie`; settings (language), accessibility (shared preferences sheet), and the accented `Zaloguj się` action sit on the right. Account variants omit discovery links: login offers `Załóż konto`, registration offers `Zaloguj się`. No separate “Powrót do strony głównej” link. On narrow containers, settings/accessibility remain visible as named icon buttons; a disclosure reveals navigation and the account action, closes with Escape, and restores focus. Semantic tokens, Polish/English labels, and 44px targets apply throughout.
- **Primary Navigation Items (`DEC-014`):** `Szukaj innowacji`, `Porównaj`; po zalogowaniu także `Moje wdrożenia`; dla uprawnionego operatora `Panel PCI`. `Źródła` i `Trendy` mogą być drugorzędne.
- **Unified discovery (`DEC-014`):** `/innovations` combines keyword search, catalog filters, and optional problem description/context. One result list supports grid/table, comparison, favorites, CSV/PDF, and notifications. Problem results expose actual API scores and their 40/20/20/20 weights. The product shell omits its duplicate desktop/mobile search on this screen; other screens and design-system gallery search retain their existing behavior. `/solve` redirects to `/innovations?mode=problem`, preserving query parameters. The two landing entrances remain valid.
- **Public-to-Account Boundary:** katalog, wyszukiwanie problemu, karty i porównanie są publiczne. Rejestrację pokazujemy dopiero przy akcji wymagającej zapisu: generowanie planu, odsłonięcie dostępnych zweryfikowanych danych kontaktowych, zapis porównania albo śledzenie postępu.
- **Audience Labels:** określenia takie jak `Seniorzy`, `Dzieci` lub `Osoby z niepełnosprawnościami` są tagami beneficjentów innowacji. Nie mogą być prezentowane jako role konta.
- **Nested Information Depth:** poziom 1 to skrócona karta w wynikach; poziom 2 to publiczny ekran szczegółów ze źródłami i oceną; poziom 3 „Odkryj” jest dostępny po rejestracji i zawiera plan odpowiedni do dojrzałości, dane kontaktowe potrzebne do wykonania planu oraz zapis postępu.
- **Match Explanation:** wynik pokazuje łączny procent oraz cztery podpisane składowe (`Problem 40%`, `Branża 20%`, `Beneficjenci 20%`, `Typ organizacji 20%`). Lokalizacja pozostaje osobnym filtrem/polem i nie może być podpisana jako obszar innowacji.
- **Innovation Taxonomy:** główny obszar (`Technologiczny`, `Edukacyjny`, `Administracyjny`) oraz charakter (`Produktowy`, `Procesowy`, `Organizacyjny`, `Społeczny`) są prezentowane jako osobne grupy tagów.

- **Discovery filter layout (`DEC-015`, T03):** search and filters share one top surface; full-width results have no second sidebar. Four primary fields (area, sector, beneficiaries, deployment level), inline advanced disclosure (character, TRL, origin, source organization, verification), and removable chips. Controls wrap to two columns then one; no horizontal scrolling. Screen-specific composition reuses existing primitives; no new global primitive or theme.

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
| `DesignSystemPage` & `GalleryShell` | `frontend/src/app/design-system/` | Interactive design system gallery (`/design-system`) with section search, hash navigation, foundations, and planned slots | `DEC-003` |
| `PublicNavBar` | `frontend/src/components/ui/public-nav-bar.tsx` | Responsive public header with landing/login/register variants, settings and accessibility sheets; interactive previews in Navigation bars | `DEC-008` |
| `Popover` | `frontend/src/components/ui/popover.tsx` | Anchored floating card with viewport placement, Escape/outside dismissal, and mobile modal dialog fallback | `DEC-006` |
| `SimpleTable` & `DataTable` | `frontend/src/components/ui/simple-table.tsx`, `data-table.tsx` | Accessible lightweight presentation table (`SimpleTable`) and query/selection/detail-drawer table (`DataTable`) with scoped feature set | `DEC-006` |
| `Brand*Icon` | `frontend/src/components/ui/brand-icons.tsx` | 24 custom SVG brand illustrations, status pills, and organic accents driven by `--brand-icon-*` tokens across light, dark, high-contrast, and grayscale themes | Design system |
| `BrandPhoto` | `frontend/src/components/ui/brand-photo.tsx` | Responsive photo masks (`pebble`, `arch`, `hillside`), optional cyan/lime bursts at top-right or bottom-left, required `alt`, `objectPosition`, Next Image `sizes`, per-instance SVG clip IDs; gallery examples use local demo photos | `DEC-007` |

## Reference Assets (`docs/inputs/ui/`)

- `<List any logo, palette, or screenshot filenames placed in docs/inputs/ui/>`
