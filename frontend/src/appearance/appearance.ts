export const appearances = ["light", "dark", "system"] as const;
export type Appearance = (typeof appearances)[number];

export const defaultAppearance: Appearance = "system";
export const appearanceStorageKey = "hn26-appearance";
export const themeColors = { light: "#f8fafc", dark: "#0f172a" } as const;

export function isAppearance(value: unknown): value is Appearance {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveAppearance(value: unknown): Appearance {
  return isAppearance(value) ? value : defaultAppearance;
}

export function syncThemeColorMeta(appearance: Appearance): void {
  if (
    typeof document === "undefined" ||
    typeof document.querySelectorAll !== "function"
  ) {
    return;
  }
  const metas = document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  for (const meta of metas) {
    if (appearance === "light") {
      meta.content = themeColors.light;
    } else if (appearance === "dark") {
      meta.content = themeColors.dark;
    } else {
      const media = meta.getAttribute("media") ?? "";
      meta.content = media.includes("dark")
        ? themeColors.dark
        : themeColors.light;
    }
  }
}
