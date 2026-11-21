"use client";

import { useState } from "react";
import { BrandBinocularsIcon, PublicNavBar, SegmentedControl, type PublicNavBarProps } from "@/components/ui";

export default function PublicNavBarExamples() {
  const [variant, setVariant] = useState<NonNullable<PublicNavBarProps["variant"]>>("landing");
  const [mobile, setMobile] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-[var(--color-text)]">Public navbar · landing i konto</h3>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--color-text-muted)]">
          Spokojny, pełnoszeroki pasek z logo, linkami i jedną wyróżnioną akcją. Na stronach konta pozostają
          logo, ustawienia, dostępność i akcja konta. Ustawienia i dostępność są zawsze pod ręką,
          również przy zwiniętym menu mobilnym.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <SegmentedControl label="Wariant publicznego paska" value={variant}
          onValueChange={(value) => setVariant(value as NonNullable<PublicNavBarProps["variant"]>)}
          options={[
            { value: "landing", label: "Landing" },
            { value: "login", label: "Logowanie" },
            { value: "register", label: "Rejestracja" },
          ]} />
        <SegmentedControl label="Rozmiar podglądu publicznego paska" value={mobile ? "mobile" : "responsive"}
          onValueChange={(value) => setMobile(value === "mobile")}
          options={[{ value: "responsive", label: "Responsywny" }, { value: "mobile", label: "Mobile" }]} />
      </div>
      <div className={`overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] ${mobile ? "mx-auto max-w-[375px]" : "w-full"}`}>
        <PublicNavBar key={variant} variant={variant} layout={mobile ? "mobile" : "responsive"} />
        <div className={`flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-10 text-center ${variant !== "landing" ? "min-h-80" : ""}`}>
          {variant === "landing" ? (
            <>
              <BrandBinocularsIcon size={64} />
              <p className="max-w-md text-2xl font-semibold tracking-tight text-[var(--color-text)]">Od dobrego pomysłu do realnej zmiany.</p>
              <p className="max-w-md text-sm text-[var(--color-text-muted)]">Odkryj polskie innowacje i znajdź rozwiązanie dla swojej organizacji.</p>
            </>
          ) : (
            <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-6">
              <p className="text-xl font-semibold text-[var(--color-text)]">{variant === "login" ? "Dobrze Cię widzieć" : "Zacznij wdrażać innowacje"}</p>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">Miejsce na przyszły formularz {variant === "login" ? "logowania" : "rejestracji"}.</p>
            </div>
          )}
          <p className="text-xs text-[var(--color-text-muted)]">Podgląd układu · ustawienia i dostępność działają na żywo</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
        Ustawienia otwierają wybór języka, dostępność — wspólny panel preferencji. Na logowaniu akcją jest
        „Załóż konto”, a na rejestracji „Zaloguj się”. Na małych ekranach menu rozwija linki i akcję konta;
        Escape zamyka je i przywraca fokus. Linki prowadzą do rzeczywistych adresów aplikacji.
      </p>
    </div>
  );
}
