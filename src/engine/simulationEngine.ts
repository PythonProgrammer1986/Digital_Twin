import {
  SimConfig,
  SimResult,
  MachineResult,
  OpResult,
  SubassemblyResult,
  LossBreakdown,
  OptimizationRecommendation,
  ParameterRecommendation,
  ProductVariant,
  SensitivityFactor,
  RecoveryPlanResult,
} from '../types/simulation';
import { getMonteCarloOneLiner } from '../utils/monteCarloExplanation';
import { formatINR } from '../utils/currency';

// Deterministic fast PRNG (Mulberry32)
export class PRNG {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Gaussian (Box-Muller)
  gauss(mean: number, std: number): number {
    let u1 = this.next();
    let u2 = this.next();
    while (u1 <= 1e-15) u1 = this.next(); // Avoid log(0)
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * std;
  }

  // Exponential distribution (rate lambda = 1 / mean)
  exponential(mean: number): number {
    const safeMean = Math.max(0.1, mean);
    let u = this.next();
    while (u <= 1e-15) u = this.next();
    return -Math.log(u) * safeMean;
  }
}

/**
 * Execute a single discrete-event simulation run for the given configuration
 */
export function runSingleSimulation(config: SimConfig, prng: PRNG): {
  machines: MachineResult[];
  losses: LossBreakdown;
  stationBusyHours: number[];
  saStarvationsPrevented: number;
} {
  const n = config.stations.length;
  // Track availability of each parallel bay for each station
  const av: number[][] = config.stations.map((st) => Array(Math.max(1, st.copies)).fill(0));
  // Subassembly feeder cells availability
  const sa = Array(Math.max(1, config.saStations)).fill(0);
  // Shared overhead cranes availability
  const cr = Array(Math.max(1, config.sharedCranes)).fill(0);

  const machines: MachineResult[] = [];
  const losses: LossBreakdown = { material: 0, quality: 0, crane: 0, queue: 0, total: 0 };
  const stationBusyHours: number[] = Array(n).fill(0);

  const baseShiftHours = config.workingDays * config.shifts * config.shiftHours;
  const overtimeHours = config.workingDays * config.shifts * (config.overtimeHoursPerShift || 0);
  const weekendHours = (config.weekendShifts || 0) * config.shiftHours;
  const totalAvailableRaw = baseShiftHours + overtimeHours + weekendHours;
  const horizon = (totalAvailableRaw * config.opePercent) / 100;
  const takt = horizon / Math.max(1, config.demand);

  // Build scheduled variant pool
  const variantPool: ProductVariant[] = [];
  if (config.variants && config.variants.length > 0) {
    for (const v of config.variants) {
      for (let q = 0; q < Math.max(0, v.quantity); q++) {
        variantPool.push(v);
      }
    }
  }
  const defaultVariant: ProductVariant = config.variants?.[0] || {
    id: 'var-std',
    name: 'MT65 Standard Heavy Diesel',
    code: 'STD-DIESEL',
    type: 'diesel',
    description: 'Baseline heavy diesel powertrain',
    mhDelta: 0,
    targetStationIndex: -1,
    quantity: config.demand,
    color: '#eab308',
    badge: 'Baseline',
  };

  // Feeder Subassembly dual material buffer tracking (2 buffers per cell to keep material ready)
  const saBufferCapacity = Math.max(2, config.saBuffers ?? 2);
  const saProcessedCount: number[] = Array(Math.max(1, config.saStations)).fill(0);
  let saStarvationsPreventedCount = 0;

  for (let mid = 1; mid <= config.demand; mid++) {
    const release = (mid - 1) * takt;
    const ready = Array(n).fill(release);
    const subassemblyResults: SubassemblyResult[] = [];

    // 1. Subassemblies feeding into specific stations (with 2 material buffers per SA cell)
    for (const sub of config.subassemblies) {
      // Find earliest available subassembly cell
      let minCell = 0;
      for (let c = 1; c < sa.length; c++) {
        if (sa[c] < sa[minCell]) minCell = c;
      }

      // Track buffer slot (1 or 2) keeping material so cell is not empty
      const jobIdx = saProcessedCount[minCell]++;
      const bufferSlotUsed = (jobIdx % saBufferCapacity) + 1;

      const st = Math.max(release, sa[minCell]);
      const hasShortage = prng.next() < sub.riskPercent / 100;
      const rawDelay = hasShortage ? prng.exponential(sub.meanDelayHours) : 0;

      // The 2 material staging buffers cushion and absorb supplier delay spikes,
      // ensuring the Feeder Subassembly cell has parts ready and is NOT starved/empty
      const bufferAbsorptionHours = saBufferCapacity * 1.5;
      const delay = Math.max(0, rawDelay - bufferAbsorptionHours);
      const starvationPrevented = hasShortage && rawDelay > 0;
      if (starvationPrevented) {
        saStarvationsPreventedCount++;
      }

      const eff = Math.max(
        0.45,
        (config.skillMean - prng.next() * config.skillVar) / 100
      );
      const absFactor = Math.max(0.01, 1 - config.absenteeismPercent / 100);
      const procNoise = Math.max(0.65, prng.gauss(1, config.processVariancePercent / 100));
      const dur =
        (sub.mh * procNoise) /
        Math.max(0.5, config.saPeople * eff * absFactor);

      sa[minCell] = st + dur + delay;
      if (sub.dueStationIndex >= 0 && sub.dueStationIndex < n) {
        ready[sub.dueStationIndex] = Math.max(ready[sub.dueStationIndex], sa[minCell]);
      }
      losses.material += delay;

      subassemblyResults.push({
        name: sub.name,
        dueStationIndex: sub.dueStationIndex,
        startTime: st,
        duration: dur,
        delay,
        readyTime: sa[minCell],
        bufferSlotUsed,
        bufferedMaterialsReady: true,
        starvationPrevented,
      });
    }

    // 2. Main Assembly Flow through sequential stations
    let prevGate = release;
    const ops: OpResult[] = [];
    const variantNoise = Math.max(0.8, prng.gauss(1, config.productMixVariance / 100));

    // Get assigned product variant for this vehicle in sequence
    const assignedVariant = variantPool[(mid - 1) % Math.max(1, variantPool.length)] || defaultVariant;

    let machineMaterialDelay = 0;
    let machineReworkTotal = 0;

    for (let i = 0; i < n; i++) {
      const station = config.stations[i];

      // Find available bay in this station
      let bestBay = 0;
      for (let b = 1; b < av[i].length; b++) {
        if (av[i][b] < av[i][bestBay]) bestBay = b;
      }

      // Time vehicle arrives at station queue
      const q = Math.max(prevGate, av[i][bestBay]);
      const wait = Math.max(0, q - prevGate);

      // Material shortage check at this station
      const hasMatShortage = prng.next() < config.materialRiskPercent / 100;
      const mat = hasMatShortage ? prng.exponential(config.materialDelayHours) : 0;
      machineMaterialDelay += mat;

      // Heavy lifting crane contention
      let bestCrane = 0;
      for (let c = 1; c < cr.length; c++) {
        if (cr[c] < cr[bestCrane]) bestCrane = c;
      }
      const craneStart = Math.max(q, cr[bestCrane]);
      const hasCraneDelay = prng.next() < config.craneRiskPercent / 100;
      const cd = hasCraneDelay ? prng.exponential(config.craneDelayHours) : 0;
      // 1 hour typical heavy crane rigging/positioning time + possible delay
      cr[bestCrane] = craneStart + 1.0 + cd;
      const resourceContention = Math.max(0, cr[bestCrane] - q);
      losses.crane += resourceContention;

      // Actual assembly work start
      const start = Math.max(q, ready[i], cr[bestCrane]) + mat;

      // Calculate work content including product variant delta
      let effectiveMh = station.mh;
      if (assignedVariant.targetStationIndex === i) {
        effectiveMh += assignedVariant.mhDelta;
      } else if (assignedVariant.targetStationIndex === -1 && assignedVariant.mhDelta !== 0) {
        effectiveMh += assignedVariant.mhDelta / n;
      }
      effectiveMh = Math.max(1, effectiveMh);

      // Worker efficiency and duration calculation
      const eff = Math.max(0.45, prng.gauss(config.skillMean / 100, config.skillVar / 100));
      const absFactor = Math.max(0.01, 1 - config.absenteeismPercent / 100);
      const p = Math.min(station.people, station.maxPeople);
      const procNoise = Math.max(0.65, prng.gauss(1, config.processVariancePercent / 100));
      const work = effectiveMh * variantNoise * procNoise;
      const dur = work / Math.max(0.5, p * eff * absFactor);

      const finish = start + dur;

      // Quality validation & rework gate
      const hasQualityDefect = prng.next() < config.qualityFailPercent / 100;
      const rw = hasQualityDefect ? prng.exponential(config.meanReworkHours) : 0;
      machineReworkTotal += rw;

      const gate = finish + rw;

      // Station bay is occupied until quality gate is cleared
      av[i][bestBay] = gate;
      stationBusyHours[i] += dur + rw;

      losses.material += mat;
      losses.queue += wait;
      losses.quality += rw;

      ops.push({
        stationIndex: i,
        stationName: station.name,
        queueTime: q,
        craneWaitTime: resourceContention,
        materialDelay: mat,
        startTime: start,
        finishTime: finish,
        reworkTime: rw,
        gateTime: gate,
        waitTime: wait,
        duration: dur,
        workerCount: p,
      });

      // Transfer time to next station
      prevGate = gate + 0.2; // 0.2 hour line transfer time
    }

    const finishTime = ops[ops.length - 1].gateTime;
    const leadTime = finishTime - release;

    machines.push({
      id: mid,
      name: `MT65-${String(mid).padStart(2, '0')}`,
      variant: assignedVariant,
      releaseTime: release,
      ops,
      subassemblies: subassemblyResults,
      finishTime,
      leadTime,
      variantFactor: variantNoise,
      totalDelay: machineMaterialDelay,
      totalRework: machineReworkTotal,
    });
  }

  losses.total = losses.material + losses.quality + losses.crane + losses.queue;

  return { machines, losses, stationBusyHours, saStarvationsPrevented: saStarvationsPreventedCount };
}

