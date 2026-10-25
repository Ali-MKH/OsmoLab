import { FormulaLineItem, InventoryLot, RawMaterial } from './types';
import { calculateFormulaMetrics, roundDecimal } from './formula-engine';

export type CurrencyCode = 'USD' | 'IRR' | 'EUR' | 'GBP' | 'AED' | 'CHF';

export type ExchangeRateMode = 'live' | 'manual';

export type LotCostStrategy = 'line-assigned' | 'cheapest-lot' | 'latest-lot';

export interface CurrencyDefinition {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
}

export const SUPPORTED_CURRENCIES: CurrencyDefinition[] = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimals: 2,
    description: 'International raw material benchmark currency (USD)',
  },
  {
    code: 'IRR',
    name: 'Iranian Rial (IRR)',
    symbol: 'IRR',
    decimals: 0,
    description: 'Iranian Rial with live & custom USD→IRR exchange rate and Toman equivalent',
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimals: 2,
    description: 'European perfumery supply chain standard (Grasse / EU)',
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimals: 2,
    description: 'UK formulation & specialty aromatic suppliers',
  },
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'AED',
    decimals: 2,
    description: 'Middle East fine fragrance & oud trade currency',
  },
  {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimals: 2,
    description: 'Geneva aroma-chemical principals (Givaudan / dsm-firmenich)',
  },
];

export interface CurrencySettings {
  activeCurrency: CurrencyCode;
  rateMode: ExchangeRateMode;
  usdToIrrRate: number;
  ratesFromUsd: Record<CurrencyCode, number>;
  lastUpdatedIso: string;
  rateSource: string;
  showTomanHelper: boolean;
}

export const DEFAULT_RATES_FROM_USD: Record<CurrencyCode, number> = {
  USD: 1,
  IRR: 820000, // Realistic open-market default; user can override or fetch live
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.6725,
  CHF: 0.88,
};

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  activeCurrency: 'USD',
  rateMode: 'live',
  usdToIrrRate: 820000,
  ratesFromUsd: { ...DEFAULT_RATES_FROM_USD },
  lastUpdatedIso: '2026-10-24T07:00:00.000Z',
  rateSource: 'Global FX & Market Reference Feed',
  showTomanHelper: true,
};

/**
 * Resolves the effective exchange rate (1 USD -> target currency) from settings.
 */
export function getExchangeRateForCurrency(
  settings: CurrencySettings,
  targetCurrency: CurrencyCode = settings.activeCurrency
): number {
  if (targetCurrency === 'USD') return 1;
  if (targetCurrency === 'IRR') {
    const customIrr = Number(settings.usdToIrrRate);
    if (Number.isFinite(customIrr) && customIrr > 0) {
      return customIrr;
    }
    return settings.ratesFromUsd.IRR || DEFAULT_RATES_FROM_USD.IRR;
  }
  const rate = settings.ratesFromUsd[targetCurrency];
  return Number.isFinite(rate) && rate > 0
    ? rate
    : DEFAULT_RATES_FROM_USD[targetCurrency] || 1;
}

/**
 * Converts a USD amount into the target currency.
 */
export function convertFromUsd(
  amountUsd: number,
  settings: CurrencySettings,
  targetCurrency: CurrencyCode = settings.activeCurrency
): number {
  const safeUsd = Number.isFinite(amountUsd) ? amountUsd : 0;
  const rate = getExchangeRateForCurrency(settings, targetCurrency);
  const raw = safeUsd * rate;
  if (targetCurrency === 'IRR') {
    return Math.round(raw);
  }
  return roundDecimal(raw, 4);
}

/**
 * Formats a USD amount in the active or specified currency with proper thousands separators.
 */
export function formatCurrencyAmount(
  amountUsd: number,
  settings: CurrencySettings,
  options?: {
    currency?: CurrencyCode;
    unitDecimals?: boolean;
    compactIrr?: boolean;
    includeTomanHint?: boolean;
  }
): string {
  const code = options?.currency || settings.activeCurrency;
  const converted = convertFromUsd(amountUsd, settings, code);

  if (code === 'IRR') {
    const roundedIrr = Math.round(converted);
    const formattedIrr = roundedIrr.toLocaleString('en-US');
    if (options?.includeTomanHint && settings.showTomanHelper) {
      const toman = Math.round(roundedIrr / 10);
      return `${formattedIrr} IRR (${toman.toLocaleString('en-US')} Toman)`;
    }
    return `${formattedIrr} IRR`;
  }

  const def =
    SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0];
  const decimals = options?.unitDecimals ? 3 : def.decimals;
  const formattedNumber = converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (def.symbol === '$' || def.symbol === '€' || def.symbol === '£') {
    return `${def.symbol}${formattedNumber}`;
  }
  return `${formattedNumber} ${def.symbol}`;
}

