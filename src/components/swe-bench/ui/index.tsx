"use client";

import React from "react";

// ============================
// Button Component
// RFC 882: variants (primary/secondary/ghost/danger), sizes, isLoading
// ============================

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm",
  secondary:
    "bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-raised)]",
  ghost:
    "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-text-primary)]",
  danger:
    "bg-[var(--color-danger)] text-white hover:brightness-110 shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs gap-1",
  md: "px-3 py-1.5 text-sm gap-1.5",
  lg: "px-4 py-2 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.25"
          />
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </svg>
      ) : icon ? (
        <span aria-hidden="true">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

// ============================
// Card
// RFC 882: padding, shadow, hover, clickable
// ============================

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  clickable?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  children,
  className = "",
  hover = false,
  clickable = false,
  padding: padSize = "md",
}: CardProps) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-sm ${hover ? "transition-shadow duration-200 hover:shadow-md" : ""} ${clickable ? "cursor-pointer" : ""} ${paddingClasses[padSize]} ${className}`}
    >
      {children}
    </div>
  );
}

// ============================
// Badge
// ============================

type BadgeColor = "default" | "success" | "warning" | "danger" | "accent";

const badgeColorClasses: Record<BadgeColor, string> = {
  default: "bg-[var(--color-bg-raised)] text-[var(--color-text-secondary)]",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  accent: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
};

export interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function Badge({
  children,
  color = "default",
  size = "sm",
  removable = false,
  onRemove,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${badgeColorClasses[color]} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"} ${className}`}
    >
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label={`Remove ${typeof children === "string" ? children : "filter"}`}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </button>
      )}
    </span>
  );
}

// ============================
// Input
// ============================
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
  debounceMs?: number;
}

export function Input({
  icon,
  error,
  className = "",
  ...props
}: InputProps) {
  const baseClasses =
    "w-full rounded-lg border bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed";

  const errorClasses = error
    ? "border-[var(--color-danger)] focus:ring-[var(--color-danger)]/30"
    : "border-[var(--color-border-subtle)]";

  return (
    <div className="relative w-full">
      {icon && (
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <input
        className={`${baseClasses} ${errorClasses} ${icon ? "pl-9" : ""} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ============================
// Select
// ============================
interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export function Select({
  options,
  placeholder = "Select...",
  className = "",
  ...props
}: SelectProps) {
  return (
    <select
      className={`w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)] disabled:opacity-50 cursor-pointer ${className}`}
      {...props}
    >
      {placeholder && (
        <option value="">{placeholder}</option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ============================
// Pagination
// ============================
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className = "",
}: PaginationProps) {
  const pages = getVisiblePages(currentPage, totalPages);

  return (
    <nav
      aria-label="Table pagination"
      className={`flex items-center justify-between gap-4 flex-wrap ${className}`}
    >
      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-tertiary)]">Rows per page:</span>
        <Select
          options={[20, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
          value={String(pageSize)}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="w-auto min-w-[80px]"
          placeholder=""
        />
      </div>

      {/* Page numbers */}
      <div className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-raised)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="First page"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M11 1L3 7L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 1L5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-raised)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 1l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-[var(--color-text-tertiary)]">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(Number(p))}
              className={`h-8 w-8 rounded-md text-sm font-medium ${
                currentPage === p
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-raised)]"
              }`}
              aria-current={currentPage === p ? "page" : undefined}
              aria-label={`Page ${p}`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-raised)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-raised)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Last page"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 1 L3 7l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 3 L9 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="text-xs text-[var(--color-text-tertiary)]">
        Page {currentPage} of {totalPages}
      </div>
    </nav>
  );
}

function getVisiblePages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

// ============================
// Skeleton
// ============================

type SkeletonVariant = "text" | "circle" | "rectangle" | "row";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ variant = "rectangle", width, height, className = "" }: SkeletonProps) {
  const defaultWidth = "100%";
  const defaultHeight = variant === "circle" ? "32px" : "1rem";
  let shapeClass = "rounded-md bg-[var(--color-bg-raised)] animate-pulse";

  if (variant === "circle") shapeClass = "rounded-full bg-[var(--color-bg-raised)] animate-pulse";
  if (variant === "row") shapeClass = "h-4 rounded bg-[var(--color-bg-raised)] animate-pulse w-full";

  return (
    <div
      className={`${shapeClass} ${className}`}
      style={{ width: width ?? defaultWidth, height: height ?? defaultHeight }}
      aria-hidden="true"
    />
  );
}

// Table skeleton rows — uses deterministic widths
const SKELETON_WIDTHS = ["45%", "55%", "35%", "50%", "42%"];

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton variant="rectangle" width={30} height={20} />
          <Skeleton variant="rectangle" width={SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]} height={20} />
          <Skeleton variant="rectangle" width={60} height={20} />
          <Skeleton variant="rectangle" width={50} height={20} />
          <Skeleton variant="rectangle" width={40} height={20} />
          <Skeleton variant="rectangle" width={80} height={20} />
        </div>
      ))}
    </div>
  );
}

// KPI skeleton
export function SkeletonKpiGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="rectangle" height={104} />
      ))}
    </div>
  );
}