import { BarChart2, BrainCircuit, Film, History, Home, NotebookPen, Settings, Tv } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Tổng quan', icon: Home, to: '/' },
  { label: 'Test model', icon: BrainCircuit, to: '/model-test' },
  { label: 'Phân tích video', icon: Film, to: '/video' },
  { label: 'Phân tích kênh', icon: Tv, to: '/channel' },
  { label: 'Gán nhãn', icon: NotebookPen, to: '/labeling' },
  { label: 'Lịch sử', icon: History, to: '/history' },
  { label: 'Cài đặt', icon: Settings, to: '/settings' },
];

export default function Sidebar({ collapsed }) {
  return (
    <aside className={`app-sidebar flex h-screen flex-col ${collapsed ? 'w-20' : 'w-64'} transition-all duration-300`}>
      <div className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="brand-mark">TU</div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="brand-title">TikUniSent</p>
              <p className="brand-subtitle">Phân tích cảm xúc TikTok cho kênh đại học</p>
            </div>
          ) : null}
        </div>
      </div>

      {!collapsed ? (
        <div className="mx-4 mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-200">
            <BarChart2 className="h-4 w-4" />
            PhoBERT Pipeline
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            Crawl Apify, tiền xử lý tiếng Việt và phân tích bằng model fine-tuned.
          </p>
        </div>
      ) : null}

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-lg shadow-slate-950/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-4 text-xs text-slate-400">
        {!collapsed ? (
          <div className="space-y-1">
            <p className="font-semibold text-slate-200">TikUniSent v1.0.0</p>
            <p>Backend FastAPI + PhoBERT</p>
          </div>
        ) : (
          <span>v1</span>
        )}
      </div>
    </aside>
  );
}
