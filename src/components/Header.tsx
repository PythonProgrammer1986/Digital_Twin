import React from 'react';
import { Sparkles } from 'lucide-react';

export type ActiveTab = 'twin' | 'params' | 'scenarios' | 'yamazumi' | 'risk' | 'report';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenOptimizer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenOptimizer,
}) => {
  return (
    <header className="flex items-center justify-between gap-6 px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onTabChange('twin');
        }}
        className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 flex items-center gap-2 group"
      >
        <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 group-hover:bg-cyan-400 transition-colors" />
        <span>FlexSim Twin</span>
      </a>

      {/* Zone 2: Clean single-line navigation links */}
      <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-400">
        <button
          onClick={() => onTabChange('twin')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'twin' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Digital Twin
        </button>
        <button
          onClick={() => onTabChange('params')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'params' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Parameters & Mix
        </button>
        <button
          onClick={() => onTabChange('scenarios')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'scenarios' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Scenarios & Recovery
        </button>
        <button
          onClick={() => onTabChange('yamazumi')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'yamazumi' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Balancing & Sensitivity
        </button>
        <button
          onClick={() => onTabChange('risk')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'risk' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Risk & Monte Carlo
        </button>
        <button
          onClick={() => onTabChange('report')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'report' ? 'text-cyan-400 font-semibold' : ''
          }`}
        >
          Executive Report
        </button>
      </nav>

      {/* Zone 3: Primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenOptimizer}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Optimize Line</span>
        </button>
      </div>
    </header>
  );
};