export interface IngredientCostBreakdownLine {
  lineId: string;
  materialId?: number;
  accordId?: number;
  name: string;
  type: 'material' | 'accord';
  normalizedPercentage: number;
  batchWeightGrams: number;
  activeWeightGrams: number;
  dilutionPercent: number;
  solvent: string;
  selectedLotId: number | null;
  selectedLotNumber: string;
  supplier: string;
  availableLots: InventoryLot[];
  lotQuantityRemainingGrams: number | null;
  hasStockShortage: boolean;
  shortageGrams: number;
  unitCostPerGramUsd: number;
  unitCostPerKgUsd: number;
  lineTotalCostUsd: number;
  costSharePercent: number;
  costSource: 'inventory-lot' | 'line-default';
}

export interface RealTimeBatchCostSummary {
  targetBatchGrams: number;
  totalFormulaWeightGrams: number;
  lines: IngredientCostBreakdownLine[];
  totalBatchCostUsd: number;
  costPerGramUsd: number;
  costPer100gUsd: number;
  costPerKgUsd: number;
  activeAromaticMassGrams: number;
  costPerActiveGramUsd: number;
  finalProductConcentrationPercent: number;
  carrierCostPerGramUsd: number;
  bottleSizeMl: number;
  bottleLiquidGrams: number;
  concentrateGramsPerBottle: number;
  carrierGramsPerBottle: number;
  concentrateCostPerBottleUsd: number;
  carrierCostPerBottleUsd: number;
  totalLiquidCostPerBottleUsd: number;
  estimatedBottlesFromBatch: number;
  topCostDrivers: IngredientCostBreakdownLine[];
  shortageCount: number;
}

/**
 * Resolves the best matching InventoryLot and unit cost per gram for a formula line item.
 */
export function resolveIngredientLotAndCost(
  item: FormulaLineItem,
  inventoryLots: InventoryLot[],
  strategy: LotCostStrategy = 'line-assigned'
): {
  matchedLot: InventoryLot | null;
  availableLots: InventoryLot[];
  unitCostPerGramUsd: number;
  costSource: 'inventory-lot' | 'line-default';
} {
  if (item.type === 'accord' || !item.materialId) {
    return {
      matchedLot: null,
      availableLots: [],
      unitCostPerGramUsd: Math.max(0, item.costPerGram || 0.45),
      costSource: 'line-default',
    };
  }

  const materialLots = inventoryLots.filter((l) => l.materialId === item.materialId);
  if (materialLots.length === 0) {
    return {
      matchedLot: null,
      availableLots: [],
      unitCostPerGramUsd: Math.max(0, item.costPerGram || 0.45),
      costSource: 'line-default',
    };
  }

  let chosenLot: InventoryLot | null = null;

  if (strategy === 'line-assigned' && item.lotNumber) {
    chosenLot =
      materialLots.find(
        (l) => l.lotNumber.toLowerCase() === item.lotNumber.toLowerCase()
      ) || null;
  }

  if (!chosenLot && strategy === 'cheapest-lot') {
    const inStock = materialLots.filter(
      (l) => l.quantityRemainingGrams - l.reservedQuantityGrams > 0
    );
    const pool = inStock.length > 0 ? inStock : materialLots;
    chosenLot = [...pool].sort((a, b) => a.costPerGram - b.costPerGram)[0] || null;
  }

  if (!chosenLot && strategy === 'latest-lot') {
    chosenLot =
      [...materialLots].sort((a, b) =>
        (b.purchaseDate || '').localeCompare(a.purchaseDate || '')
      )[0] || null;
  }

  if (!chosenLot) {
    // Fallback to matching concentration or first lot
    chosenLot =
      materialLots.find(
        (l) => Math.abs(l.concentrationPercent - item.dilutionPercent) < 0.5
      ) || materialLots[0];
  }

  const derivedLotCost =
    chosenLot.costPerGram > 0
      ? chosenLot.costPerGram
      : chosenLot.containerSizeGrams > 0
      ? roundDecimal(chosenLot.priceTotal / chosenLot.containerSizeGrams, 4)
      : item.costPerGram;

  return {
    matchedLot: chosenLot,
    availableLots: materialLots,
    unitCostPerGramUsd: Math.max(0, derivedLotCost),
    costSource: 'inventory-lot',
  };
}

/**
 * Calculates real-time batch cost, per-ingredient lot valuation, and finished bottle economics.
 */
