"use client";

import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

type BadgeVariant = "default" | "primary" | "arabic" | "quran" | "spanish" | "english" | "egyptian" | "success" | "warning" | "danger";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotColor?: string;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-[var(--surface-2)] text-[var(--text-secondary)]",
  primary:
    "bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400",
  arabic:
    "bg-arabic-50 dark:bg-arabic-950/30 text-arabic-700 dark:text-arabic-400",
  quran:
    "bg-quran-50 dark:bg-quran-950/30 text-quran-700 dark:text-quran-400",
  spanish:
    "bg-spanish-50 dark:bg-spanish-950/30 text-spanish-700 dark:text-spanish-400",
  english:
    "bg-english-50 dark:bg-english-900/30 text-english-700 dark:text-english-300",
  egyptian:
    "bg-egyptian-50 dark:bg-egyptian-950/30 text-egyptian-700 dark:text-egyptian-400",
  success:
    "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400",
  warning:
    "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
  danger:
    "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1",
  md: "text-xs px-2 py-0.5 gap-1.5",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  dotColor,
  removable = false,
  onRemove,
  className = "",
}: BadgeProps) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`
        inline-flex items-center font-medium rounded-md whitespace-nowrap
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            dotColor || "bg-current"
          }`}
        />
      )}
      {children}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="flex-shrink-0 ml-0.5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.span>
  );
}
