import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ open, title, onClose, children, maxWidthClassName = 'max-w-3xl' }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onMouseDown={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`rf-card w-full ${maxWidthClassName} p-5 md:p-6 shadow-xl`} onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title ? <div className="text-lg font-bold text-secondary truncate">{title}</div> : null}
            </div>
            <button
              type="button"
              className="p-2 rounded-xl border border-border hover:border-primary transition"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;

