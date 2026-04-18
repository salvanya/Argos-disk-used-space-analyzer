import { create } from "zustand";

interface AppState {
  token: string;
  isAdmin: boolean;
  setToken: (token: string) => void;
  setIsAdmin: (isAdmin: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  token: "",
  isAdmin: false,
  setToken: (token) => set({ token }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
}));