export function calculateRealTimeBatchCost(params: {
  items: FormulaLineItem[];
  inventoryLots: InventoryLot[];
  materials?: RawMaterial[];
  targetBatchGrams: number;
  finalProductConcentrationPercent?: number;
  carrierCostPerGramUsd?: number;
  bottleSizeMl?: number;
  strategy?: LotCostStrategy;
}): RealTimeBatchCostSummary {
  const {
    items,
    inventoryLots,
    targetBatchGrams,
    finalProductConcentrationPercent = 20,
    carrierCostPerGramUsd = 0.015,
    bottleSizeMl = 50,
    strategy = 'line-assigned',
  } = params;

  const safeBatchGrams = Math.max(0, Number(targetBatchGrams) || 0);
  const metrics = calculateFormulaMetrics(items);

  const rawLines = metrics.items.map((item) => {
    const { matchedLot, availableLots, unitCostPerGramUsd, costSource } =
      resolveIngredientLotAndCost(item, inventoryLots, strategy);

    const batchWeightGrams = roundDecimal(
      (item.normalizedPercentage / 100) * safeBatchGrams,
      3
    );
    const activeWeightGrams = roundDecimal(
      batchWeightGrams * (Math.min(100, Math.max(0, item.dilutionPercent)) / 100),
      4
    );
    const lineTotalCostUsd = roundDecimal(
      batchWeightGrams * unitCostPerGramUsd,
      4
    );

    const lotRemaining = matchedLot
      ? roundDecimal(
          Math.max(
            0,
            matchedLot.quantityRemainingGrams - matchedLot.reservedQuantityGrams
          ),
          3
        )
      : null;

    const shortageGrams =
      lotRemaining !== null && batchWeightGrams > lotRemaining
        ? roundDecimal(batchWeightGrams - lotRemaining, 3)
        : 0;

    return {
      lineId: item.id,
      materialId: item.materialId,
      accordId: item.accordId,
      name: item.name,
      type: item.type,
      normalizedPercentage: item.normalizedPercentage,
      batchWeightGrams,
      activeWeightGrams,
      dilutionPercent: item.dilutionPercent,
      solvent: matchedLot ? matchedLot.solvent : item.solvent,
      selectedLotId: matchedLot ? matchedLot.id : null,
      selectedLotNumber: matchedLot
        ? matchedLot.lotNumber
        : item.lotNumber || 'UNASSIGNED',
      supplier: matchedLot ? matchedLot.supplier : item.supplier || 'Standard',
      availableLots,
      lotQuantityRemainingGrams: lotRemaining,
      hasStockShortage: shortageGrams > 0,
      shortageGrams,
      unitCostPerGramUsd,
      unitCostPerKgUsd: roundDecimal(unitCostPerGramUsd * 1000, 2),
      lineTotalCostUsd,
      costSharePercent: 0,
      costSource,
    };
  });

  const totalBatchCostUsd = roundDecimal(
    rawLines.reduce((sum, l) => sum + l.lineTotalCostUsd, 0),
    4
  );

  const lines: IngredientCostBreakdownLine[] = rawLines.map((l) => ({
    ...l,
    costSharePercent:
      totalBatchCostUsd > 0
        ? roundDecimal((l.lineTotalCostUsd / totalBatchCostUsd) * 100, 2)
        : 0,
  }));

  const costPerGramUsd =
    safeBatchGrams > 0 ? roundDecimal(totalBatchCostUsd / safeBatchGrams, 4) : 0;
  const costPer100gUsd = roundDecimal(costPerGramUsd * 100, 2);
  const costPerKgUsd = roundDecimal(costPerGramUsd * 1000, 2);

  const activeAromaticMassGrams = roundDecimal(
    lines.reduce((sum, l) => sum + l.activeWeightGrams, 0),
    3
  );
  const costPerActiveGramUsd =
    activeAromaticMassGrams > 0
      ? roundDecimal(totalBatchCostUsd / activeAromaticMassGrams, 4)
      : 0;

  // Finished bottle economics (e.g. 50ml EDP at 20% concentration, specific gravity ~0.88 g/ml)
  const safeConc = Math.min(100, Math.max(1, finalProductConcentrationPercent));
  const safeBottleMl = Math.max(1, bottleSizeMl);
  const bottleLiquidGrams = roundDecimal(safeBottleMl * 0.88, 2);
  const concentrateGramsPerBottle = roundDecimal(
    bottleLiquidGrams * (safeConc / 100),
    3
  );
  const carrierGramsPerBottle = roundDecimal(
    bottleLiquidGrams - concentrateGramsPerBottle,
    3
  );
  const concentrateCostPerBottleUsd = roundDecimal(
    concentrateGramsPerBottle * costPerGramUsd,
    4
  );
  const carrierCostPerBottleUsd = roundDecimal(
    carrierGramsPerBottle * Math.max(0, carrierCostPerGramUsd),
    4
  );
  const totalLiquidCostPerBottleUsd = roundDecimal(
    concentrateCostPerBottleUsd + carrierCostPerBottleUsd,
    4
  );
  const estimatedBottlesFromBatch =
    concentrateGramsPerBottle > 0
      ? roundDecimal(safeBatchGrams / concentrateGramsPerBottle, 1)
      : 0;

  const topCostDrivers = [...lines].sort(
    (a, b) =>
      b.lineTotalCostUsd - a.lineTotalCostUsd ||
      b.batchWeightGrams - a.batchWeightGrams
  );

  const shortageCount = lines.filter((l) => l.hasStockShortage).length;

  return {
    targetBatchGrams: safeBatchGrams,
    totalFormulaWeightGrams: metrics.totalWeightGrams,
    lines,
    totalBatchCostUsd,
    costPerGramUsd,
    costPer100gUsd,
    costPerKgUsd,
    activeAromaticMassGrams,
    costPerActiveGramUsd,
    finalProductConcentrationPercent: safeConc,
    carrierCostPerGramUsd,
    bottleSizeMl: safeBottleMl,
    bottleLiquidGrams,
    concentrateGramsPerBottle,
    carrierGramsPerBottle,
    concentrateCostPerBottleUsd,
    carrierCostPerBottleUsd,
    totalLiquidCostPerBottleUsd,
    estimatedBottlesFromBatch,
    topCostDrivers,
    shortageCount,
  };
}

