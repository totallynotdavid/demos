import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

const systemQuery = () => matchMedia("(prefers-color-scheme: dark)");

export function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Follow the OS setting until the user picks a theme.
  useEffect(() => {
    const query = systemQuery();
    const onChange = () => {
      if (!localStorage.getItem(STORAGE_KEY)) setDark(query.matches);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next = !dark;
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="w-9 h-9 rounded-full border border-border/40 hover:border-border hover:bg-muted/50 transition-colors flex items-center justify-center"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