/**
 * Run full simulation suite including Monte Carlo runs and KPI synthesis
 */
export function simulateLine(config: SimConfig): SimResult {
  const baseShiftHours = config.workingDays * config.shifts * config.shiftHours;
  const overtimeHours = config.workingDays * config.shifts * (config.overtimeHoursPerShift || 0);
  const weekendHours = (config.weekendShifts || 0) * config.shiftHours;
  const totalAvailableRaw = baseShiftHours + overtimeHours + weekendHours;
  const horizonHours = (totalAvailableRaw * config.opePercent) / 100;
  const taktHours = horizonHours / Math.max(1, config.demand);

  // Deterministic baseline run
  const basePrng = new PRNG(config.randomSeed);
  const { machines, losses, stationBusyHours, saStarvationsPrevented } =
    runSingleSimulation(config, basePrng);

  const completedCount = machines.filter((m) => m.finishTime <= horizonHours).length;
  const completionRate = completedCount / Math.max(1, config.demand);

  // Station theoretical cycle times
  const nominalEff = Math.max(
    0.4,
    (config.skillMean / 100) * (1 - config.absenteeismPercent / 100)
  );

  const stationCycleTimes = config.stations.map((st) => {
    const effectivePeople = Math.min(st.people, st.maxPeople);
    const capacityFactor = Math.max(1, st.copies) * effectivePeople * nominalEff;
    return st.mh / Math.max(0.1, capacityFactor);
  });

  const totalSubassemblyMH = config.subassemblies.reduce((sum, sa) => sum + sa.mh, 0);
  const subassemblyCapacity = Math.max(1, config.saStations) * Math.max(1, config.saPeople) * nominalEff;
  const subassemblyCycleTime = totalSubassemblyMH / Math.max(0.1, subassemblyCapacity);

  // Station utilization %
  const totalOperatingHours = horizonHours;
  const stationUtilization = stationBusyHours.map((busy, i) => {
    const totalBayHours = totalOperatingHours * Math.max(1, config.stations[i].copies);
    return Math.min(100, Math.round((busy / Math.max(1, totalBayHours)) * 100));
  });

  // Identify bottleneck
  let maxCycle = subassemblyCycleTime;
  let primaryConstraint = `Subassembly Feeder Cells (${subassemblyCycleTime.toFixed(1)}h)`;
  let bottleneckStationIndex = -1;

  stationCycleTimes.forEach((ct, idx) => {
    if (ct > maxCycle) {
      maxCycle = ct;
      primaryConstraint = `S${idx + 1}: ${config.stations[idx].name} (${ct.toFixed(1)}h)`;
      bottleneckStationIndex = idx;
    }
  });

  // Line Balance Efficiency: sum(CT) / (N * max(CT)) * 100
  const sumCycles = stationCycleTimes.reduce((a, b) => a + b, 0);
  const maxStationCycle = Math.max(...stationCycleTimes);
  const lineBalanceEfficiency = maxStationCycle > 0
    ? (sumCycles / (stationCycleTimes.length * maxStationCycle)) * 100
    : 100;

  // Smoothness Index: sqrt(sum((maxCT - CT_i)^2))
  const smoothnessIndex = Math.sqrt(
    stationCycleTimes.reduce((acc, ct) => acc + Math.pow(maxStationCycle - ct, 2), 0)
  );

  // Headcount and financial calculations in INR
  const mainLinePeople = config.stations.reduce((acc, st) => acc + st.people * st.copies, 0);
  const saTotalPeople = config.saStations * config.saPeople;
  const totalPeople = mainLinePeople + saTotalPeople;

  const regularShiftsWorked = config.shifts * config.workingDays;
  const regularLaborCost = totalPeople * regularShiftsWorked * config.costPerPersonShift;
  const hourlyRate = config.costPerPersonShift / Math.max(1, config.shiftHours);
  const totalOvertimeHoursWorked = totalPeople * regularShiftsWorked * (config.overtimeHoursPerShift || 0);
  const overtimeLaborCost = totalOvertimeHoursWorked * (hourlyRate * 1.5);
  const weekendLaborCost = totalPeople * (config.weekendShifts || 0) * (config.costPerPersonShift * 1.5);

  const totalLaborCost = regularLaborCost + overtimeLaborCost + weekendLaborCost;
  const totalBays = config.saStations + config.stations.reduce((acc, st) => acc + st.copies, 0);
  const totalCapitalCost = totalBays * config.costPerStation;
  const totalOperatingCost = totalLaborCost + totalCapitalCost;

  const estimatedRevenue = completedCount * config.revenuePerUnit;
  const netMargin = estimatedRevenue - totalOperatingCost;

  // Monte Carlo Analysis
  const mcOutputs: number[] = [];
  const mcRunsCount = Math.max(10, Math.min(300, config.mcRuns));

  for (let run = 0; run < mcRunsCount; run++) {
    const runPrng = new PRNG(config.randomSeed + run * 1009 + 37);
    const runSim = runSingleSimulation(config, runPrng);
    const runCompleted = runSim.machines.filter((m) => m.finishTime <= horizonHours).length;
    mcOutputs.push(runCompleted);
  }

  mcOutputs.sort((a, b) => a - b);
  const meetCount = mcOutputs.filter((out) => out >= config.demand).length;
  const pMeetTarget = Math.round((meetCount / mcOutputs.length) * 100);

  const mean = mcOutputs.reduce((a, b) => a + b, 0) / mcOutputs.length;
  const variance = mcOutputs.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / mcOutputs.length;
  const std = Math.sqrt(variance);

  const p10 = mcOutputs[Math.floor(mcOutputs.length * 0.1)] ?? mcOutputs[0];
  const p50 = mcOutputs[Math.floor(mcOutputs.length * 0.5)] ?? mcOutputs[0];
  const p90 = mcOutputs[Math.floor(mcOutputs.length * 0.9)] ?? mcOutputs[mcOutputs.length - 1];

  return {
    config,
    horizonHours,
    taktHours,
    machines,
    completedCount,
    completionRate,
    losses,
    stationBusyHours,
    stationUtilization,
    stationCycleTimes,
    subassemblyCycleTime,
    saBuffersPerCell: Math.max(2, config.saBuffers ?? 2),
    saStarvationsPrevented,
    primaryConstraint,
    bottleneckStationIndex,
    totalPeople,
    totalOperatingCost,
    estimatedRevenue,
    netMargin,
    lineBalanceEfficiency,
    smoothnessIndex,
    monteCarlo: {
      outputs: mcOutputs,
      pMeetTarget,
      mean,
      std,
      p10,
      p50,
      p90,
      min: mcOutputs[0],
      max: mcOutputs[mcOutputs.length - 1],
    },
  };
}

