import Link from "next/link";
import { LandingSearchForm } from "@/components/LandingSearchForm";
import { SkipToContentLink } from "@/components/SkipToContentLink";
import {
  AppFooter,
  ArrowRightIcon,
  BrandBlobCyanIcon,
  BrandBlobLimeIcon,
  BrandChecklistIcon,
  BrandCurveLimeIcon,
  BrandLayersIcon,
  BrandLimeBurstIcon,
  BrandMagnifierIcon,
  BrandPhoto,
  BrandRocketIcon,
  BrandScalesIcon,
  BrandSearchQuestionIcon,
  BrandTargetIcon,
  PublicNavBar,
} from "@/components/ui";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Opisz problem lub przeszukaj katalog",
    description:
      "Bez logowania sprawdzisz dopasowanie, główne założenia i publiczne źródła projektu.",
    Icon: BrandSearchQuestionIcon,
  },
  {
    step: "02",
    title: "Porównaj wybrane rozwiązania",
    description:
      "Zestaw obok siebie poziom gotowości TRL, odbiorców i wymagania wdrożeniowe.",
    Icon: BrandScalesIcon,
  },
  {
    step: "03",
    title: "Przejdź do planu wdrożenia",
    description:
      "Po rejestracji wygenerujesz 5-fazową checklistę dopasowaną do Twojej organizacji.",
    Icon: BrandChecklistIcon,
  },
] as const;

