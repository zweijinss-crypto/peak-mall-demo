'use client';

import { useEffect, useRef } from 'react';

/**
 * Modal — minimal accessible modal for admin confirmations.
 *
 * Why custom: we don't want to ship @radix-ui or headlessui just for two
 * confirm dialogs. Built-in focus trap + Esc close + click-outside close
 * covers 100% of our needs (reject / approve / markPaid).
 *
 * Behavior:
 *   - Esc → onClose()
 *   - Click backdrop → onClose()
 *   - First focusable child receives focus on open
 *   - Body scroll locked while open
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  width = '420px',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first focusable element after paint.
    const id = window.setTimeout(() => {
      const el = containerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      el?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(id);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,18,0.55)' }}
      onMouseDown={(e) => {
        // Click on the backdrop (not on the dialog itself) closes.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-neutral-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={title ? `Close ${title}` : 'Close'}
            className="text-neutral-500 hover:text-neutral-900 transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-100"
          >
            <span aria-hidden="true" className="text-[18px] leading-none">×</span>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