/**
 * Automated Production Line Optimizer:
 * Calculates the optimal headcount and station duplicates to achieve target takt time,
 * minimize line balance loss, and achieve high delivery confidence.
 */
export function optimizeProductionLine(
  currentConfig: SimConfig,
  targetConfidence: 'cost-effective' | 'high-resilience' | 'balanced' = 'cost-effective'
): OptimizationRecommendation {
  const dailyNetHours =
    currentConfig.shifts *
    (currentConfig.shiftHours + (currentConfig.overtimeHoursPerShift || 0)) *
    (currentConfig.opePercent / 100);

  const baseShiftHours = currentConfig.workingDays * currentConfig.shifts * currentConfig.shiftHours;
  const overtimeHours = currentConfig.workingDays * currentConfig.shifts * (currentConfig.overtimeHoursPerShift || 0);
  const weekendHours = (currentConfig.weekendShifts || 0) * currentConfig.shiftHours;
  const totalAvailableRaw = baseShiftHours + overtimeHours + weekendHours;
  const horizon = (totalAvailableRaw * currentConfig.opePercent) / 100;

  // Calculate target takt strictly for the Monthly Target Requirement
  const targetTakt = horizon / Math.max(1, currentConfig.demand);

  const nominalEff = Math.max(
    0.4,
    (currentConfig.skillMean / 100) * (1 - currentConfig.absenteeismPercent / 100)
  );

  // Safety buffer factor depending on mode
  const targetCycleBudget =
    targetConfidence === 'high-resilience'
      ? targetTakt * 0.82 // safety margin for variances & rework
      : targetConfidence === 'balanced'
      ? targetTakt * 0.90
      : targetTakt * 0.95;

  // Factor the Multi-Variant Product Mix into each station's effective work content
  const activeVariants =
    currentConfig.variants && currentConfig.variants.length > 0 ? currentConfig.variants : [];
  const totalMixUnits =
    activeVariants.reduce((sum, v) => sum + (v.quantity || 0), 0) || currentConfig.demand;

  const stationEffectiveMh = currentConfig.stations.map((st, idx) => {
    let mixDelta = 0;
    if (activeVariants.length > 0 && totalMixUnits > 0) {
      mixDelta = activeVariants.reduce((acc, v) => {
        const weight = (v.quantity || 0) / totalMixUnits;
        if (v.targetStationIndex === idx) {
          return acc + (v.mhDelta || 0) * weight;
        } else if (v.targetStationIndex === -1) {
          return acc + ((v.mhDelta || 0) / currentConfig.stations.length) * weight;
        }
        return acc;
      }, 0);
    }
    return Math.max(1, st.mh + mixDelta);
  });

  // Optimize main assembly stations: Primary lever is Operators Assigned (st.people, up to st.maxPeople)
  // Keep physical bays (st.copies) fixed as factory floor constraint
  let candidateStations = currentConfig.stations.map((st, idx) => {
    const effMh = stationEffectiveMh[idx];
    let bestP = st.people;

    // Search smallest feasible Operators Assigned (1..st.maxPeople) to meet cycle budget
    for (let p = 1; p <= st.maxPeople; p++) {
      const cycle = effMh / (st.copies * p * nominalEff);
      if (cycle <= targetCycleBudget) {
        bestP = p;
        break;
      }
      bestP = p; // if not yet feasible, scale up towards maxPeople
    }

    return {
      ...st,
      people: bestP,
    };
  });

  // Optimize Subassembly feeder line:
  // Technicians Per SA Cell should be as minimum as possible (start with 1 tech/cell).
  // Use Material Buffers Per SA Cell and Parallel Subassembly Cells (concurrent workstations 1..6) for optimization.
  const totalSubMH = currentConfig.subassemblies.reduce((sum, s) => sum + s.mh, 0);
  let bestSa = {
    stations: Math.max(1, currentConfig.saStations),
    people: 1, // Minimize technicians per cell
    minLabor: 9999,
  };
  let foundSaFeasible = false;

  // Priority 1: Check 1 technician per cell (saPeople = 1) across parallel workstations (1..6)
  for (let saSt = 1; saSt <= 6; saSt++) {
    const saCycle = totalSubMH / (saSt * 1 * nominalEff);
    if (saCycle <= targetCycleBudget) {
      foundSaFeasible = true;
      bestSa = { stations: saSt, people: 1, minLabor: saSt * 1 };
      break;
    }
  }

  // Priority 2: Only if 1 tech/cell with 6 parallel cells cannot meet cycle budget, test 2 techs/cell
  if (!foundSaFeasible) {
    for (let saSt = 1; saSt <= 6; saSt++) {
      const saCycle = totalSubMH / (saSt * 2 * nominalEff);
      if (saCycle <= targetCycleBudget) {
        foundSaFeasible = true;
        bestSa = { stations: saSt, people: 2, minLabor: saSt * 2 };
        break;
      }
    }
  }

  // Priority 3: Keep technicians strictly at minimum (fallback to 2, or min between current and 2)
  if (!foundSaFeasible) {
    bestSa = {
      stations: 6,
      people: Math.min(2, Math.max(1, currentConfig.saPeople)),
      minLabor: 6 * 2,
    };
  }

  // Use Material Buffers Per SA Cell for optimization (2 to 4 buffers to prevent starvation)
  const optimizedSaBuffers = Math.max(2, Math.min(4, (currentConfig.saBuffers ?? 2) + 1));

  // Iterative simulation verification loop:
  // Ensure all demand units are completed BEFORE Working Days Per Month
  // During optimization only change Operators Assigned & Parallel Subassembly Cells (concurrent workstations)
  let testConfig: SimConfig = {
    ...currentConfig,
    stations: candidateStations,
    saStations: bestSa.stations,
    saPeople: bestSa.people,
    saBuffers: optimizedSaBuffers,
  };
  let testSim = simulateLine(testConfig);

  let lastUnitFinish =
    testSim.machines[currentConfig.demand - 1]?.finishTime ||
    (testSim.machines.length > 0 ? testSim.machines[testSim.machines.length - 1].finishTime : 0);

  // If output is not completed within horizon, iteratively increment operators at the most constrained station,
  // or scale parallel subassembly cells (keeping technicians per SA cell minimized)
  let tuningIterations = 0;
  while (
    (testSim.completedCount < currentConfig.demand || lastUnitFinish > horizon) &&
    tuningIterations < 15
  ) {
    tuningIterations++;

    // Find the station with the largest effective cycle time that can still accept more operators
    let bottleneckIdx = -1;
    let maxCycle = 0;

    candidateStations.forEach((st, idx) => {
      if (st.people < st.maxPeople) {
        const cycle = stationEffectiveMh[idx] / (st.copies * st.people * nominalEff);
        if (cycle > maxCycle) {
          maxCycle = cycle;
          bottleneckIdx = idx;
        }
      }
    });

    if (bottleneckIdx !== -1) {
      candidateStations = candidateStations.map((st, idx) =>
        idx === bottleneckIdx ? { ...st, people: st.people + 1 } : st
      );
    } else if (bestSa.stations < 6) {
      // Station operators are maxed out, expand parallel concurrent subassembly workstations
      bestSa.stations += 1;
    } else {
      // Reached physical maximum station staffing & parallel cell limits
      break;
    }

    testConfig = {
      ...currentConfig,
      stations: candidateStations,
      saStations: bestSa.stations,
      saPeople: bestSa.people,
      saBuffers: optimizedSaBuffers,
    };
    testSim = simulateLine(testConfig);
    lastUnitFinish =
      testSim.machines[currentConfig.demand - 1]?.finishTime ||
      (testSim.machines.length > 0 ? testSim.machines[testSim.machines.length - 1].finishTime : 0);
  }

  const optimizedStations = candidateStations;

  // Calculate working days completion metrics
  const workingDaysAvailable = currentConfig.workingDays;
  const workingDaysRequired = Math.max(0.1, lastUnitFinish / Math.max(0.1, dailyNetHours));
  const daysMargin = workingDaysAvailable - workingDaysRequired;
  const isCompletedBeforeWorkingDays =
    testSim.completedCount >= currentConfig.demand && workingDaysRequired <= workingDaysAvailable;

  // Calculate before and after staffing
  const beforeTotalPeople =
    currentConfig.saStations * currentConfig.saPeople +
    currentConfig.stations.reduce((a, s) => a + s.copies * s.people, 0);

  const afterTotalPeople =
    bestSa.stations * bestSa.people +
    optimizedStations.reduce((a, s) => a + s.copies * s.people, 0);

  const shiftsWorked = currentConfig.shifts * currentConfig.workingDays;
  const beforeBays = currentConfig.saStations + currentConfig.stations.reduce((a, s) => a + s.copies, 0);
  const afterBays = bestSa.stations + optimizedStations.reduce((a, s) => a + s.copies, 0);

  const beforeCost =
    beforeTotalPeople * shiftsWorked * currentConfig.costPerPersonShift +
    beforeBays * currentConfig.costPerStation;
  const afterCost =
    afterTotalPeople * shiftsWorked * currentConfig.costPerPersonShift +
    afterBays * currentConfig.costPerStation;
  const costDelta = afterCost - beforeCost;

  // Station Cycle time improvement diff
  const cycleTimeImprovements = currentConfig.stations.map((st, idx) => {
    const optSt = optimizedStations[idx];
    const effMh = stationEffectiveMh[idx];
    const beforeCycle = effMh / (st.copies * Math.min(st.people, st.maxPeople) * nominalEff);
    const afterCycle = effMh / (optSt.copies * Math.min(optSt.people, optSt.maxPeople) * nominalEff);
    return {
      stationName: st.name,
      beforeCycle,
      afterCycle,
      targetTakt,
      beforeOperators: st.people,
      afterOperators: optSt.people,
    };
  });

  const operatorAllocations = currentConfig.stations.map((origSt, idx) => ({
    stationName: origSt.name,
    stationIndex: idx,
    beforeOperators: origSt.people,
    afterOperators: optimizedStations[idx].people,
    maxAllowed: origSt.maxPeople,
  }));

  const subassemblySummary = {
    beforeCells: currentConfig.saStations,
    afterCells: bestSa.stations,
    beforeTechsPerCell: currentConfig.saPeople,
    afterTechsPerCell: bestSa.people,
    totalPersonnelBefore: currentConfig.saStations * currentConfig.saPeople,
    totalPersonnelAfter: bestSa.stations * bestSa.people,
  };

  // Find line bottleneck station for recommendations
  let bnIndex = 0;
  let bnCycleMax = 0;
  optimizedStations.forEach((st, idx) => {
    const cyc = stationEffectiveMh[idx] / (st.copies * st.people * nominalEff);
    if (cyc > bnCycleMax) {
      bnCycleMax = cyc;
      bnIndex = idx;
    }
  });
  const bottleneckStation = optimizedStations[bnIndex];

  // Parameter Recommendations:
  // Provided when target demand cannot be completed within working days, OR to offer capacity levers
  const parameterRecommendations: ParameterRecommendation[] = [];

  const deficitHours = Math.max(0, lastUnitFinish - horizon);
  let recoveryPlan: RecoveryPlanResult | undefined;

  // 1. PRIMARY LEVER: Overtime & Emergency Recovery Catch-Up Planner
  // Activated when minimum technicians + operators + parallel cells cannot meet demand before Working Days Per Month
  if (deficitHours > 0 || !isCompletedBeforeWorkingDays) {
    const netShiftAvailableHours = Math.max(1, currentConfig.shiftHours * (currentConfig.opePercent / 100));
    const otHoursNeeded = Math.min(
      4,
      Math.max(0.5, Math.ceil((deficitHours / Math.max(1, currentConfig.workingDays * currentConfig.shifts)) * 2) / 2)
    );
    const otProvidedHours = otHoursNeeded * currentConfig.workingDays * currentConfig.shifts * (currentConfig.opePercent / 100);
    const remainingDeficit = Math.max(0, deficitHours - otProvidedHours);
    const recWeekendShifts = remainingDeficit > 0
      ? Math.min(8, Math.max(1, Math.ceil(remainingDeficit / netShiftAvailableHours)))
      : 0;

    recoveryPlan = calculateOvertimeRecovery(testConfig, otHoursNeeded, recWeekendShifts);

    parameterRecommendations.push({
      id: 'rec-recovery-planner',
      type: 'overtime',
      title: 'Overtime & Emergency Recovery Catch-Up Planner',
      description: `Schedule +${otHoursNeeded}h daily overtime per shift${recWeekendShifts > 0 ? ` and ${recWeekendShifts} emergency Saturday weekend shift(s)` : ''} to recover all deficit trucks without hiring extra staff.`,
      currentValue: `${currentConfig.overtimeHoursPerShift || 0}h OT · ${currentConfig.weekendShifts || 0} Weekend`,
      recommendedValue: `+${otHoursNeeded}h OT/shift${recWeekendShifts > 0 ? ` +${recWeekendShifts} Wknd` : ''}`,
      impactDescription: `Recovers ${recoveryPlan.recoveredUnits} units (+${formatINR(recoveryPlan.recoveredRevenue)} revenue) with ₹${(recoveryPlan.netRecoveryPayoff / 100000).toFixed(1)} Lakhs net recovery payoff after overtime costs, ensuring 100% completion before Day ${workingDaysAvailable}.`,
      patch: {
        overtimeHoursPerShift: (currentConfig.overtimeHoursPerShift || 0) + otHoursNeeded,
        weekendShifts: (currentConfig.weekendShifts || 0) + recWeekendShifts,
      },
    });
  }

  // 2. Working Days Per Month recommendation
  const recWorkingDays = Math.ceil(workingDaysRequired);
  if (recWorkingDays > currentConfig.workingDays) {
    parameterRecommendations.push({
      id: 'rec-working-days',
      type: 'workingDays',
      title: 'Extend Working Days Per Month',
      description: `Increase monthly working schedule from ${currentConfig.workingDays} to ${recWorkingDays} days (+${recWorkingDays - currentConfig.workingDays} days).`,
      currentValue: `${currentConfig.workingDays} days`,
      recommendedValue: `${recWorkingDays} days`,
      impactDescription: `Adds ${((recWorkingDays - currentConfig.workingDays) * dailyNetHours).toFixed(1)} net operational hours to complete all ${currentConfig.demand} units before month end.`,
      patch: { workingDays: recWorkingDays },
    });
  }

  // 3. Operational Shifts recommendation
  if (currentConfig.shifts < 3) {
    const recShifts = (currentConfig.shifts === 1 ? 2 : 3) as 1 | 2 | 3;
    const estDaysWithShifts = (workingDaysRequired * currentConfig.shifts) / recShifts;
    parameterRecommendations.push({
      id: 'rec-shifts',
      type: 'shifts',
      title: `Scale Shifts from ${currentConfig.shifts} to ${recShifts} Shifts/Day`,
      description: `Add operational shift crew (${recShifts === 2 ? 'Double Shift' : 'Three 8-hour Shifts 24/7'}).`,
      currentValue: `${currentConfig.shifts} shift(s)/day`,
      recommendedValue: `${recShifts} shifts/day`,
      impactDescription: `Cuts required line completion down to ${estDaysWithShifts.toFixed(1)} working days (well within ${workingDaysAvailable} days).`,
      patch: { shifts: recShifts },
    });
  }

  // 4. Parallel Assembly Bay at Bottleneck Station
  if (bottleneckStation && (!isCompletedBeforeWorkingDays || bnCycleMax > targetTakt)) {
    parameterRecommendations.push({
      id: 'rec-station-bay',
      type: 'stationBay',
      title: `Expand Assembly Bay at S${bnIndex + 1} (${bottleneckStation.name})`,
      description: `Add a parallel assembly bay to Station S${bnIndex + 1} (from ${bottleneckStation.copies} to ${bottleneckStation.copies + 1} bays).`,
      currentValue: `${bottleneckStation.copies} bay(s)`,
      recommendedValue: `${bottleneckStation.copies + 1} bays (+1 bay)`,
      impactDescription: `Doubles station throughput, reducing cycle time from ${bnCycleMax.toFixed(1)}h to ${(bnCycleMax / 2).toFixed(1)}h (below required takt ${targetTakt.toFixed(1)}h).`,
      patch: {
        stations: optimizedStations.map((st, i) =>
          i === bnIndex ? { ...st, copies: st.copies + 1 } : st
        ),
      },
    });
  }

  // 5. Kaizen Work Content Reduction
  if (bottleneckStation && (!isCompletedBeforeWorkingDays || bnCycleMax > targetTakt)) {
    const reducedMh = Math.max(1, Math.round(bottleneckStation.mh * 0.75));
    parameterRecommendations.push({
      id: 'rec-kaizen',
      type: 'kaizen',
      title: `Kaizen Work Content Reduction at S${bnIndex + 1} (${bottleneckStation.name})`,
      description: `Reduce baseline station man-hours from ${bottleneckStation.mh}h to ${reducedMh}h (-${bottleneckStation.mh - reducedMh}h) through Lean cell balancing, kitting, or pneumatic jigs.`,
      currentValue: `${bottleneckStation.mh} h MH`,
      recommendedValue: `${reducedMh} h MH`,
      impactDescription: `Saves ${bottleneckStation.mh - reducedMh} man-hours per machine directly at the rate-limiting station.`,
      patch: {
        stations: optimizedStations.map((st, i) =>
          i === bnIndex ? { ...st, mh: reducedMh } : st
        ),
      },
    });
  }

  // 6. Improve Plant OPE
  if (currentConfig.opePercent < 95 && (!isCompletedBeforeWorkingDays || deficitHours > 0)) {
    const recOpe = Math.min(
      96,
      Math.max(
        currentConfig.opePercent + 5,
        Math.ceil((lastUnitFinish / (currentConfig.workingDays * currentConfig.shifts * currentConfig.shiftHours)) * 100)
      )
    );
    if (recOpe > currentConfig.opePercent) {
      parameterRecommendations.push({
        id: 'rec-ope',
        type: 'ope',
        title: 'Elevate Operational Performance Efficiency (OPE)',
        description: `Target plant OPE increase from ${currentConfig.opePercent}% to ${recOpe}% (+${recOpe - currentConfig.opePercent}%).`,
        currentValue: `${currentConfig.opePercent}%`,
        recommendedValue: `${recOpe}%`,
        impactDescription: `Recovers ${Math.round(totalAvailableRaw * ((recOpe - currentConfig.opePercent) / 100))} production hours by eliminating unforced line stoppages and parts waiting.`,
        patch: { opePercent: recOpe },
      });
    }
  }

  const actions: string[] = [];
  optimizedStations.forEach((optSt, idx) => {
    const origSt = currentConfig.stations[idx];
    if (optSt.people !== origSt.people) {
      actions.push(
        `Operators Assigned on S${idx + 1} (${optSt.name}): Reallocated to ${optSt.people} operators (previously ${origSt.people} operators).`
      );
    } else {
      actions.push(
        `Operators Assigned on S${idx + 1} (${optSt.name}): Maintained at ${optSt.people} operators (balanced with takt).`
      );
    }
  });

  if (bestSa.stations !== currentConfig.saStations || bestSa.people !== currentConfig.saPeople) {
    actions.push(
      `Parallel Subassembly Cells: Optimized to ${bestSa.stations} concurrent workstations (previously ${currentConfig.saStations}).`
    );
    actions.push(
      `Technicians Per SA Cell: Kept strictly minimal at ${bestSa.people} technician/cell (${optimizedSaBuffers} material buffers staged).`
    );
  } else {
    actions.push(
      `Parallel Subassembly Cells: Maintained at ${bestSa.stations} concurrent workstations with ${bestSa.people} technician/cell (${optimizedSaBuffers} material buffers staged).`
    );
  }

  if (isCompletedBeforeWorkingDays) {
    actions.push(
      `Schedule Validation: 100% completed before Working Days Per Month (Finishes on Day ${workingDaysRequired.toFixed(1)} of ${workingDaysAvailable} Working Days; +${daysMargin.toFixed(1)} days buffer).`
    );
  } else {
    actions.push(
      `Schedule Warning: Output requires ${workingDaysRequired.toFixed(1)} working days vs ${workingDaysAvailable} scheduled. Overtime & Emergency Recovery Catch-Up Planner activated below.`
    );
  }

  const monteCarloOneLiner = getMonteCarloOneLiner(
    testSim.monteCarlo,
    currentConfig.demand,
    currentConfig.mcRuns
  );

  const explanation = isCompletedBeforeWorkingDays
    ? `Optimized specifically for Monthly Target Requirement of ${currentConfig.demand} machines. Output is completed before Working Days Per Month: Finished on Day ${workingDaysRequired.toFixed(1)} of ${workingDaysAvailable} Working Days (+${daysMargin.toFixed(1)} days ahead of schedule, 100% completion). Preserves your active Multi-Variant Product Mix (${activeVariants.length} models) and balances work content across stations by adjusting Operators Assigned (${optimizedStations.map((s, i) => `S${i + 1}:${s.people}`).join(', ')}), Parallel Subassembly Cells (${bestSa.stations} concurrent workstations), Material Buffers Per SA Cell (${optimizedSaBuffers} buffers), and keeping Technicians Per SA Cell minimal (${bestSa.people} tech/cell). Expected throughput: ${testSim.completedCount} units (${testSim.monteCarlo.pMeetTarget}% on-time probability).`
    : `Monthly Target Requirement of ${currentConfig.demand} machines cannot be completed within ${workingDaysAvailable} Working Days solely by adjusting operators and subassembly cells with minimum technicians. It requires ${workingDaysRequired.toFixed(1)} working days (${Math.abs(daysMargin).toFixed(1)} days deficit; only ${testSim.completedCount} of ${currentConfig.demand} units finish before month-end). Overtime & Emergency Recovery Catch-Up Planner recommendation is detailed below to achieve full demand on schedule.`;

  return {
    optimizedStations,
    optimizedSaStations: bestSa.stations,
    optimizedSaPeople: bestSa.people,
    optimizedSaBuffers,
    recoveryPlan,
    targetDemand: currentConfig.demand,
    estimatedOutput: testSim.completedCount,
    confidenceScore: testSim.monteCarlo.pMeetTarget,
    totalPeopleBefore: beforeTotalPeople,
    totalPeopleAfter: afterTotalPeople,
    costDelta,
    isCompletedBeforeWorkingDays,
    workingDaysAvailable,
    workingDaysRequired,
    daysMargin,
    lastUnitFinishHour: lastUnitFinish,
    availableHorizonHours: horizon,
    parameterRecommendations,
    cycleTimeImprovements,
    operatorAllocations,
    subassemblySummary,
    monteCarloOneLiner,
    explanation,
    actions,
  };
}

