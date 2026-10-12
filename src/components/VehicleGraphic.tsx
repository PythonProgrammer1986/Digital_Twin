import React from 'react';
import { VariantType } from '../types/simulation';

interface VehicleGraphicProps {
  stage: number; // 0: chassis, 1: hydraulic, 2: engine/cab, 3: completed
  status: 'wait' | 'working' | 'crane' | 'material' | 'rework' | 'done';
  label: string;
  variantType?: VariantType;
  variantCode?: string;
  icon?: string;
  progressPercent?: number;
  width?: number;
  height?: number;
  color?: string;
  onClick?: () => void;
}

export const VehicleGraphic: React.FC<VehicleGraphicProps> = ({
  stage,
  status,
  label,
  variantType = 'diesel',
  variantCode,
  icon,
  progressPercent = 0,
  width = 90,
  height = 56,
  color = '#0284c7',
  onClick,
}) => {
  // Status badges & accents
  const statusColors: Record<string, string> = {
    wait: '#f59e0b',     // Amber
    working: '#38bdf8',  // Sky
    crane: '#a855f7',    // Purple
    material: '#ef4444', // Red
    rework: '#f97316',   // Orange
    done: '#22c55e',     // Emerald
  };

  const statusLabel: Record<string, string> = {
    wait: 'QUEUED',
    working: `${Math.round(progressPercent)}%`,
    crane: 'CRANE LIFT',
    material: 'SHORTAGE',
    rework: 'REWORK',
    done: 'PASSED',
  };

  const accent = statusColors[status] || color;

  // Resolve display icon
  const machineIcon =
    icon ||
    (variantType === 'electric'
      ? '⚡'
      : variantType === 'flameproof'
      ? '🛡️'
      : variantType === 'autonomous'
      ? '📡'
      : variantType === 'high_capacity'
      ? '🏋️'
      : variantType === 'articulated'
      ? '🚜'
      : variantType === 'custom'
      ? '⚙️'
      : '🛢️');

  return (
    <div
      onClick={onClick}
      className="inline-flex flex-col items-center select-none cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95 group"
      title={`${label} (${variantCode || variantType}) - ${statusLabel[status]}`}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 75"
        className="overflow-visible drop-shadow-md"
      >
        {/* Ground shadow */}
        <ellipse cx="60" cy="70" rx="48" ry="4" fill="rgba(0,0,0,0.3)" />

        {/* STAGE 0+: Heavy Rugged Mining Truck Chassis Beam */}
        <rect
          x="14"
          y="42"
          width="92"
          height="12"
          rx="2"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.5"
        />
        {/* Chassis cross-members & driveline shaft */}
        <line x1="24" y1="48" x2="96" y2="48" stroke="#64748b" strokeWidth="2" strokeDasharray="3 2" />
        <rect x="22" y="38" width="6" height="6" fill="#334155" />
        <rect x="88" y="38" width="6" height="6" fill="#334155" />

        {/* Articulated joint if variant is articulated */}
        {variantType === 'articulated' && (
          <g>
            <circle cx="58" cy="48" r="4.5" fill="#ca8a04" stroke="#fef08a" strokeWidth="1" />
            <line x1="53" y1="44" x2="63" y2="52" stroke="#94a3b8" strokeWidth="2" />
          </g>
        )}

        {/* STAGE 1+: Hydraulic tank, pump & electrical conduits */}
        {stage >= 1 && (
          <g>
            {/* Hydraulic oil tank */}
            <rect x="42" y="32" width="22" height="12" rx="2" fill="#0f766e" stroke="#14b8a6" strokeWidth="1" />
            {/* Hydraulic manifold pipes */}
            <path
              d="M 64 36 L 78 36 L 78 44"
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Electrical harness conduit */}
            <path
              d="M 28 44 C 36 40, 48 40, 56 44"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="2 1"
            />
          </g>
        )}

        {/* STAGE 2+: Powertrain & Cabin Module (Variant-Specific Equipment) */}
        {stage >= 2 && (
          <g>
            {variantType === 'electric' ? (
              /* ZERO-EMISSION BATTERY-ELECTRIC POWERTRAIN */
              <g>
                {/* 680 kWh Heavy Underground LFP Battery Enclosure */}
                <rect x="64" y="20" width="32" height="22" rx="3" fill="#083344" stroke="#06b6d4" strokeWidth="1.5" />
                <rect x="68" y="24" width="8" height="14" rx="1" fill="#0e7490" />
                <rect x="78" y="24" width="8" height="14" rx="1" fill="#0e7490" />
                <rect x="88" y="24" width="6" height="14" rx="1" fill="#0e7490" />
                {/* High Voltage Lightning Bolt */}
                <path d="M 73 14 L 69 22 L 74 22 L 71 28" stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" />
                {/* Neon High Voltage Bus Cables */}
                <path d="M 64 36 L 46 36 L 46 44" stroke="#06b6d4" strokeWidth="2.5" fill="none" strokeDasharray="3 1" />
              </g>
            ) : variantType === 'flameproof' ? (
              /* FLAMEPROOF DGMS COAL MINING SPEC */
              <g>
                {/* Armored Explosion-Proof Diesel Enclosure */}
                <rect x="66" y="22" width="30" height="20" rx="1" fill="#292524" stroke="#f97316" strokeWidth="1.5" />
                {/* Water Scrubber Canister (Wet Exhaust Conditioning) */}
                <rect x="64" y="12" width="8" height="14" rx="2" fill="#78350f" stroke="#ea580c" strokeWidth="1" />
                {/* Fire Suppression Chemical Cylinders on Frame */}
                <rect x="36" y="30" width="8" height="12" rx="2" fill="#dc2626" stroke="#991b1b" strokeWidth="1" />
                <rect x="46" y="30" width="8" height="12" rx="2" fill="#dc2626" stroke="#991b1b" strokeWidth="1" />
                {/* Flameproof DGMS Shield Badge */}
                <path d="M 82 25 L 87 28 L 87 34 L 82 37 L 77 34 L 77 28 Z" fill="#ea580c" stroke="#f97316" strokeWidth="1" />
              </g>
            ) : variantType === 'autonomous' ? (
              /* AUTONOMOUS & TELE-REMOTE HAULER */
              <g>
                {/* Electronic Compute & Sensor Bay */}
                <rect x="66" y="20" width="30" height="22" rx="2" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
                {/* Roof Rotating LiDAR Puck */}
                <circle cx="82" cy="7" r="4" fill="#a855f7" stroke="#c084fc" strokeWidth="1.5" />
                <path d="M 75 7 C 78 3, 86 3, 89 7" stroke="#e879f9" strokeWidth="1.5" fill="none" strokeDasharray="2 1" />
                {/* Dual GNSS Antennas */}
                <line x1="72" y1="8" x2="72" y2="2" stroke="#c084fc" strokeWidth="1.5" />
                <circle cx="72" cy="2" r="1.5" fill="#f472b6" />
                <line x1="92" y1="8" x2="92" y2="2" stroke="#c084fc" strokeWidth="1.5" />
                <circle cx="92" cy="2" r="1.5" fill="#f472b6" />
                {/* Forward Collision Radar Arc */}
                <path d="M 97 30 C 101 28, 101 36, 97 34" stroke="#818cf8" strokeWidth="1.5" fill="none" />
              </g>
            ) : variantType === 'high_capacity' ? (
              /* HIGH-CAPACITY EXTRA HEAVY 75T */
              <g>
                {/* Extra Heavy Double-Box Engine Cowl */}
                <rect x="66" y="18" width="30" height="24" rx="2" fill="#451a03" stroke="#b45309" strokeWidth="2" />
                <line x1="70" y1="24" x2="92" y2="24" stroke="#f59e0b" strokeWidth="1.5" />
                <line x1="70" y1="30" x2="92" y2="30" stroke="#f59e0b" strokeWidth="1.5" />
                {/* Heavy High-Capacity Anchor Stiffener */}
                <rect x="94" y="20" width="4" height="20" fill="#78350f" stroke="#ca8a04" strokeWidth="1" />
                <circle cx="80" cy="27" r="3" fill="#f59e0b" />
              </g>
            ) : (
              /* STANDARD DIESEL POWERTRAIN */
              <g>
                {/* 16-Cylinder Diesel Engine Block */}
                <path d="M 66 22 L 96 22 L 96 42 L 66 42 Z" fill="#d97706" stroke="#b45309" strokeWidth="1.5" />
                {/* Radiator Cooling Grille */}
                <rect x="94" y="24" width="4" height="16" fill="#1e293b" stroke="#78350f" strokeWidth="1" />
                <line x1="95" y1="28" x2="97" y2="28" stroke="#f59e0b" strokeWidth="1" />
                <line x1="95" y1="32" x2="97" y2="32" stroke="#f59e0b" strokeWidth="1" />
                <line x1="95" y1="36" x2="97" y2="36" stroke="#f59e0b" strokeWidth="1" />
                {/* Vertical Chrome Exhaust Stack */}
                <rect x="68" y="2" width="3" height="20" rx="1" fill="#475569" stroke="#334155" strokeWidth="1" />
                <path d="M 68 2 C 67 0, 65 0, 64 1" stroke="#64748b" strokeWidth="1.5" fill="none" />
              </g>
            )}

            {/* Heavy Underground ROPS/FOPS Operator Cabin */}
            <path
              d="M 72 8 L 92 8 L 94 22 L 70 22 Z"
              fill={
                variantType === 'electric'
                  ? '#0e7490'
                  : variantType === 'flameproof'
                  ? '#ea580c'
                  : variantType === 'autonomous'
                  ? '#312e81'
                  : variantType === 'high_capacity'
                  ? '#78350f'
                  : variantType === 'articulated'
                  ? '#854d0e'
                  : '#fbbf24'
              }
              stroke={
                variantType === 'electric'
                  ? '#0891b2'
                  : variantType === 'flameproof'
                  ? '#c2410c'
                  : variantType === 'autonomous'
                  ? '#6366f1'
                  : variantType === 'high_capacity'
                  ? '#d97706'
                  : '#ca8a04'
              }
              strokeWidth="1.5"
            />
            {/* Tinted Safety Glass */}
            <polygon
              points="76,11 88,11 90,20 74,20"
              fill={variantType === 'autonomous' ? '#818cf8' : '#38bdf8'}
              fillOpacity="0.85"
              stroke="#0284c7"
              strokeWidth="1"
            />
          </g>
        )}

        {/* STAGE 3+: Dump Body / Heavy Rock Tipper Container */}
        {stage >= 3 && (
          <g>
            <path
              d={variantType === 'high_capacity' ? "M 10 14 L 64 14 L 62 42 L 16 42 Z" : "M 12 18 L 64 18 L 62 42 L 18 42 Z"}
              fill={
                variantType === 'electric'
                  ? '#0f766e'
                  : variantType === 'flameproof'
                  ? '#c2410c'
                  : variantType === 'autonomous'
                  ? '#4338ca'
                  : variantType === 'high_capacity'
                  ? '#9a3412'
                  : variantType === 'articulated'
                  ? '#a16207'
                  : '#eab308'
              }
              stroke={
                variantType === 'electric'
                  ? '#14b8a6'
                  : variantType === 'flameproof'
                  ? '#9a3412'
                  : variantType === 'autonomous'
                  ? '#6366f1'
                  : variantType === 'high_capacity'
                  ? '#ea580c'
                  : '#ca8a04'
              }
              strokeWidth="2"
            />
            {/* Canopy protector over cab */}
            <path
              d="M 62 18 L 84 10 L 84 14 L 64 22 Z"
              fill={
                variantType === 'electric'
                  ? '#14b8a6'
                  : variantType === 'flameproof'
                  ? '#ea580c'
                  : variantType === 'autonomous'
                  ? '#6366f1'
                  : '#facc15'
              }
              stroke="#ca8a04"
              strokeWidth="1"
            />
            {/* Tipper body stiffener ribs */}
            <line x1="26" y1="20" x2="28" y2="40" stroke="#713f12" strokeWidth="1.5" />
            <line x1="38" y1="20" x2="40" y2="40" stroke="#713f12" strokeWidth="1.5" />
            <line x1="50" y1="20" x2="52" y2="40" stroke="#713f12" strokeWidth="1.5" />
            {/* Hydraulic tipping cylinder */}
            <line x1="42" y1="42" x2="48" y2="30" stroke="#94a3b8" strokeWidth="3" />
          </g>
        )}

        {/* HEAVY DUTY TIRES & HUBS */}
        {/* Rear Dual Wheels */}
        <g>
          <rect x="22" y="44" width="22" height="24" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <circle cx="33" cy="56" r="6" fill={variantType === 'electric' ? '#0e7490' : '#475569'} stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="33" cy="56" r="2.5" fill="#f8fafc" />
          <line x1="22" y1="48" x2="25" y2="48" stroke="#475569" strokeWidth="1.5" />
          <line x1="22" y1="54" x2="25" y2="54" stroke="#475569" strokeWidth="1.5" />
          <line x1="22" y1="60" x2="25" y2="60" stroke="#475569" strokeWidth="1.5" />
        </g>

        {/* Front Steer Wheels */}
        <g>
          <rect x="80" y="44" width="18" height="24" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <circle cx="89" cy="56" r="6" fill={variantType === 'electric' ? '#0e7490' : '#475569'} stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="89" cy="56" r="2.5" fill="#f8fafc" />
          <line x1="95" y1="48" x2="98" y2="48" stroke="#475569" strokeWidth="1.5" />
          <line x1="95" y1="54" x2="98" y2="54" stroke="#475569" strokeWidth="1.5" />
          <line x1="95" y1="60" x2="98" y2="60" stroke="#475569" strokeWidth="1.5" />
        </g>

        {/* Front Bumper & Headlamps */}
        <rect x="98" y="42" width="6" height="12" rx="1" fill="#334155" stroke="#1e293b" strokeWidth="1" />
        <circle cx="101" cy="46" r="2" fill={stage >= 3 ? (variantType === 'electric' ? '#67e8f9' : '#fef08a') : '#64748b'} />

        {/* Machine Icon Badge in Top Left of SVG */}
        <text x="14" y="16" fontSize="13" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))">
          {machineIcon}
        </text>

        {/* Status indicator ring */}
        <circle cx="110" cy="12" r="5" fill={accent} stroke="#0f172a" strokeWidth="1.5" />
      </svg>

      {/* Label and Live Status Badge */}
      <div className="flex items-center gap-1.5 mt-0.5 text-center">
        <span className="font-mono text-[11px] font-semibold text-slate-200 tracking-tight flex items-center gap-1">
          <span className="text-xs">{machineIcon}</span>
          <span>{label}</span>
        </span>
        <span
          className="text-[10px] font-mono px-1 py-0.2 rounded font-medium"
          style={{
            backgroundColor: `${accent}20`,
            color: accent,
            border: `1px solid ${accent}40`,
          }}
        >
          {statusLabel[status]}
        </span>
      </div>
    </div>
  );
};
