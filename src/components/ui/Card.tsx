"use client";

import React from "react";

type CardVariant = "default" | "elevated" | "outline" | "glass";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-[var(--surface-1)] border border-[var(--surface-3)] shadow-card",
  elevated:
    "bg-[var(--surface-1)] border border-[var(--surface-3)] shadow-elevated",
  outline:
    "bg-transparent border border-[var(--surface-3)]",
  glass: "glass",
};

const paddingStyles: Record<string, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  variant = "default",
  padding = "md",
  hoverable = false,
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-lg
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hoverable ? "cursor-pointer hover:shadow-card-hover transition-shadow duration-150" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between pb-4 border-b border-[var(--surface-3)] mb-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`text-sm font-semibold text-[var(--text-primary)] ${className}`}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-xs text-[var(--text-tertiary)] ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-end gap-2 pt-4 border-t border-[var(--surface-3)] mt-4 ${className}`}
    >
      {children}
    </div>
  );
}
