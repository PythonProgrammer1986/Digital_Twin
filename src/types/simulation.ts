export interface Station {
  id: string;
  name: string;
  mh: number;              // Standard man-hours work content
  people: number;          // Assigned operators per station copy
  copies: number;          // Parallel station bays
  maxPeople: number;       // Ergonomic physical limit of operators
  bufferCapacity: number;  // WIP buffer queue capacity before station
  color: string;
}

export interface Subassembly {
  id: string;
  name: string;
  mh: number;              // Work content in man-hours
  dueStationIndex: number; // 0-indexed station index
  riskPercent: number;     // Probability of shortage/delay %
  meanDelayHours: number;  // Expected delay in hours if shortage triggers
}

export type VariantType =
  | 'diesel'
  | 'electric'
  | 'flameproof'
  | 'autonomous'
  | 'high_capacity'
  | 'articulated'
  | 'custom';

export interface ProductVariant {
  id: string;
  name: string;
  code: string;
  type: VariantType;
  icon?: string;              // Distinct machine icon (e.g. 🛢️, ⚡, 🛡️, 📡, 🏋️, 🚜, ⚙️)
  description: string;
  mhDelta: number;            // Additional man-hours relative to baseline
  targetStationIndex: number; // Primary station impacted by variant delta (-1 for distributed)
  quantity: number;           // Allocated units in monthly plan
  color: string;
  badge: string;
}

export interface SimConfig {
  demand: number;                  // Monthly target units
  saStations: number;              // Parallel subassembly feeder cells
  saPeople: number;                // Operators per subassembly cell
  saBuffers?: number;              // Material staging buffers per subassembly cell (default 2, ensures cells are never empty)
  shifts: number;                  // Shifts per day (1, 2, or 3)
  shiftHours: number;              // Hours per shift (e.g. 8)
  workingDays: number;             // Working days in month (e.g. 26)
  overtimeHoursPerShift: number;   // Daily overtime hours per shift (0 to 4)
  weekendShifts: number;           // Emergency weekend recovery shifts in month (0 to 8)
  opePercent: number;              // Overall Plant Effectiveness % (e.g. 80)
  skillMean: number;               // Workforce skill mean % (e.g. 95)
  skillVar: number;                // Workforce skill variation % (e.g. 8)
  absenteeismPercent: number;      // Operator absence % (e.g. 4)
  processVariancePercent: number;  // Task duration normal variance % (e.g. 7)
  productMixVariance: number;      // Customization/spec variance % (e.g. 8)
  materialRiskPercent: number;     // Raw material delay risk % (e.g. 8)
  materialDelayHours: number;      // Mean material delay hours (e.g. 5)
  qualityFailPercent: number;      // Quality defect rate % (e.g. 5)
  meanReworkHours: number;         // Mean rework duration (e.g. 4)
  sharedCranes: number;            // Number of overhead heavy cranes (e.g. 2)
  craneRiskPercent: number;        // Crane contention/breakdown risk % (e.g. 3)
  craneDelayHours: number;         // Mean crane waiting delay (e.g. 2)
  costPerPersonShift: number;      // Cost per operator per shift in INR
  costPerStation: number;          // Fixed capital/maintenance cost per physical bay in INR
  revenuePerUnit: number;          // Selling price/value per completed unit in INR
  mcRuns: number;                  // Monte Carlo iterations (e.g. 60)
  randomSeed: number;              // Seed for reproducible simulations
  stations: Station[];
  subassemblies: Subassembly[];
  variants: ProductVariant[];
}

export interface OpResult {
  stationIndex: number;
  stationName: string;
  queueTime: number;      // Time arrived in queue
  craneWaitTime: number;  // Waiting for overhead crane
  materialDelay: number;  // Material shortage wait
  startTime: number;      // Actual work start
  finishTime: number;     // Assembly work complete
  reworkTime: number;     // Quality rework duration (if failed)
  gateTime: number;       // Release from quality gate
  waitTime: number;       // Queue wait before work
  duration: number;       // Actual processing duration
  workerCount: number;    // Effective workers allocated
}

export interface SubassemblyResult {
  name: string;
  dueStationIndex: number;
  startTime: number;
  duration: number;
  delay: number;
  readyTime: number;
  bufferSlotUsed?: number;          // 1 or 2 material staging buffer slot
  bufferedMaterialsReady?: boolean; // True when material kit is pre-staged in buffer
  starvationPrevented?: boolean;   // True if the 2-buffer system prevented SA cell from running empty
}