export interface TopMaterialCostSlice {
  rank: number;
  lineId: string;
  materialId?: number;
  name: string;
  type: 'material' | 'accord';
  selectedLotNumber: string;
  dilutionPercent: number;
  solvent: string;
  batchWeightGrams: number;
  unitCostPerGramUsd: number;
  lineTotalCostUsd: number;
  costSharePercent: number;
  relativeToMaxPercent: number;
}

export interface TopMaterialsCostDistribution {
  topItems: TopMaterialCostSlice[];
  topItemsTotalCostUsd: number;
  topItemsTotalSharePercent: number;
  remainingCount: number;
  remainingCostUsd: number;
  remainingSharePercent: number;
  totalBatchCostUsd: number;
  totalIngredientsCount: number;
}

/**
 * Extracts and ranks the top N (default 5) most expensive raw materials in the formula
 * along with relative bar widths, share of total batch cost, and the aggregated remainder.
 */
export function buildTopMaterialsCostDistribution(
  summary: RealTimeBatchCostSummary,
  topN = 5
): TopMaterialsCostDistribution {
  const safeLimit = Math.max(1, Math.floor(topN));
  const sorted = [...summary.lines].sort(
    (a, b) =>
      b.lineTotalCostUsd - a.lineTotalCostUsd ||
      b.batchWeightGrams - a.batchWeightGrams
  );

  const sliced = sorted.slice(0, safeLimit);
  const remaining = sorted.slice(safeLimit);
  const maxItemCost = sliced[0]?.lineTotalCostUsd ?? 0;
  const totalCost = summary.totalBatchCostUsd;

  const topItems: TopMaterialCostSlice[] = sliced.map((item, idx) => {
    const share =
      totalCost > 0
        ? roundDecimal((item.lineTotalCostUsd / totalCost) * 100, 2)
        : 0;
    const relativeToMax =
      maxItemCost > 0
        ? roundDecimal((item.lineTotalCostUsd / maxItemCost) * 100, 2)
        : 0;

    return {
      rank: idx + 1,
      lineId: item.lineId,
      materialId: item.materialId,
      name: item.name,
      type: item.type,
      selectedLotNumber: item.selectedLotNumber,
      dilutionPercent: item.dilutionPercent,
      solvent: item.solvent,
      batchWeightGrams: item.batchWeightGrams,
      unitCostPerGramUsd: item.unitCostPerGramUsd,
      lineTotalCostUsd: item.lineTotalCostUsd,
      costSharePercent: share,
      relativeToMaxPercent: relativeToMax,
    };
  });

  const topItemsTotalCostUsd = roundDecimal(
    topItems.reduce((sum, item) => sum + item.lineTotalCostUsd, 0),
    4
  );
  const remainingCostUsd = roundDecimal(
    Math.max(0, totalCost - topItemsTotalCostUsd),
    4
  );

  const topItemsTotalSharePercent =
    totalCost > 0
      ? roundDecimal((topItemsTotalCostUsd / totalCost) * 100, 2)
      : 0;
  const remainingSharePercent =
    remaining.length > 0 && totalCost > 0
      ? roundDecimal(Math.max(0, 100 - topItemsTotalSharePercent), 2)
      : 0;

  return {
    topItems,
    topItemsTotalCostUsd,
    topItemsTotalSharePercent,
    remainingCount: remaining.length,
    remainingCostUsd,
    remainingSharePercent,
    totalBatchCostUsd: totalCost,
    totalIngredientsCount: sorted.length,
  };
}

