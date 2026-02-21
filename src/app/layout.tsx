"use client";

import "./globals.css";
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Search,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  User,
  Bell,
} from "lucide-react";
import { useUIStore } from "@/store/ui-store";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/study", label: "Study", icon: BookOpen },
  { href: "/browser", label: "Browser", icon: Search },
  { href: "/stats", label: "Statistics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 60 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 bottom-0 z-30 flex flex-col border-r border-[var(--surface-3)] bg-[var(--surface-1)]"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[52px] border-b border-[var(--surface-3)]">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm" style={{ fontFamily: "'Amiri', serif" }}>ل</span>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="font-semibold text-base text-[var(--text-primary)] whitespace-nowrap"
            >
              Lughat<span className="relative">i<span className="absolute -top-0.5 left-0.5 text-primary-500 text-[8px]" style={{ fontFamily: "'Amiri', serif" }}>&#x644;</span></span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                (item.href === "/study" && pathname.startsWith("/study") && !pathname.startsWith("/study-presets"));

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`nav-item ${isActive ? "active" : ""} ${
                  sidebarCollapsed ? "justify-center !px-0 !mx-2" : ""
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ opacity: isActive ? 1 : 0.8 }} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-11 border-t border-[var(--surface-3)] hover:bg-[var(--surface-2)] transition-colors"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-[var(--text-tertiary)]" />
        )}
      </button>
    </motion.aside>
  );
}

function TopBar() {
  const { darkMode, toggleDarkMode, sidebarCollapsed } = useUIStore();

  return (
    <header
      className="fixed top-0 right-0 z-20 h-[52px] flex items-center justify-between px-6 bg-[var(--surface-1)] border-b border-[var(--surface-3)]"
      style={{
        left: sidebarCollapsed ? 60 : 240,
        transition: "left 0.2s ease-in-out",
      }}
    >
      {/* Left side - search hint */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors text-[var(--text-tertiary)] border border-[var(--surface-3)]">
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Search</span>
          <kbd className="text-[10px] px-1 py-0.5 rounded bg-[var(--surface-1)] font-mono border border-[var(--surface-3)]">⌘K</kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <button className="relative p-2 rounded-md hover:bg-[var(--surface-2)] transition-colors">
          <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500" />
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-md hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-[var(--text-secondary)]" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
          )}
        </button>

        {/* User menu */}
        <button className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[var(--surface-2)] transition-colors ml-1">
          <div className="w-7 h-7 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-primary-500" />
          </div>
        </button>
      </div>
    </header>
  );
}

function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const { darkMode } = useUIStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const pathname = usePathname();

  // Only actual study sessions get immersive mode (e.g. /study/all, /study/arabic)
  // The /study launcher page keeps the sidebar
  const isStudyMode = /^\/study\/[^/]+$/.test(pathname) && pathname !== "/study-presets";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Lughati — My Language</title>
        <meta
          name="description"
          content="Lughati — a multilingual spaced repetition flashcard system"
        />
      </head>
      <body className="font-sans">
        <DarkModeProvider>
          {!isStudyMode && <Sidebar />}
          {!isStudyMode && <TopBar />}
          {isStudyMode ? (
            <main className="min-h-screen">
              {children}
            </main>
          ) : (
            <main
              className="min-h-screen"
              style={{
                marginLeft: sidebarCollapsed ? 60 : 240,
                paddingTop: 52,
                transition: "margin-left 0.2s ease-in-out",
              }}
            >
              <div className="p-8 max-w-[1200px] mx-auto">{children}</div>
            </main>
          )}
        </DarkModeProvider>
      </body>
    </html>
  );
}
