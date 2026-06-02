// Inline theme bootstrap — runs before paint to avoid a flash of the wrong
// theme. Shared between the root layout (which inlines it) and the proxy (which
// allow-lists it in the CSP via its sha256 hash). Keep this string stable; the
// proxy hashes it at runtime so the two never drift.
export const THEME_SCRIPT =
  "(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();";
