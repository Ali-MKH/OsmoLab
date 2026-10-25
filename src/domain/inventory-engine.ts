import {
  BatchWeighingLine,
  FormulaLineItem,
  InventoryLot,
} from './types';
import { roundDecimal, scaleFormulaToBatch } from './formula-engine';

export type AvailabilityBadge = '✓ Available' | '⚠ Low stock' | '✕ Not available';

export interface LineInventoryStatus {
  lineId: string;
  materialId?: number;
  ingredientName: string;
  requiredGrams: number;
  availableGrams: number;
  shortageGrams: number;
  badge: AvailabilityBadge;
  matchedLotNumber: string;
  matchedLotId: number | null;
  retestWarning: boolean;
}

export interface BatchInventoryCheckResult {
  requestedBatchGrams: number;
  canProduceBatch: boolean;
  shortages: LineInventoryStatus[];
  lineStatuses: LineInventoryStatus[];
}

/**
 * Checks whether sufficient inventory exists for a formula at a requested batch weight (e.g. 500 g).
 */
export function checkBatchInventoryAvailability(
  items: FormulaLineItem[],
  lots: InventoryLot[],
  requestedBatchGrams: number,
  referenceDateIso: string = '2026-10-23'
): BatchInventoryCheckResult {
  const scaledItems = scaleFormulaToBatch(items, requestedBatchGrams);
  const lineStatuses: LineInventoryStatus[] = [];

  for (const item of scaledItems) {
    const required = roundDecimal(item.quantityGrams, 3);

    if (item.type === 'accord' || !item.materialId) {
      lineStatuses.push({
        lineId: item.id,
        materialId: item.materialId,
        ingredientName: item.name,
        requiredGrams: required,
        availableGrams: required,
        shortageGrams: 0,
        badge: '✓ Available',
        matchedLotNumber: item.lotNumber || 'ACCORD-PREMIX',
        matchedLotId: null,
        retestWarning: false,
      });
      continue;
    }

    // Match lots for this material and concentration (or any lot of this material if exact concentration not found)
    const matchingLots = lots.filter(
      (l) =>
        l.materialId === item.materialId &&
        Math.abs(l.concentrationPercent - item.dilutionPercent) < 0.5
    );
    const candidateLots =
      matchingLots.length > 0
        ? matchingLots
        : lots.filter((l) => l.materialId === item.materialId);

    const totalAvailable = roundDecimal(
      candidateLots.reduce(
        (sum, l) =>
          sum + Math.max(0, l.quantityRemainingGrams - l.reservedQuantityGrams),
        0
      ),
      3
    );

    const primaryLot = candidateLots[0] || null;
    const lowThreshold = primaryLot ? primaryLot.lowStockThresholdGrams : 10;
    const shortage =
      required > totalAvailable ? roundDecimal(required - totalAvailable, 3) : 0;

    let badge: AvailabilityBadge = '✓ Available';
    if (totalAvailable <= 0 || shortage > 0) {
      badge = '✕ Not available';
    } else if (totalAvailable - required <= lowThreshold) {
      badge = '⚠ Low stock';
    }

    const retestWarning = primaryLot?.retestDate
      ? primaryLot.retestDate <= referenceDateIso
      : false;

    lineStatuses.push({
      lineId: item.id,
      materialId: item.materialId,
      ingredientName: item.name,
      requiredGrams: required,
      availableGrams: totalAvailable,
      shortageGrams: shortage,
      badge,
      matchedLotNumber: primaryLot ? primaryLot.lotNumber : 'NONE',
      matchedLotId: primaryLot ? primaryLot.id : null,
      retestWarning,
    });
  }

  const shortages = lineStatuses.filter((s) => s.shortageGrams > 0);
  return {
    requestedBatchGrams,
    canProduceBatch: shortages.length === 0,
    shortages,
    lineStatuses,
  };
}

/**
 * Calculates exact weighing deviation (Actual - Target) in grams.
 */
export function calculateWeighingDeviation(
  targetGrams: number,
  actualGrams: number | null
): { deviationGrams: number; formattedDeviation: string } {
  if (actualGrams === null || Number.isNaN(actualGrams)) {
    return { deviationGrams: 0, formattedDeviation: '0.000 g' };
  }
  const diff = roundDecimal(actualGrams - targetGrams, 3);
  const sign = diff > 0 ? '+' : '';
  return {
    deviationGrams: diff,
    formattedDeviation: `${sign}${diff.toFixed(3)} g`,
  };
}

/**
 * Builds initial weighing worksheet lines for a physical production batch.
 */
export function createBatchWeighingLines(
  items: FormulaLineItem[],
  lots: InventoryLot[],
  targetBatchGrams: number
): BatchWeighingLine[] {
  const scaled = scaleFormulaToBatch(items, targetBatchGrams);
  return scaled.map((item) => {
    const lot =
      lots.find(
        (l) =>
          l.materialId === item.materialId &&
          Math.abs(l.concentrationPercent - item.dilutionPercent) < 0.5
      ) ||
      lots.find((l) => l.materialId === item.materialId) ||
      null;

    return {
      lineId: item.id,
      materialId: item.materialId || 0,
      ingredientName: item.name,
      concentrationPercent: item.dilutionPercent,
      solvent: item.solvent,
      lotId: lot ? lot.id : null,
      lotNumber: lot ? lot.lotNumber : item.lotNumber || 'UNASSIGNED',
      targetWeightGrams: roundDecimal(item.quantityGrams, 3),
      actualWeightGrams: null,
      deviationGrams: 0,
      isWeighed: false,
    };
  });
}
