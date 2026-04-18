import React from 'react';

const Toast = () => {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    const handler = (e) => {
      const { message, type = 'info', duration = 3000 } = e.detail || {};
      const id = Date.now() + Math.random();
      setItems(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== id));
      }, duration);
    };
    window.addEventListener('toast:show', handler);
    return () => window.removeEventListener('toast:show', handler);
  }, []);
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {items.map(i => (
        <div key={i.id} className={`min-w-[240px] px-4 py-2 rounded-xl shadow-lg border ${i.type === 'error' ? 'bg-red-100 border-red-300 text-red-800' : i.type === 'success' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-white border-border text-secondary'}`}>
          {i.message}
        </div>
      ))}
    </div>
  );
};

export default Toast;
