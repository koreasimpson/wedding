'use client';

import { cn } from '@/lib/utils/cn';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
}

export function Sheet({ open, onClose, children, side = 'right', className }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          'fixed top-0 z-50 h-full w-[380px] bg-white shadow-lg transition-transform',
          side === 'right' ? 'right-0' : 'left-0',
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg hover:bg-neutral-100"
          aria-label="닫기"
        >
          <X className="h-5 w-5 text-neutral-500" />
        </button>
        {children}
      </div>
    </>
  );
}
