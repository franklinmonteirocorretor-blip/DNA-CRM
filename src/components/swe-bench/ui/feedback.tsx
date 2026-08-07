"use client";

import React from "react";

// ============================
// Empty State - When no items match filters/search
// ============================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg-raised)] mb-4">
        {icon ?? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-[var(--color-text-tertiary)]"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        )}
      </div>
      <h2 className="text-base font-medium text-[var(--color-text-primary)] mb-2">
        {title}
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================
// Error State
// ============================

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We encountered an error. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 mb-6">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-[var(--color-danger)]"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <h5 className="text-base font-medium text-[var(--color-text-primary)] mb-2">
        {title}
      </h5>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-6">
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M1.333 8a6.667 6.667 0 1 0 2.296-5.147" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M1.333 2v4h4" />
          </svg>
          Try again
        </button>
      )}
    </div>
  );
}

// ============================
// Loading Spinner
// ============================

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const loadingSizes = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function LoadingSpinner({ size = "md", label }: LoadingProps) {
  return (
    <div
      role="status"
      className="flex items-center gap-3"
      {...(label ? { "aria-label": label } : {})}
    >
      <div
        className={`animate-spin rounded-full border-2 border-[var(--color-border-subtle)] border-t-[var(--color-accent)] ${loadingSizes[size]}`}
        aria-hidden={!label}
      />
      {label && <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>}
      <span className="sr-only">{label ?? "Loading..."}</span>
    </div>
  );
}