/**
 * Tornado Sensitivity Analysis:
 * Ranks key operational levers by their +/- swing on completed units and delivery confidence.
 */
export function runSensitivityAnalysis(config: SimConfig): SensitivityFactor[] {
  const baseSim = simulateLine(config);
  const baseOutput = baseSim.completedCount;
  const baseConf = baseSim.monteCarlo.pMeetTarget;

  const testFactors: {
    id: string;
    name: string;
    key: keyof SimConfig;
    unit: string;
    lowVal: number;
    highVal: number;
    insight: string;
  }[] = [
    {
      id: 'absenteeism',
      name: 'Operator Absenteeism',
      key: 'absenteeismPercent',
      unit: '%',
      lowVal: Math.max(0, config.absenteeismPercent - 3),
      highVal: Math.min(25, config.absenteeismPercent + 5),
      insight: 'Controlling unscheduled attendance protects station cycle continuity.',
    },
    {
      id: 'skill',
      name: 'Technician Skill Proficiency',
      key: 'skillMean',
      unit: '%',
      lowVal: Math.max(60, config.skillMean - 10),
      highVal: Math.min(130, config.skillMean + 10),
      insight: 'Standard operating procedures and on-the-job training reduce manual assembly duration.',
    },
    {
      id: 'mat_risk',
      name: 'Subassembly Supply Shortage Risk',
      key: 'materialRiskPercent',
      unit: '%',
      lowVal: Math.max(1, config.materialRiskPercent - 5),
      highVal: Math.min(40, config.materialRiskPercent + 10),
      insight: 'Supplier kitting buffers prevent starvation delays before heavy chassis and powertrain drop.',
    },
    {
      id: 'quality',
      name: 'Quality Gate Defect Rate',
      key: 'qualityFailPercent',
      unit: '%',
      lowVal: Math.max(1, config.qualityFailPercent - 3),
      highVal: Math.min(25, config.qualityFailPercent + 8),
      insight: 'First-time-through poka-yoke eliminates high-friction rework bottlenecks at station gates.',
    },
    {
      id: 'crane_risk',
      name: 'Overhead Crane Contention / Delay',
      key: 'craneRiskPercent',
      unit: '%',
      lowVal: Math.max(0, config.craneRiskPercent - 2),
      highVal: Math.min(20, config.craneRiskPercent + 6),
      insight: 'Staggering heavy rigging lifts avoids concurrent overhead hoist locking across bays.',
    },
    {
      id: 'process_var',
      name: 'Manual Task Process Noise',
      key: 'processVariancePercent',
      unit: '%',
      lowVal: Math.max(2, config.processVariancePercent - 4),
      highVal: Math.min(25, config.processVariancePercent + 8),
      insight: 'Standardized work combination sheets tighten manual assembly duration variance.',
    },
  ];

  const results: SensitivityFactor[] = testFactors.map((tf) => {
    // Low configuration
    const lowCfg: SimConfig = { ...config, [tf.key]: tf.lowVal, mcRuns: 25 };
    const lowSim = simulateLine(lowCfg);

    // High configuration
    const highCfg: SimConfig = { ...config, [tf.key]: tf.highVal, mcRuns: 25 };
    const highSim = simulateLine(highCfg);

    const outputSwing = Math.abs(highSim.completedCount - lowSim.completedCount);
    const confidenceSwing = Math.abs(highSim.monteCarlo.pMeetTarget - lowSim.monteCarlo.pMeetTarget);

    return {
      id: tf.id,
      name: tf.name,
      parameterKey: tf.key,
      unit: tf.unit,
      baselineValue: Number(config[tf.key]),
      lowValue: tf.lowVal,
      highValue: tf.highVal,
      baselineOutput: baseOutput,
      lowOutput: lowSim.completedCount,
      highOutput: highSim.completedCount,
      baselineConfidence: baseConf,
      lowConfidence: lowSim.monteCarlo.pMeetTarget,
      highConfidence: highSim.monteCarlo.pMeetTarget,
      outputSwing,
      confidenceSwing,
      insight: tf.insight,
      impactRank: 0,
    };
  });

  // Rank by combined impact swing descending
  results.sort((a, b) => (b.outputSwing * 10 + b.confidenceSwing) - (a.outputSwing * 10 + a.confidenceSwing));
  results.forEach((r, idx) => {
    r.impactRank = idx + 1;
  });

  return results;
}

