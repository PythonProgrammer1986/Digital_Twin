import React, { useState, useMemo } from 'react';
import { SimConfig } from './types/simulation';
import { DEFAULT_CONFIG } from './engine/defaultConfig';
import { simulateLine } from './engine/simulationEngine';
import { Header, ActiveTab } from './components/Header';
import { DigitalTwinView } from './components/DigitalTwinView';
import { ParametersView } from './components/ParametersView';
import { ScenarioComparatorView } from './components/ScenarioComparatorView';
import { YamazumiView } from './components/YamazumiView';
import { RiskAnalyticsView } from './components/RiskAnalyticsView';
import { ReportView } from './components/ReportView';
import { OptimizerModal } from './components/OptimizerModal';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<SimConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<ActiveTab>('twin');
  const [isOptimizerOpen, setIsOptimizerOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Compute simulation result instantly via useMemo
  const result = useMemo(() => {
    return simulateLine(config);
  }, [config]);

  const handleConfigChange = (newConfig: SimConfig) => {
    setConfig(newConfig);
    showNotice('Simulation scenario recalculated');
  };

  const handleResetConfig = () => {
    // Preserve custom monthly demand and custom product mix intact
    setConfig((prev) => ({
      ...DEFAULT_CONFIG,
      demand: prev.demand,
      variants: prev.variants,
    }));
    showNotice('Reset parameters to factory baseline (preserved Monthly Target & Product Mix)');
  };

  const handleApplyOptimization = (optimizedConfig: SimConfig) => {
    setConfig(optimizedConfig);
    showNotice(`Applied optimized configuration for ${optimizedConfig.demand} units/month`);
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenOptimizer={() => setIsOptimizerOpen(true)}
      />

      {/* Mobile Tab Navigation Bar */}
      <div className="lg:hidden flex items-center justify-between overflow-x-auto bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs font-medium gap-2">
        {(
          [
            { id: 'twin', label: 'Digital Twin' },
            { id: 'params', label: 'Parameters & Mix' },
            { id: 'scenarios', label: 'Scenarios & Recovery' },
            { id: 'yamazumi', label: 'Balancing & Sensitivity' },
            { id: 'risk', label: 'Risk & MC' },
            { id: 'report', label: 'Report' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'bg-cyan-600/20 text-cyan-400 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'twin' && (
          <DigitalTwinView
            config={config}
            result={result}
            onOpenOptimizer={() => setIsOptimizerOpen(true)}
          />
        )}

        {activeTab === 'params' && (
          <ParametersView
            config={config}
            onChange={handleConfigChange}
            onOptimize={() => setIsOptimizerOpen(true)}
            onReset={handleResetConfig}
          />
        )}

        {activeTab === 'scenarios' && (
          <ScenarioComparatorView
            currentConfig={config}
            currentResult={result}
            onApplyConfig={handleConfigChange}
            onOpenOptimizer={() => setIsOptimizerOpen(true)}
          />
        )}

        {activeTab === 'yamazumi' && (
          <YamazumiView
            config={config}
            result={result}
            onApplyConfig={handleConfigChange}
            onOpenOptimizer={() => setIsOptimizerOpen(true)}
          />
        )}

        {activeTab === 'risk' && (
          <RiskAnalyticsView config={config} result={result} />
        )}

        {activeTab === 'report' && (
          <ReportView
            config={config}
            result={result}
            onOpenOptimizer={() => setIsOptimizerOpen(true)}
          />
        )}
      </main>

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/40 text-slate-100 text-xs font-medium px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Optimizer Modal */}
      <OptimizerModal
        isOpen={isOptimizerOpen}
        config={config}
        currentResult={result}
        onApply={handleApplyOptimization}
        onClose={() => setIsOptimizerOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500 no-print">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>MT65 Nashik Production Facility</span>
          <span aria-hidden="true">·</span>
          <span>Flexible Discrete Event Simulation Digital Twin</span>
          <span aria-hidden="true">·</span>
          <span>Monte Carlo Line Balancing Engine</span>
        </div>
      </footer>
    </div>
  );
}
