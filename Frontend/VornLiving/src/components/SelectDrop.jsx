import React from 'react';
import { ChevronDown } from 'lucide-react';

const SelectDrop = ({ value, onChange, options = [], placeholder = 'Select', scroll = undefined }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const selected = options.find(o => String(o.value) === String(value));
  const useScroll = (scroll === undefined) ? (options.length > 5) : scroll;
  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="w-full border border-border rounded-xl px-3 py-2 bg-white text-left flex items-center justify-between hover:bg-white hover:border-border transition-none transform-none focus:ring-0 outline-none hover:scale-100 active:scale-100 focus:scale-100"
        onClick={() => setOpen(v => !v)}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 text-secondary" />
      </button>
      {open && (
        <div className={`absolute left-0 top-full bg-white border border-border rounded-xl shadow-lg transition-none transform-none w-full ${useScroll ? 'max-h-48 overflow-y-auto' : 'max-h-none overflow-y-visible'} overflow-x-hidden z-50`}>
          {options.map(o => (
            <button
              key={String(o.value)}
              className={`w-full text-left px-3 py-2 hover:bg-primary ${String(o.value) === String(value) ? 'bg-primary' : 'text-sm'}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-secondary">No items</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectDrop;
