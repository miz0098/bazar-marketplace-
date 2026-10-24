'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AuthFlow } from '@/components/auth/auth-flow';
import type { IdentityIntent } from '@/services/contracts/identity';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface AuthModalProps {
  readonly initialIntent: IdentityIntent;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function AuthModal({ initialIntent, open, onClose }: AuthModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('auth-scroll-lock');
    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('[data-auth-initial-focus]')?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.documentElement.classList.remove('auth-scroll-lock');
    };
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])]
      .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="auth-modal"
      data-auth-modal
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className="auth-modal__panel"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        aria-describedby="auth-modal-demo-note"
      >
        <button className="auth-modal__close" type="button" aria-label="Закрити" onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
        <AuthFlow idPrefix="auth-modal" initialIntent={initialIntent} surface="modal" onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}
