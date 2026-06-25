export type Theme = "dark" | "light";

const STORAGE_KEY = "storyloom-theme";

export function getStoredTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "dark";
}

export function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.classList.toggle("light", theme === "light");
  html.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
}
