import React, { useState } from 'react';
import { SimConfig, SimResult, ScenarioItem } from '../types/simulation';
import { formatINR } from '../utils/currency';
import { SCENARIO_PRESETS } from '../engine/defaultConfig';
import { simulateLine, calculateOvertimeRecovery } from '../engine/simulationEngine';
import {
  GitCompare,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ConfirmConfigResetModal } from './ConfirmConfigResetModal';
import { getMonteCarloOneLiner } from '../utils/monteCarloExplanation';

interface ScenarioComparatorViewProps {
  currentConfig: SimConfig;
  currentResult: SimResult;
  onApplyConfig: (config: SimConfig) => void;
  onOpenOptimizer: () => void;
}

export const ScenarioComparatorView: React.FC<ScenarioComparatorViewProps> = ({
  currentConfig,
  currentResult,
  onApplyConfig,
  onOpenOptimizer,
}) => {
  // Overtime Recovery Planner state
  const [otHours, setOtHours] = useState<number>(currentConfig.overtimeHoursPerShift || 0);
  const [weekendShifts, setWeekendShifts] = useState<number>(currentConfig.weekendShifts || 0);

  // Safeguard modal state to ask Yes/No before resetting Monthly Target or Multi-Variant Product Mix
  const [pendingScenario, setPendingScenario] = useState<{
    name: string;
    config: SimConfig;
  } | null>(null);

  const handleLoadScenarioRequest = (scen: ScenarioItem) => {
    const targetConfig = scen.config;
    const hasDemandDiff = targetConfig.demand !== currentConfig.demand;
    const hasVariantsDiff =
      targetConfig.variants &&
      JSON.stringify(targetConfig.variants) !== JSON.stringify(currentConfig.variants);

    if (hasDemandDiff || hasVariantsDiff) {
      setPendingScenario({ name: scen.name, config: targetConfig });
    } else {
      onApplyConfig(targetConfig);
    }
  };

  // Compute live recovery plan
  const recoveryPlan = calculateOvertimeRecovery(currentConfig, otHours, weekendShifts);

  // Built-in saved scenarios list for side-by-side comparison
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([
    {
      id: 'scen-current',
      name: 'Current Active Line',
      description: 'Your currently active factory configuration and parameter values.',
      badge: 'Active Baseline',
      createdAt: 'Current',
      config: currentConfig,
      result: currentResult,
    },
    {
      id: 'scen-surge',
      name: 'High Demand Surge (16 Units)',
      description: 'Monthly demand ramp-up to 16 units with 3 shifts/day.',
      badge: '3-Shift Surge',
      createdAt: 'Preset',
      config: { ...currentConfig, demand: 16, shifts: 3, opePercent: 85 },
      result: simulateLine({ ...currentConfig, demand: 16, shifts: 3, opePercent: 85 }),
    },
    {
      id: 'scen-disruption',
      name: 'Supply Disruption & Delay',
      description: 'Elevated raw material risk (24%) with 9h average shortage delays.',
      badge: 'Disrupted',
      createdAt: 'Preset',
      config: { ...currentConfig, materialRiskPercent: 24, materialDelayHours: 9 },
      result: simulateLine({ ...currentConfig, materialRiskPercent: 24, materialDelayHours: 9 }),
    },
  ]);

  // Save current active config as a scenario
  const saveCurrentScenario = () => {
    const newScen: ScenarioItem = {
      id: `scen-${Date.now()}`,
      name: `Snapshot #${scenarios.length + 1} (${currentConfig.demand} Units)`,
      description: `Saved with ${currentResult.totalPeople} operators, ${currentConfig.shifts} shifts, and ${currentResult.monteCarlo.pMeetTarget}% confidence.`,
      badge: 'Saved',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      config: { ...currentConfig },
      result: currentResult,
    };
    setScenarios([...scenarios, newScen]);
  };

  const removeScenario = (id: string) => {
    if (scenarios.length <= 1) return;
    setScenarios(scenarios.filter((s) => s.id !== id));
  };

  const applyOvertimeToLive = () => {
    onApplyConfig({
      ...currentConfig,
      overtimeHoursPerShift: otHours,
      weekendShifts: weekendShifts,
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col lg:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">
              Side-by-Side Scenario Comparator & Overtime Catch-Up
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate alternative staffing, shift patterns, and disruption recovery options side-by-side with net INR payoff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={saveCurrentScenario}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Save Current as Scenario
          </button>
          <button
            onClick={onOpenOptimizer}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Optimize
          </button>
        </div>
      </div>

      {/* 1. DISRUPTION & OVERTIME CATCH-UP PLANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-slate-100">
                Overtime & Emergency Recovery Catch-Up Planner
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Need to catch up after supplier delays or quality stoppages? Simulate daily overtime and weekend shifts without restructuring the permanent line.
            </p>
          </div>

          <button
            onClick={applyOvertimeToLive}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Apply Overtime to Live Plan
          </button>
        </div>

        {/* Sliders for Overtime */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Daily Overtime / Shift</span>
              <span className="font-mono text-amber-400 font-bold">{otHours} Hours / shift</span>
            </div>
            <input
              type="range"
              min={0}
              max={4}
              step={0.5}
              value={otHours}
              onChange={(e) => setOtHours(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[11px] text-slate-400">
              Extends daily shift duration from {currentConfig.shiftHours}h to {(currentConfig.shiftHours + otHours).toFixed(1)}h.
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Emergency Weekend Recovery Shifts</span>
              <span className="font-mono text-amber-400 font-bold">{weekendShifts} Shifts / month</span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              step={1}
              value={weekendShifts}
              onChange={(e) => setWeekendShifts(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[11px] text-slate-400">
              Saturday/Sunday overtime shifts at 1.5x wage rate.
            </span>
          </div>
        </div>

        {/* Live Recovery Scorecard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Net Time Added</span>
            <div className="text-base font-mono font-bold text-slate-100 mt-0.5">
              +{(recoveryPlan.extendedHorizonHours - recoveryPlan.regularHorizonHours).toFixed(1)} h
            </div>
            <span className="text-[10px] text-slate-400">Total: {recoveryPlan.extendedHorizonHours.toFixed(1)}h</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Recovered Trucks</span>
            <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">
              +{recoveryPlan.recoveredUnits} Units
            </div>
            <span className="text-[10px] text-slate-400">
              {recoveryPlan.baselineOutput + recoveryPlan.recoveredUnits} / {recoveryPlan.targetDemand} Quota
            </span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Overtime Wage Cost</span>
            <div className="text-base font-mono font-bold text-amber-400 mt-0.5">
              {formatINR(recoveryPlan.overtimePremiumCost)}
            </div>
            <span className="text-[10px] text-slate-400">1.5x overtime premium rate</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Net Recovery Payoff</span>
            <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">
              {formatINR(recoveryPlan.netRecoveryPayoff)}
            </div>
            <span className="text-[10px] text-slate-400">Recovered truck revenue - wages</span>
          </div>
        </div>
      </div>

      {/* 2. SIDE-BY-SIDE SCENARIO COMPARISON MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-100">
              Side-by-Side Manufacturing Scenarios Matrix
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare output, confidence, staffing, capital cost, and margin across active and saved snapshots.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {scenarios.length} Scenarios Compared
          </span>
        </div>

        {/* Comparison Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenarios.map((scen, idx) => {
            const res = scen.result;
            const cfg = scen.config;
            const isCurrent = scen.id === 'scen-current';
            const costPerTruck = res.completedCount > 0 ? res.totalOperatingCost / res.completedCount : 0;

            return (
              <div
                key={scen.id}
                className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-slate-950/90 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {scen.badge}
                    </span>
                    {!isCurrent && (
                      <button
                        onClick={() => removeScenario(scen.id)}
                        className="text-slate-400 hover:text-red-400 p-1 transition-colors"
                        title="Remove Scenario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h5 className="text-sm font-bold text-slate-100">{scen.name}</h5>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 mb-4">
                    {scen.description}
                  </p>

                  {/* Core Metrics List */}
                  <div className="space-y-2.5 text-xs border-t border-slate-850 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Monthly Completed</span>
                      <span className="font-mono font-bold text-slate-100">
                        {res.completedCount} / {cfg.demand} Trucks
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Delivery Confidence</span>
                      <span
                        className={`font-mono font-bold ${
                          res.monteCarlo.pMeetTarget >= 85
                            ? 'text-emerald-400'
                            : res.monteCarlo.pMeetTarget >= 60
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {res.monteCarlo.pMeetTarget}% (P50: {res.monteCarlo.p50})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Required Takt Time</span>
                      <span className="font-mono text-slate-200">
                        {res.taktHours.toFixed(1)} h / truck
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Line Balance Efficiency</span>
                      <span className="font-mono text-slate-200">
                        {res.lineBalanceEfficiency.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Headcount</span>
                      <span className="font-mono text-slate-200">
                        {res.totalPeople} Personnel ({cfg.shifts} Shifts)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Operating Cost (INR)</span>
                      <span className="font-mono font-bold text-slate-100">
                        {formatINR(res.totalOperatingCost)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Estimated Net Margin</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatINR(res.netMargin)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-850 pt-2 text-[11px]">
                      <span className="text-slate-400">Cost / Completed Truck</span>
                      <span className="font-mono text-slate-300">
                        {formatINR(costPerTruck)}
                      </span>
                    </div>

                    {/* Single-Line Monte Carlo Explanation for this scenario */}
                    <div className="p-2.5 bg-slate-950/90 rounded-lg border border-slate-800 text-[11px] text-slate-300 leading-snug">
                      <span className="font-semibold text-cyan-400 block text-[10px] uppercase font-mono mb-0.5">
                        Monte Carlo Result:
                      </span>
                      {getMonteCarloOneLiner(res.monteCarlo, cfg.demand, cfg.mcRuns || 50)}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-5 pt-3 border-t border-slate-800">
                  {isCurrent ? (
                    <div className="text-center py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/30 rounded border border-cyan-800/40">
                      Active Live Scenario
                    </div>
                  ) : (
                    <button
                      onClick={() => handleLoadScenarioRequest(scen)}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Load Scenario to Live Twin</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal to ask Yes/No before resetting Monthly Target or Multi-Variant Product Mix */}
      {pendingScenario && (
        <ConfirmConfigResetModal
          isOpen={true}
          presetName={pendingScenario.name}
          incomingConfig={pendingScenario.config}
          currentConfig={currentConfig}
          onConfirm={(finalCfg) => {
            onApplyConfig(finalCfg);
            setPendingScenario(null);
          }}
          onClose={() => setPendingScenario(null)}
        />
      )}
    </div>
  );
};
