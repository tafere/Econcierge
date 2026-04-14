const KEY = "eco_theme";

export function getTheme(): "dark" | "light" {
  return (localStorage.getItem(KEY) as "dark" | "light") ?? "light";
}

export function applyTheme(theme: "dark" | "light") {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem(KEY, theme);
}

export function toggleTheme(): "dark" | "light" {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
  return next;
}
