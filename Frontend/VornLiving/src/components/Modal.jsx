import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const Modal = ({
  open,
  title,
  onClose,
  children,
  maxWidthClassName = "max-w-3xl",
  variant = "center",
  panelClassName = "",
  chromeless = false,
  side = "right",
}) => {
  const [mounted, setMounted] = React.useState(open);
  const [visible, setVisible] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      return;
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

  React.useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted) return null;

  const isDrawer = variant === "drawer";
  const drawerFromRight = side !== "left";
  const backdropClassName = `absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
    visible ? "opacity-100" : "opacity-0"
  }`;
  const panelBase = isDrawer
    ? "h-full w-full max-w-[520px] rounded-none sm:rounded-l-2xl border-l border-border shadow-2xl flex flex-col"
    : `w-full ${maxWidthClassName} shadow-xl ${chromeless ? "" : "p-5 md:p-6"}`;
  const panelMotion = isDrawer
    ? `transform transition-transform duration-200 ease-out ${
        visible
          ? "translate-x-0"
          : drawerFromRight
          ? "translate-x-full"
          : "-translate-x-full"
      }`
    : `transform transition-all duration-200 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`;

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div className={backdropClassName} onMouseDown={onClose} />
      <div
        className={`absolute inset-0 ${
          isDrawer
            ? `flex ${drawerFromRight ? "justify-end" : "justify-start"}`
            : "flex items-center justify-center p-4"
        }`}
      >
        <div
          className={`rf-card ${panelBase} ${panelMotion} ${panelClassName}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isDrawer || chromeless ? (
            children
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {title ? (
                    <div className="text-lg font-bold text-secondary truncate">
                      {title}
                    </div>
                  ) : null}
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
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
