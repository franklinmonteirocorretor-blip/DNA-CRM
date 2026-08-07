"use client";

import React, { useEffect, useRef, useCallback } from "react";

// ============================
// Modal
// RFC 882: open, onClose, size, children
// ============================
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  ariaLabel: string;
}

const modalSizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Modal({
  open,
  onClose,
  size = "md",
  children,
  ariaLabel,
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Trap focus
      if (e.key === "Tab" && ref.current) {
        const focusable = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
      // Focus first focusable inside
      setTimeout(() => {
        ref.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`relative z-10 w-full ${modalSizes[size]} rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-lg p-6`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-raised)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="Close dialog"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M3 3l10 10M13 3l-10 10" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

// ============================
// Tooltip
// ============================
type TooltipPosition = "top" | "right" | "bottom" | "left";

interface TooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  children: React.ReactNode;
}

export function Tooltip({
  content,
  position = "top",
  delay = 300,
  children,
}: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };
  const hide = () => {
    clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-[200] whitespace-nowrap rounded-lg bg-gray-900 dark:bg-gray-50 px-2.5 py-1.5 text-xs text-gray-50 dark:text-gray-900 shadow-md ${positionClasses[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// ============================
// Tabs
// ============================
export interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  ariaLabel: string;
}

export function Tabs({ tabs, activeTab, onChange, ariaLabel }: TabsProps) {
  return (
    <nav role="tablist" aria-label={ariaLabel} className="flex border-b border-[var(--color-border-subtle)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          onClick={() => onChange(tab.id)}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-xs text-[var(--color-text-tertiary)]">({tab.count})</span>
          )}
          {activeTab === tab.id && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-3/4 bg-[var(--color-accent)] rounded-full" />
          )}
        </button>
      ))}
    </nav>
  );
}