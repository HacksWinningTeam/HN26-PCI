import {
  appearances,
  appearanceStorageKey,
  themeColors,
} from "@/appearance/appearance";
import { defaultLocale, locales, localeStorageKey } from "@/i18n/locale";

/**
 * Synchronous pre-paint script run in `<head>` before `<body>` parses.
 * Prevents flashing default appearance or default English text when the
 * user's persisted browser preferences differ from SSR defaults.
 */
export function getPrehydrateScript(): string {
  const nonDefaultLocales = locales.filter(
    (locale) => locale !== defaultLocale,
  );
  return (
    `(function(){try{` +
    `var r=document.documentElement;` +
    `var a=localStorage.getItem(${JSON.stringify(appearanceStorageKey)});` +
    `if(${JSON.stringify(appearances)}.indexOf(a)!==-1){` +
    `r.dataset.appearance=a;` +
    `if(a==="light"||a==="dark"){` +
    `var c=a==="dark"?${JSON.stringify(themeColors.dark)}:${JSON.stringify(themeColors.light)};` +
    `var ms=document.querySelectorAll('meta[name="theme-color"]');` +
    `for(var j=0;j<ms.length;j++)ms[j].content=c;` +
    `}` +
    `}` +
    `var l=localStorage.getItem(${JSON.stringify(localeStorageKey)});` +
    `if(${JSON.stringify(nonDefaultLocales)}.indexOf(l)!==-1){` +
    `r.lang=l;r.dataset.localePending="true";` +
    `setTimeout(function(){delete r.dataset.localePending;},2000);` +
    `}` +
    `}catch{}})();`
  );
}
