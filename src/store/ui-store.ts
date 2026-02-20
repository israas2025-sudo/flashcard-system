import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  // Dark mode
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;

  // Sound
  soundEnabled: boolean;
  toggleSound: () => void;

  // Keyboard shortcuts
  shortcutsEnabled: boolean;
  toggleShortcuts: () => void;

  // Browser view
  browserSidebarWidth: number;
  setBrowserSidebarWidth: (width: number) => void;

  // Active modal/dialog
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "achievement";
  title: string;
  message?: string;
  duration?: number;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Dark mode
      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      setDarkMode: (value) => set({ darkMode: value }),

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),

      // Sound
      soundEnabled: true,
      toggleSound: () =>
        set((state) => ({ soundEnabled: !state.soundEnabled })),

      // Keyboard shortcuts
      shortcutsEnabled: true,
      toggleShortcuts: () =>
        set((state) => ({ shortcutsEnabled: !state.shortcutsEnabled })),

      // Browser view
      browserSidebarWidth: 260,
      setBrowserSidebarWidth: (width) => set({ browserSidebarWidth: width }),

      // Modal
      activeModal: null,
      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),

      // Toasts
      toasts: [],
      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newToast: Toast = { ...toast, id };
        set((state) => ({ toasts: [...state.toasts, newToast] }));

        // Auto-remove after duration
        const duration = toast.duration || 4000;
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
          }));
        }, duration);
      },
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "flashcard-ui-store",
      partialize: (state) => ({
        darkMode: state.darkMode,
        sidebarCollapsed: state.sidebarCollapsed,
        soundEnabled: state.soundEnabled,
        shortcutsEnabled: state.shortcutsEnabled,
        browserSidebarWidth: state.browserSidebarWidth,
      }),
    }
  )
);
