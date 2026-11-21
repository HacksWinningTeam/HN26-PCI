import { Badge, CheckIcon, StatusIndicator, WarningIcon } from "@/components/ui";

export default function BadgeExamples() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          Badge — wariant Soft (taksonomia i statusy)
        </h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge tone="info">Technologiczny</Badge>
          <Badge tone="lime" leadingIcon={<CheckIcon size={12} />}>
            Polecane (Brand Lime)
          </Badge>
          <Badge tone="neutral">Produktowy</Badge>
          <Badge tone="success" leadingIcon={<CheckIcon size={12} />}>
            Zweryfikowano
          </Badge>
          <Badge tone="warning" leadingIcon={<WarningIcon size={12} />}>
            Wymaga aktualizacji
          </Badge>
          <Badge tone="error">Sprzeczność danych</Badge>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          Badge — wariant Solid i Outline (rozmiar Compact)
        </h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="solid" size="compact" tone="info">
            Brand Cyan Solid
          </Badge>
          <Badge variant="solid" size="compact" tone="lime">
            Brand Lime Solid
          </Badge>
          <Badge variant="outline" size="compact" tone="info">
            Plan pilotażu
          </Badge>
          <Badge variant="outline" size="compact" tone="lime">
            Gotowe do wdrożenia
          </Badge>
          <Badge variant="outline" size="compact" tone="success">
            TRL 7/9
          </Badge>
          <Badge variant="outline" size="compact" tone="neutral">
            Dane demonstracyjne
          </Badge>
          <Badge variant="outline" size="compact" tone="warning">
            Brak kosztów wdrożenia
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          StatusIndicator (kropka + zawsze widoczna etykieta tekstowa)
        </h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusIndicator tone="success">PASS · Potwierdzone źródło</StatusIndicator>
          <StatusIndicator tone="lime">Aktywne wdrożenie (Brand Lime)</StatusIndicator>
          <StatusIndicator tone="info">Oczekuje na przegląd</StatusIndicator>
          <StatusIndicator tone="warning">Nieaktualne źródło</StatusIndicator>
          <StatusIndicator tone="error">FAIL · Błąd pobierania</StatusIndicator>
          <StatusIndicator tone="neutral">Planowane</StatusIndicator>
        </div>
      </div>
    </div>
  );
}
