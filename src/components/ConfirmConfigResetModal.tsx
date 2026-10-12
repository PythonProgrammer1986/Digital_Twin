import React, { useState } from 'react';
import { SimConfig } from '../types/simulation';
import {
  AlertTriangle,
  X,
  CheckCircle2,
  Calendar,
  Truck,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export interface ConfirmConfigResetModalProps {
  isOpen: boolean;
  presetName: string;
  incomingConfig: SimConfig;
  currentConfig: SimConfig;
  onConfirm: (finalConfig: SimConfig) => void;
  onClose: () => void;
}

export const ConfirmConfigResetModal: React.FC<ConfirmConfigResetModalProps> = ({
  isOpen,
  presetName,
  incomingConfig,
  currentConfig,
  onConfirm,
  onClose,
}) => {
  // By default, preserve Monthly Target and Multi-Variant Product Mix!
  const [updateDemand, setUpdateDemand] = useState<boolean>(false);
  const [resetVariants, setResetVariants] = useState<boolean>(false);

  if (!isOpen) return null;

  const hasDemandDiff = incomingConfig.demand !== currentConfig.demand;
  const hasVariantsDiff =
    JSON.stringify(incomingConfig.variants || []) !==
    JSON.stringify(currentConfig.variants || []);

  const handleApply = () => {
    const finalConfig: SimConfig = {
      ...incomingConfig,
      // If user chose No (updateDemand === false), preserve current monthly target!
      demand: updateDemand ? incomingConfig.demand : currentConfig.demand,
      // If user chose No (resetVariants === false), preserve current product mix!
      variants: resetVariants ? incomingConfig.variants : currentConfig.variants,
    };
    onConfirm(finalConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-750 rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Confirm Configuration Update
              </h3>
              <p className="text-xs text-slate-400">
                Applying: <span className="text-cyan-400 font-semibold">{presetName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          <p className="text-slate-300 leading-relaxed">
            You requested to apply <strong className="text-slate-100">{presetName}</strong>. 
            To prevent accidental loss of your customized target or product variants, please confirm:
          </p>

          {/* Question 1: Monthly Target Requirement */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>1. Monthly Target Requirement</span>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Current: {currentConfig.demand} units/mo
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Do you want to reset or change your Monthly Target Requirement to{' '}
              <strong className="text-slate-200">{incomingConfig.demand} units/mo</strong>?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUpdateDemand(false)}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  !updateDemand
                    ? 'bg-cyan-950/40 border-cyan-500 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center ${
                    !updateDemand ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600'
                  }`}
                >
                  {!updateDemand && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                </div>
                <div>
                  <div className="font-bold text-xs text-cyan-300">
                    No — Keep Target ({currentConfig.demand})
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Preserve current monthly delivery requirement
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUpdateDemand(true)}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  updateDemand
                    ? 'bg-amber-950/40 border-amber-500 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center ${
                    updateDemand ? 'border-amber-400 bg-amber-500' : 'border-slate-600'
                  }`}
                >
                  {updateDemand && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                </div>
                <div>
                  <div className="font-bold text-xs text-amber-300">
                    Yes — Update Target ({incomingConfig.demand})
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Overwrite monthly demand with preset target
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Question 2: Multi-Variant Product Mix */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>2. Multi-Variant Product Mix Builder</span>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {currentConfig.variants?.length || 0} configured variants
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Do you want to reset your Multi-Variant Product Mix Builder back to default models?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setResetVariants(false)}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  !resetVariants
                    ? 'bg-emerald-950/40 border-emerald-500 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center ${
                    !resetVariants ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                  }`}
                >
                  {!resetVariants && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                </div>
                <div>
                  <div className="font-bold text-xs text-emerald-300">
                    No — Keep My Product Mix
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Keep your custom variant mix, icons & quantities
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setResetVariants(true)}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all ${
                  resetVariants
                    ? 'bg-amber-950/40 border-amber-500 text-slate-100'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center ${
                    resetVariants ? 'border-amber-400 bg-amber-500' : 'border-slate-600'
                  }`}
                >
                  {resetVariants && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                </div>
                <div>
                  <div className="font-bold text-xs text-amber-300">
                    Yes — Reset Product Mix
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Reset variant builder to preset standard models
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-lg flex items-center gap-2 text-[11px] text-cyan-200">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {!updateDemand && !resetVariants
                ? 'All other factory parameters (shifts, line stations, worker skills, absenteeism, material risk) will be applied without touching your Monthly Target or Product Mix.'
                : 'Selected parameters will be applied to the active digital twin simulation.'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/70 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Apply Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
