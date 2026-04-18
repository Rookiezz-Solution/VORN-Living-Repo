import React from 'react';
import { createPortal } from 'react-dom';

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

const Popover = ({ open, anchorRef, onClose, children, width = 420, align = 'end' }) => {
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const margin = 10;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const desiredTop = rect.bottom + 10;
      const desiredLeft = align === 'start' ? rect.left : (rect.right - width);
      setPos({
        top: clamp(desiredTop, margin, vh - margin),
        left: clamp(desiredLeft, margin, vw - width - margin)
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [align, anchorRef, open, width]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const onMouseDown = (e) => {
      const panel = document.getElementById('rf-popover-panel');
      const anchor = anchorRef?.current;
      if (panel && panel.contains(e.target)) return;
      if (anchor && anchor.contains(e.target)) return;
      onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <div
        id="rf-popover-panel"
        className="pointer-events-auto rf-card shadow-xl p-4"
        style={{ position: 'fixed', top: pos.top, left: pos.left, width }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Popover;

