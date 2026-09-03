export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "massar_theme";

export function shouldForceLightTheme(path: string) {
  return (
    path === "/" ||
    path === "/login" ||
    path === "/register" ||
    path === "/forgot-password" ||
    path === "/reset-password" ||
    path.startsWith("/partners") ||
    path.startsWith("/partner-invite/") ||
    path.startsWith("/register/partner/") ||
    path.includes("/print") ||
    path.includes("/sticker") ||
    path.startsWith("/track") ||
    path.startsWith("/installment-track")
  );
}

export const THEME_INIT_SCRIPT = `(() => {
  try {
    const path = window.location.pathname;
    const forceLight =
      path === '/' ||
      path === '/login' ||
      path === '/register' ||
      path === '/forgot-password' ||
      path === '/reset-password' ||
      path.startsWith('/partners') ||
      path.startsWith('/partner-invite/') ||
      path.startsWith('/register/partner/') ||
      path.includes('/print') ||
      path.includes('/sticker') ||
      path.startsWith('/track') ||
      path.startsWith('/installment-track');
    const stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    const preference = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = !forceLight && (preference === 'dark' || (preference === 'system' && systemDark));
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.dataset.theme = forceLight ? 'light' : preference;
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (_) {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }
})();`;
