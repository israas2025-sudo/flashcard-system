"use client";

import "./globals.css";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Sparkles,
} from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { useUserPreferencesStore } from "@/store/user-preferences-store";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, accent: "#635BFF" },
  { href: "/study", label: "Study", icon: BookOpen, accent: "#FF0080" },
  { href: "/browser", label: "Browser", icon: Search, accent: "#00D4FF" },
  { href: "/stats", label: "Statistics", icon: BarChart3, accent: "#FFB800" },
  { href: "/settings", label: "Settings", icon: Settings, accent: "#14B8A6" },
];

function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode } =
    useUIStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Use defaults during SSR to avoid hydration mismatch
  const collapsed = hydrated ? sidebarCollapsed : false;
  const isDark = hydrated ? darkMode : false;

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-30 flex flex-col"
      style={{
        width: collapsed ? 64 : 240,
        transition: "width 0.25s cubic-bezier(0.165, 0.84, 0.44, 1)",
        background:
          "linear-gradient(180deg, rgba(10,37,64,0.97) 0%, rgba(8,15,30,0.99) 100%)",
        backdropFilter: "blur(20px) saturate(200%)",
        WebkitBackdropFilter: "blur(20px) saturate(200%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Animated glow line on right edge */}
      <div className="sidebar-glow-line" />

      {/* Logo with orbiting particles */}
      <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0">
        <div className="logo-container" style={{ width: 38, height: 38 }}>
          <div className="logo-core">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C12 2 9 6 7 10C5 14 6 18 8 20C10 22 14 22 16 20C18 18 19 14 17 10C15 6 12 2 12 2Z" fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
              <path d="M12 6C12 6 10 9 9 12C8 15 9 17 10 18" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" strokeLinecap="round" fill="none"/>
              <path d="M12 2C12 2 11 5 8 5C5 5 3 3 3 3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <path d="M12 5C12 5 13 3 16 3C19 3 21 5 21 5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
              <circle cx="7" cy="4" r="1.5" fill="rgba(20,184,166,0.8)"/>
              <circle cx="17" cy="4" r="1.5" fill="rgba(20,184,166,0.8)"/>
              <circle cx="5" cy="3" r="1" fill="rgba(20,184,166,0.5)"/>
              <circle cx="19" cy="5" r="1" fill="rgba(20,184,166,0.5)"/>
            </svg>
          </div>
          <div className="orbit-dot orbit-dot-1" />
          <div className="orbit-dot orbit-dot-2" />
          <div className="orbit-dot orbit-dot-3" />
          <div className="logo-pulse-ring" />
          <div className="logo-pulse-ring-2" />
        </div>
        {!collapsed && (
          <span
            className="gradient-text-animated font-bold tracking-tight transition-opacity duration-200"
            style={{ fontSize: 19, letterSpacing: "-0.02em" }}
          >
            Zaytuna
          </span>
        )}
      </div>

      {/* Gradient divider */}
      <div
        className="mx-4 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(99,91,255,0.3), rgba(255,0,128,0.2), transparent)",
        }}
      />

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                (item.href === "/study" &&
                  pathname.startsWith("/study") &&
                  !pathname.startsWith("/study-presets"));

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`nav-item ${isActive ? "active" : ""} ${
                  collapsed ? "justify-center !px-0 !mx-2" : ""
                }`}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    background: isActive
                      ? `linear-gradient(135deg, ${item.accent}30, ${item.accent}10)`
                      : "transparent",
                    transition: "background 0.2s ease",
                  }}
                >
                  <Icon
                    className="w-[18px] h-[18px] flex-shrink-0"
                    style={{
                      color: isActive ? item.accent : undefined,
                      opacity: isActive ? 1 : 0.65,
                      filter: isActive
                        ? `drop-shadow(0 0 6px ${item.accent})`
                        : "none",
                      transition: "opacity 0.2s ease, filter 0.2s ease, color 0.2s ease",
                    }}
                  />
                </div>
                {!collapsed && (
                  <span style={{ color: isActive ? "#FFFFFF" : undefined }}>
                    {item.label}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Gradient divider between nav and bottom */}
      <div
        className="mx-4 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />

      {/* User avatar section */}
      <div
        className={`px-4 py-3 flex items-center ${
          collapsed ? "justify-center" : "gap-3"
        }`}
      >
        <div
          className="flex-shrink-0 rounded-full p-[2px]"
          style={{
            background: "linear-gradient(135deg, #635BFF, #FF0080, #00D4FF)",
          }}
        >
          <div
            className="w-[28px] h-[28px] rounded-full flex items-center justify-center"
            style={{
              background: "rgba(10,25,47,0.9)",
            }}
          >
            <User className="w-[14px] h-[14px]" style={{ color: "rgba(255,255,255,0.8)" }} />
          </div>
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span
              className="text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Student
            </span>
            <span
              className="text-[10px]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Free Plan
            </span>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className={`px-3 pb-4 flex items-center gap-2 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-lg transition-colors duration-200"
          style={{
            color: "rgba(255,255,255,0.55)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "rgba(255,255,255,0.9)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.55)";
          }}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={toggleSidebar}
          className="p-2.5 rounded-lg transition-colors duration-200"
          style={{
            color: "rgba(255,255,255,0.55)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "rgba(255,255,255,0.9)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.55)";
          }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
        {!collapsed && <div className="flex-1" />}
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" style={{ color: "rgba(99,91,255,0.6)" }} />
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                userSelect: "none",
              }}
            >
              v1.0
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const { darkMode } = useUIStore();

  useEffect(() => {
    // Migrate localStorage from old "lughati-*" keys to "zaytuna-*"
    const migrations = [
      ["lughati-settings", "zaytuna-settings"],
      ["lughati-study-presets", "zaytuna-study-presets"],
      ["lughati-onboarding", "zaytuna-onboarding"],
    ];
    for (const [oldKey, newKey] of migrations) {
      const old = localStorage.getItem(oldKey);
      if (old && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, old);
        localStorage.removeItem(oldKey);
      }
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { onboardingCompleted } = useUserPreferencesStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Wait for Zustand rehydration before checking
  if (!hydrated) return <>{children}</>;

  // Redirect to onboarding if not completed and not already there
  if (!onboardingCompleted && pathname !== "/onboarding") {
    // Use effect-based redirect to avoid rendering issues
    return <OnboardingRedirect />;
  }

  return <>{children}</>;
}

function OnboardingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);
  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isStudyMode =
    /^\/study\/[^/]+$/.test(pathname) && pathname !== "/study-presets";
  const isOnboarding = pathname === "/onboarding";

  // Use default values during SSR, persisted values after hydration
  const sidebarWidth = mounted ? (sidebarCollapsed ? 64 : 240) : 240;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Zaytuna — Learn Languages</title>
        <meta
          name="description"
          content="Zaytuna — a multilingual spaced repetition flashcard system for Arabic, Quran, Spanish, and more"
        />
      </head>
      <body className="font-sans">
        <DarkModeProvider>
          <OnboardingGuard>
            {!isStudyMode && !isOnboarding && <Sidebar />}
            {isStudyMode || isOnboarding ? (
              <main className="min-h-screen">{children}</main>
            ) : (
              <main
                className="min-h-screen"
                style={{
                  marginLeft: sidebarWidth,
                  transition: mounted
                    ? "margin-left 0.25s cubic-bezier(0.165, 0.84, 0.44, 1)"
                    : "none",
                }}
              >
                <div className="p-8 max-w-[1080px] mx-auto">{children}</div>
              </main>
            )}
          </OnboardingGuard>
        </DarkModeProvider>
      </body>
    </html>
  );
}
