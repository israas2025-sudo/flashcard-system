"use client";

import "./globals.css";
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const { sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode } =
    useUIStore();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-30 flex flex-col"
      style={{
        width: sidebarCollapsed ? 64 : 240,
        transition: "width 0.25s cubic-bezier(0.165, 0.84, 0.44, 1)",
        background:
          "linear-gradient(180deg, rgba(10,37,64,0.97) 0%, rgba(8,15,30,0.99) 100%)",
        backdropFilter: "blur(20px) saturate(200%)",
        WebkitBackdropFilter: "blur(20px) saturate(200%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0">
        <div
          className="relative flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            boxShadow:
              "0 0 25px rgba(99,91,255,0.4), 0 0 50px rgba(99,91,255,0.15)",
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, #635BFF 0%, #8B5CF6 50%, #06B6D4 100%)",
            }}
          >
            <span
              className="text-white font-bold"
              style={{ fontSize: 16, fontFamily: "'Amiri', serif" }}
            >
              ل
            </span>
          </div>
        </div>
        {!sidebarCollapsed && (
          <span
            className="gradient-text font-bold tracking-tight transition-opacity duration-200"
            style={{ fontSize: 18 }}
          >
            Lughati
          </span>
        )}
      </div>

      {/* Divider */}
      <div
        className="mx-4 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
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
                  sidebarCollapsed ? "justify-center !px-0 !mx-2" : ""
                }`}
              >
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: isActive
                      ? "rgba(99,91,255,0.15)"
                      : "transparent",
                    transition: "background 0.2s ease",
                  }}
                >
                  <Icon
                    className="w-[18px] h-[18px] flex-shrink-0"
                    style={{
                      opacity: isActive ? 1 : 0.5,
                      filter: isActive
                        ? "drop-shadow(0 0 4px rgba(99,91,255,0.4))"
                        : "none",
                      transition: "opacity 0.2s ease, filter 0.2s ease",
                    }}
                  />
                </div>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Gradient divider between nav and bottom */}
      <div
        className="mx-4 h-px"
        style={{
          borderColor: "rgba(255,255,255,0.04)",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />

      {/* User avatar section */}
      <div
        className={`px-4 py-3 flex items-center ${
          sidebarCollapsed ? "justify-center" : "gap-3"
        }`}
      >
        <div
          className="flex-shrink-0 rounded-full p-[2px]"
          style={{
            background: "linear-gradient(135deg, #635BFF, #7C3AED)",
          }}
        >
          <div
            className="w-[28px] h-[28px] rounded-full flex items-center justify-center"
            style={{
              background: "rgba(10,25,47,0.9)",
            }}
          >
            <User className="w-[14px] h-[14px]" style={{ color: "rgba(255,255,255,0.7)" }} />
          </div>
        </div>
        {!sidebarCollapsed && (
          <span
            className="text-sm font-medium"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Student
          </span>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className={`px-3 pb-4 flex items-center gap-2 ${
          sidebarCollapsed ? "justify-center" : ""
        }`}
      >
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-lg transition-colors duration-200"
          style={{
            color: "rgba(255,255,255,0.45)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.45)";
          }}
          title={darkMode ? "Light mode" : "Dark mode"}
        >
          {darkMode ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={toggleSidebar}
          className="p-2.5 rounded-lg transition-colors duration-200"
          style={{
            color: "rgba(255,255,255,0.45)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.45)";
          }}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
        {!sidebarCollapsed && <div className="flex-1" />}
        {!sidebarCollapsed && (
          <span
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.2)",
              userSelect: "none",
            }}
          >
            v1.0
          </span>
        )}
      </div>
    </aside>
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

  const isStudyMode =
    /^\/study\/[^/]+$/.test(pathname) && pathname !== "/study-presets";

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
          {isStudyMode ? (
            <main className="min-h-screen">{children}</main>
          ) : (
            <main
              className="min-h-screen"
              style={{
                marginLeft: sidebarCollapsed ? 64 : 240,
                transition: "margin-left 0.25s cubic-bezier(0.165, 0.84, 0.44, 1)",
              }}
            >
              <div className="p-8 max-w-[1080px] mx-auto">{children}</div>
            </main>
          )}
        </DarkModeProvider>
      </body>
    </html>
  );
}