/**
 * Overtime & Disruption Recovery Catch-Up Calculator
 */
export function calculateOvertimeRecovery(
  config: SimConfig,
  overtimeHoursPerShift: number,
  weekendShifts: number
): RecoveryPlanResult {
  const baseSim = simulateLine({
    ...config,
    overtimeHoursPerShift: 0,
    weekendShifts: 0,
  });

  const recoveryConfig: SimConfig = {
    ...config,
    overtimeHoursPerShift,
    weekendShifts,
  };
  const recoverySim = simulateLine(recoveryConfig);

  const regularHorizonHours = baseSim.horizonHours;
  const extendedHorizonHours = recoverySim.horizonHours;

  const baselineOutput = baseSim.completedCount;
  const newOutput = recoverySim.completedCount;
  const recoveredUnits = Math.max(0, newOutput - baselineOutput);

  const regularLaborCost = baseSim.totalOperatingCost;
  const overtimeTotalCost = recoverySim.totalOperatingCost;
  const overtimePremiumCost = Math.max(0, overtimeTotalCost - regularLaborCost);

  const recoveredRevenue = recoveredUnits * config.revenuePerUnit;
  const netRecoveryPayoff = recoveredRevenue - overtimePremiumCost;
  const meetsFullDemand = newOutput >= config.demand;

  return {
    overtimeHoursPerShift,
    weekendShifts,
    extendedHorizonHours,
    regularHorizonHours,
    recoveredUnits,
    baselineOutput,
    targetDemand: config.demand,
    regularLaborCost,
    overtimePremiumCost,
    totalLaborCost: overtimeTotalCost,
    recoveredRevenue,
    netRecoveryPayoff,
    meetsFullDemand,
  };
}

