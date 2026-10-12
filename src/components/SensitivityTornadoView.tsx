import React, { useMemo } from 'react';
import { SimConfig, SimResult, SensitivityFactor } from '../types/simulation';
import { runSensitivityAnalysis } from '../engine/simulationEngine';
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface SensitivityTornadoViewProps {
  config: SimConfig;
  result: SimResult;
  onOpenOptimizer: () => void;
}

export const SensitivityTornadoView: React.FC<SensitivityTornadoViewProps> = ({
  config,
  result,
  onOpenOptimizer,
}) => {
  const sensitivityData = useMemo(() => {
    return runSensitivityAnalysis(config);
  }, [config]);

  const topConstraint = sensitivityData[0];

  const maxOutputSwing = Math.max(1, ...sensitivityData.map((s) => s.outputSwing));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">
              Sensitivity "Tornado" Analysis & Priority Ranking
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranks operational levers by their sensitivity swing on monthly output and delivery probability.
          </p>
        </div>

        <button
          onClick={onOpenOptimizer}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-all whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Auto-Mitigate Bottlenecks
        </button>
      </div>

      {/* #1 Leaning Constraint Card */}
      {topConstraint && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-950/40 border border-amber-800/40 rounded-lg text-amber-400 shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-bold">
                TOP OPERATIONAL PRIORITY #1
              </div>
              <h4 className="text-base font-bold text-slate-100 mt-0.5">
                {topConstraint.name} represents the line's largest output swing
              </h4>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {topConstraint.insight} Shifting this parameter swings monthly output by{' '}
                <strong className="text-amber-400">±{topConstraint.outputSwing} units</strong> and on-time confidence by{' '}
                <strong className="text-cyan-400">±{topConstraint.confidenceSwing}%</strong>.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 text-right shrink-0">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Impact Swing</span>
            <span className="text-lg font-mono font-bold text-amber-400">
              {topConstraint.outputSwing} Trucks
            </span>
          </div>
        </div>
      )}

      {/* Tornado Horizontal Bar Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-100">
              Output Sensitivity Tornado (Low vs High Parameter Swing)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Wider bars at the top indicate the most influential operational levers on monthly output.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" />
              Adverse / Low
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
              Favorable / High
            </span>
          </div>
        </div>

        {/* Tornado Rows */}
        <div className="space-y-4">
          {sensitivityData.map((factor, idx) => {
            const lowDelta = factor.lowOutput - factor.baselineOutput;
            const highDelta = factor.highOutput - factor.baselineOutput;
            const widthPct = Math.min(100, Math.max(15, (factor.outputSwing / maxOutputSwing) * 100));

            return (
              <div
                key={factor.id}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400 w-5">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-200">{factor.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Baseline: {factor.baselineValue}
                      {factor.unit} · Range: {factor.lowValue} to {factor.highValue}
                      {factor.unit})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] self-end sm:self-auto">
                    <span className="text-slate-400">Confidence Swing:</span>
                    <span className="text-cyan-400 font-bold">±{factor.confidenceSwing}%</span>
                  </div>
                </div>

                {/* Tornado Bar Visual */}
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-red-400 w-16 text-right">
                    {lowDelta >= 0 ? `+${lowDelta}` : lowDelta} u
                  </span>

                  {/* Dual Bar Track */}
                  <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden flex relative border border-slate-800">
                    {/* Center Baseline line */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-600 z-10 -translate-x-1/2" />

                    {/* Left downside bar */}
                    <div className="w-1/2 flex justify-end">
                      <div
                        className="h-full bg-red-500 rounded-l"
                        style={{ width: `${widthPct / 2}%` }}
                      />
                    </div>

                    {/* Right upside bar */}
                    <div className="w-1/2 flex justify-start">
                      <div
                        className="h-full bg-emerald-500 rounded-r"
                        style={{ width: `${widthPct / 2}%` }}
                      />
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-emerald-400 w-16">
                    {highDelta >= 0 ? `+${highDelta}` : highDelta} u
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-850">
                  {factor.insight}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