export interface MachineResult {
  id: number;
  name: string;
  variant: ProductVariant;
  releaseTime: number;
  ops: OpResult[];
  subassemblies: SubassemblyResult[];
  finishTime: number;
  leadTime: number;
  variantFactor: number;
  totalDelay: number;
  totalRework: number;
}

export interface LossBreakdown {
  material: number;
  quality: number;
  crane: number;
  queue: number;
  total: number;
}

export interface SimResult {
  config: SimConfig;
  horizonHours: number;
  taktHours: number;
  machines: MachineResult[];
  completedCount: number;
  completionRate: number;      // completedCount / demand
  losses: LossBreakdown;
  stationBusyHours: number[];
  stationUtilization: number[];
  stationCycleTimes: number[];
  subassemblyCycleTime: number;
  saBuffersPerCell?: number;   // 2 material buffers per SA cell
  saStarvationsPrevented?: number; // Total times 2 material buffers prevented SA cell starvation
  primaryConstraint: string;
  bottleneckStationIndex: number; // -1 if subassembly is bottleneck
  totalPeople: number;
  totalOperatingCost: number;
  estimatedRevenue: number;
  netMargin: number;
  lineBalanceEfficiency: number; // %
  smoothnessIndex: number;
  monteCarlo: {
    outputs: number[];
    pMeetTarget: number;
    mean: number;
    std: number;
    p10: number;
    p50: number;
    p90: number;
    min: number;
    max: number;
  };
}

export interface ParameterRecommendation {
  id: string;
  type: 'workingDays' | 'shifts' | 'overtime' | 'weekendShifts' | 'stationBay' | 'kaizen' | 'ope';
  title: string;
  description: string;
  currentValue: string | number;
  recommendedValue: string | number;
  impactDescription: string;
  patch: Partial<SimConfig>;
}

export interface OptimizationRecommendation {
  optimizedStations: Station[];
  optimizedSaStations: number; // Parallel Subassembly Cells
  optimizedSaPeople: number;   // Technicians Per SA Cell
  targetDemand: number;        // Monthly Target Requirement
  estimatedOutput: number;
  confidenceScore: number;
  totalPeopleBefore: number;
  totalPeopleAfter: number;
  costDelta: number;
  isCompletedBeforeWorkingDays: boolean;
  workingDaysAvailable: number;
  workingDaysRequired: number;
  daysMargin: number; // positive = days ahead of month-end schedule, negative = days deficit/overdue
  lastUnitFinishHour: number;
  availableHorizonHours: number;
  parameterRecommendations: ParameterRecommendation[];
  cycleTimeImprovements: {
    stationName: string;
    beforeCycle: number;
    afterCycle: number;
    targetTakt: number;
    beforeOperators: number;
    afterOperators: number;
  }[];
  operatorAllocations: {
    stationName: string;
    stationIndex: number;
    beforeOperators: number;
    afterOperators: number;
    maxAllowed: number;
  }[];
  subassemblySummary: {
    beforeCells: number;
    afterCells: number;
    beforeTechsPerCell: number;
    afterTechsPerCell: number;
    totalPersonnelBefore: number;
    totalPersonnelAfter: number;
  };
  monteCarloOneLiner: string;
  explanation: string;
  actions: string[];
}

export interface SensitivityFactor {
  id: string;
  name: string;
  parameterKey: keyof SimConfig;
  unit: string;
  baselineValue: number;
  lowValue: number;
  highValue: number;
  baselineOutput: number;
  lowOutput: number;
  highOutput: number;
  baselineConfidence: number;
  lowConfidence: number;
  highConfidence: number;
  outputSwing: number;
  confidenceSwing: number;
  insight: string;
  impactRank?: number;
}

export interface ScenarioItem {
  id: string;
  name: string;
  description: string;
  badge: string;
  createdAt: string;
  config: SimConfig;
  result: SimResult;
}

export interface RecoveryPlanResult {
  overtimeHoursPerShift: number;
  weekendShifts: number;
  extendedHorizonHours: number;
  regularHorizonHours: number;
  recoveredUnits: number;
  baselineOutput: number;
  targetDemand: number;
  regularLaborCost: number;
  overtimePremiumCost: number;
  totalLaborCost: number;
  recoveredRevenue: number;
  netRecoveryPayoff: number;
  meetsFullDemand: boolean;
}