export default function HomePage() {
  return (
    <>
      <SkipToContentLink />
      <PublicNavBar variant="landing" />

      <main id="main-content" className="relative flex-1 overflow-x-clip">
        <section
          aria-labelledby="hero-heading"
          className="relative overflow-hidden border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
        >
          <BrandBlobCyanIcon
            size={150}
            className="pointer-events-none absolute -bottom-10 -left-14 hidden opacity-75 xl:block"
          />
          <BrandBlobLimeIcon
            size={160}
            className="pointer-events-none absolute -right-14 -bottom-10 hidden opacity-75 xl:block"
          />

          <div className="relative mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
            <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12 md:gap-10">
              <div className="space-y-5 md:col-span-6">
                <div className="relative inline-block">
                  <BrandLimeBurstIcon
                    size={38}
                    className="pointer-events-none absolute -top-6 -left-7 hidden -rotate-45 sm:block"
                  />
                  <h1
                    id="hero-heading"
                    className="text-4xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08]"
                  >
                    Sprawdzone
                    <br />
                    innowacje{" "}
                    <span className="relative inline-block whitespace-nowrap">
                      w praktyce
                      <BrandCurveLimeIcon
                        size={170}
                        className="pointer-events-none -mt-0.5 block h-4 w-full sm:h-5"
                      />
                    </span>
                  </h1>
                </div>

                <p className="max-w-lg text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
                  Znajdź gotowe rozwiązanie, porównaj wymagania i zaplanuj wdrożenie w swojej organizacji.
                </p>
              </div>

              <div className="md:col-span-6">
                <BrandPhoto
                  src="/landing/hero-practice.jpg"
                  alt="Zespół omawiający plan wdrożenia projektu przy stole roboczym"
                  shape="pebble"
                  accent="cyan"
                  accentPosition="bottom-left"
                  objectPosition="center 35%"
                  sizes="(max-width: 767px) 100vw, 48vw"
                />
              </div>
            </div>

            <div className="mx-auto w-full max-w-3xl">
              <LandingSearchForm />
            </div>

            <div
              className="grid grid-cols-1 gap-5 md:grid-cols-2"
              aria-label="Sposób rozpoczęcia pracy"
            >
              <Link
                href="/solve"
                className="group flex h-full min-h-[136px] items-center justify-between gap-4 rounded-2xl border border-[var(--color-promo-navy-border)] bg-[var(--color-promo-navy-bg)] p-6 text-[var(--color-promo-navy-fg)] transition-colors hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-focus)]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                    <BrandTargetIcon size={36} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-bold leading-snug sm:text-xl">
                      Szukam rozwiązania problemu
                    </h2>
                    <p className="text-sm leading-snug text-[var(--color-promo-navy-muted)]">
                      Opisz wyzwanie i dopasuj projekty
                    </p>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text)] transition-colors group-hover:bg-[var(--color-surface-raised)]"
                >
                  <ArrowRightIcon size={20} weight="bold" />
                </span>
              </Link>

              <Link
                href="/innovations"
                className="group flex h-full min-h-[136px] items-center justify-between gap-4 rounded-2xl border border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime)] p-6 text-[var(--color-on-accent-lime)] transition-colors hover:bg-[var(--color-accent-lime-hover)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--color-focus)]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
                    <BrandLayersIcon size={36} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-bold leading-snug sm:text-xl">
                      Przeglądam innowacje
                    </h2>
                    <p className="text-sm leading-snug opacity-90">
                      Przeszukuj katalog i porównuj karty
                    </p>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-on-accent-lime)] text-[var(--color-accent-lime)]"
                >
                  <ArrowRightIcon size={20} weight="bold" />
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-6 py-5 sm:grid-cols-3 sm:gap-6">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <BrandMagnifierIcon size={32} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight text-[var(--color-text)]">Znajdź</p>
                  <p className="mt-0.5 text-xs leading-snug text-[var(--color-text-muted)]">
                    sprawdzone rozwiązania
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <BrandScalesIcon size={32} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight text-[var(--color-text)]">Porównaj</p>
                  <p className="mt-0.5 text-xs leading-snug text-[var(--color-text-muted)]">
                    potencjał i wymagania
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <BrandRocketIcon size={32} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight text-[var(--color-text)]">Zastosuj</p>
                  <p className="mt-0.5 text-xs leading-snug text-[var(--color-text-muted)]">
                    w swojej organizacji
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="jak-to-dziala"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-8 mx-auto w-full max-w-6xl space-y-8 px-4 py-14 sm:px-6 sm:py-16"
        >
          <div className="max-w-xl space-y-2">
            <h2
              id="how-it-works-heading"
              className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl"
            >
              Jak to działa?
            </h2>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
              Katalog i dopasowanie działają od razu, bez zakładania konta.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, description, Icon }) => (
              <div
                key={step}
                className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)]">
                    <Icon size={30} />
                  </div>
                  <span className="font-mono text-xs font-bold tabular-nums text-[var(--color-text-muted)]">
                    {step}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold leading-snug text-[var(--color-text)]">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="o-platformie"
          aria-labelledby="about-heading"
          className="scroll-mt-8 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
        >
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-12 lg:gap-12">
            <div className="space-y-5 lg:col-span-6">
              <h2
                id="about-heading"
                className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl"
              >
                O platformie
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
                Praktoteka porządkuje informacje o polskich innowacjach technologicznych, edukacyjnych i administracyjnych pochodzących z jawnych źródeł. Pomaga gminom, szkołom, instytucjom publicznym, firmom i NGO szybciej przejść od problemu do realnego wdrożenia.
              </p>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
                Przeglądanie katalogu, opis problemu oraz porównanie kart są publiczne, a jakość danych i status weryfikacji nadzorują operatorzy PCI. Rejestracja jest potrzebna dopiero przy generowaniu spersonalizowanego planu działania.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href="/solve"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                  <span>Opisz problem</span>
                  <ArrowRightIcon size={16} weight="bold" />
                </Link>
                <Link
                  href="/innovations"
                  className="inline-flex min-h-11 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-raised)]"
                >
                  Otwórz katalog
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <BrandPhoto
                src="/landing/about-implementation.jpg"
                alt="Koordynatorka prezentująca stanowisko cyfrowe seniorowi i nauczycielce w przestrzeni publicznej"
                shape="hillside"
                accent="lime"
                accentPosition="top-right"
                objectPosition="center 30%"
                sizes="(max-width: 1023px) 100vw, 48vw"
              />
            </div>
          </div>
        </section>
      </main>

      <AppFooter fullWidth />
    </>
  );
}
