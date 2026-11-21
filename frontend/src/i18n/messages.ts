/** English source phrases are stable message IDs. Never pass user content as a key. */
export const polish = {
  "Skip to main content": "Przejdź do głównej treści",
  "Django + DRF + Next.js": "Django + DRF + Next.js",
  "Docker Full-Stack Template": "Szablon Docker Full-Stack",
  "Language": "Język",
  "Appearance": "Wygląd",
  "Light": "Jasny",
  "Dark": "Ciemny",
  "System": "Systemowy",
  "Saving…": "Zapisywanie…",
  "The language could not be saved. Try again.":
    "Nie udało się zapisać języka. Spróbuj ponownie.",
  "The appearance could not be saved. Try again.":
    "Nie udało się zapisać wyglądu. Spróbuj ponownie.",
  "Full-Stack Docker Template Ready": "Szablon Full-Stack Docker jest gotowy",
  "This starter pairs a Django 5.2 LTS and Django REST Framework backend with a Next.js 16 App Router frontend and PostgreSQL 18, wired together for both local hot-reload development and production builds.":
    "Ten starter łączy backend Django 5.2 LTS i Django REST Framework z frontendem Next.js 16 App Router oraz bazą PostgreSQL 18, skonfigurowanymi pod lokalny rozwój z hot-reloadem i buildy produkcyjne.",
  "API Documentation & Admin Links": "Dokumentacja API i panel administracyjny",
  "Swagger UI": "Swagger UI",
  "Interactive OpenAPI 3 documentation": "Interaktywna dokumentacja OpenAPI 3",
  "ReDoc": "ReDoc",
  "Clean API reference powered by drf-spectacular":
    "Przejrzysta dokumentacja API generowana przez drf-spectacular",
  "OpenAPI Schema": "Schemat OpenAPI",
  "Raw OpenAPI 3 specification": "Surowa specyfikacja OpenAPI 3",
  "Django Admin": "Panel Django Admin",
  "Built-in administrative console": "Wbudowana konsola administracyjna",
  "Backend & Database Connectivity": "Łączność z backendem i bazą danych",
  "Verified via": "Zweryfikowano przez",
  "Checking API...": "Sprawdzanie API...",
  "Re-check API": "Sprawdź API ponownie",
  "PASS": "OK",
  "FAIL": "BŁĄD",
  "Healthy": "Sprawne",
  "Degraded": "Częściowo sprawne",
  "Unreachable": "Nieosiągalne",
  "Connected": "Połączono",
  "Error": "Błąd",
  "Unknown": "Nieznany",
  "API Status: {0}": "Status API: {0}",
  "Source:": "Źródło:",
  "Server SSR": "Serwer SSR",
  "Browser Fetch (CORS)": "Zapytanie z przeglądarki (CORS)",
  "Browser Fetch (Same-Origin Proxy)":
    "Zapytanie z przeglądarki (Proxy same-origin)",
  "HTTP Status": "Status HTTP",
  "No response": "Brak odpowiedzi",
  "PostgreSQL Database": "Baza danych PostgreSQL",
  "Server Timestamp (UTC)": "Znacznik czasu serwera (UTC)",
  "N/A": "Brak",
  "Detail: {0}": "Szczegóły: {0}",
} as const;

export type MessageKey = keyof typeof polish;

export const english: { [K in MessageKey]: K } = Object.fromEntries(
  Object.keys(polish).map((key) => [key, key]),
) as { [K in MessageKey]: K };
