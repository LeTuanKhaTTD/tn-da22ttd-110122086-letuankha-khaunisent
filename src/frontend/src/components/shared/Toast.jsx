import { useEffect, useState } from 'react';

const COLOR_MAP = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  info: 'bg-primary text-white',
};

/**
 * Toast host for app-wide notifications.
 */
export default function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handler = (event) => {
      const payload = event.detail;
      const id = `${Date.now()}-${Math.random()}`;
      setItems((prev) => [...prev, { id, ...payload }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, 3500);
    };

    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, []);

  return (
    <div className="fixed right-6 top-6 z-50 flex w-[320px] flex-col gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`rounded-xl px-4 py-3 text-sm shadow-card ${COLOR_MAP[item.type] || 'bg-slate-800 text-white'}`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
