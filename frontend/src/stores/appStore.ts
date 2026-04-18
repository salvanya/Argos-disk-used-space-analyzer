import { create } from "zustand";

type Theme = "dark" | "light";
type Locale = "en" | "es";

interface AppState {
  token: string;
  isAdmin: boolean;
  platform: string;
  theme: Theme;
  locale: Locale;
  setToken: (token: string) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setPlatform: (platform: string) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
}

function readStoredTheme(): Theme {
  return localStorage.getItem("argos-theme") === "light" ? "light" : "dark";
}

function readStoredLocale(): Locale {
  return localStorage.getItem("argos-locale") === "es" ? "es" : "en";
}

export const useAppStore = create<AppState>((set) => ({
  token: "",
  isAdmin: false,
  platform: "",
  theme: readStoredTheme(),
  locale: readStoredLocale(),
  setToken: (token) => set({ token }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setPlatform: (platform) => set({ platform }),
  setTheme: (theme) => {
    localStorage.setItem("argos-theme", theme);
    document.documentElement.classList.toggle("light", theme === "light");
    set({ theme });
  },
  setLocale: (locale) => {
    localStorage.setItem("argos-locale", locale);
    set({ locale });
  },
}));
