import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CURRENCY_SETTINGS,
  buildTopMaterialsCostDistribution,
  calculateRealTimeBatchCost,
  convertFromUsd,
  formatCurrencyAmount,
  getExchangeRateForCurrency,
  resolveIngredientLotAndCost,
  CurrencySettings,
} from './currency-and-cost';
import { FormulaLineItem, InventoryLot } from './types';

const SAMPLE_LOTS: InventoryLot[] = [
  {
    id: 1,
    materialId: 101,
    supplier: 'Capua 1880',
    lotNumber: 'LOT-BER-A',
    concentrationPercent: 100,
    solvent: 'Neat',
    containerSizeGrams: 100,
    quantityRemainingGrams: 80,
    reservedQuantityGrams: 0,
    lowStockThresholdGrams: 10,
    purchaseDate: '2026-05-01',
    openedDate: '2026-05-10',
    retestDate: '2027-05-01',
    priceTotal: 42,
    costPerGram: 0.42,
    storageLocation: 'Fridge A',
    supplierReference: 'BER-1',
    notes: '',
  },
  {
    id: 2,
    materialId: 101,
    supplier: 'Pell Wall',
    lotNumber: 'LOT-BER-CHEAP',
    concentrationPercent: 100,
    solvent: 'Neat',
    containerSizeGrams: 250,
    quantityRemainingGrams: 200,
    reservedQuantityGrams: 0,
    lowStockThresholdGrams: 20,
    purchaseDate: '2026-09-15',
    openedDate: '2026-09-20',
    retestDate: '2027-09-15',
    priceTotal: 75,
    costPerGram: 0.30,
    storageLocation: 'Fridge A',
    supplierReference: 'BER-2',
    notes: '',
  },
  {
    id: 3,
    materialId: 102,
    supplier: 'Robertet',
    lotNumber: 'LOT-OAK-10',
    concentrationPercent: 10,
    solvent: 'Ethanol',
    containerSizeGrams: 50,
    quantityRemainingGrams: 12,
    reservedQuantityGrams: 2,
    lowStockThresholdGrams: 5,
    purchaseDate: '2026-04-01',
    openedDate: '2026-04-05',
    retestDate: '2028-04-01',
    priceTotal: 60,
    costPerGram: 1.20,
    storageLocation: 'Shelf B',
    supplierReference: 'OAK-1',
    notes: '',
  },
];

const SAMPLE_ITEMS: FormulaLineItem[] = [
  {
    id: 'line-1',
    type: 'material',
    materialId: 101,
    name: 'Bergamot FCF',
    quantityGrams: 80,
    percentage: 80,
    dilutionPercent: 100,
    solvent: 'Neat',
    activeMaterialPercent: 80,
    supplier: 'Capua 1880',
    lotNumber: 'LOT-BER-A',
    costPerGram: 0.42,
    notes: '',
  },
  {
    id: 'line-2',
    type: 'material',
    materialId: 102,
    name: 'Oakmoss Absolute 10%',
    quantityGrams: 20,
    percentage: 20,
    dilutionPercent: 10,
    solvent: 'Ethanol',
    activeMaterialPercent: 2,
    supplier: 'Robertet',
    lotNumber: 'LOT-OAK-10',
    costPerGram: 1.20,
    notes: '',
  },
];

test('resolveIngredientLotAndCost honors line-assigned vs cheapest-lot strategies', () => {
  const assigned = resolveIngredientLotAndCost(
    SAMPLE_ITEMS[0],
    SAMPLE_LOTS,
    'line-assigned'
  );
  assert.equal(assigned.matchedLot?.lotNumber, 'LOT-BER-A');
  assert.equal(assigned.unitCostPerGramUsd, 0.42);

  const cheapest = resolveIngredientLotAndCost(
    SAMPLE_ITEMS[0],
    SAMPLE_LOTS,
    'cheapest-lot'
  );
  assert.equal(cheapest.matchedLot?.lotNumber, 'LOT-BER-CHEAP');
  assert.equal(cheapest.unitCostPerGramUsd, 0.30);
});

test('calculateRealTimeBatchCost computes accurate batch cost, cost shares, and shortage detection', () => {
  // 100g batch: 80g Bergamot @ $0.42 ($33.60) + 20g Oakmoss @ $1.20 ($24.00) = $57.60
  const summary100 = calculateRealTimeBatchCost({
    items: SAMPLE_ITEMS,
    inventoryLots: SAMPLE_LOTS,
    targetBatchGrams: 100,
    finalProductConcentrationPercent: 20,
    carrierCostPerGramUsd: 0.015,
    bottleSizeMl: 50,
    strategy: 'line-assigned',
  });

  assert.equal(summary100.totalBatchCostUsd, 57.6);
  assert.equal(summary100.costPerGramUsd, 0.576);
  assert.equal(summary100.costPer100gUsd, 57.6);
  assert.equal(summary100.costPerKgUsd, 576);
  // Oakmoss only has 10g available (12 remaining - 2 reserved), so 20g triggers a 10g shortage
  assert.equal(summary100.shortageCount, 1);
  const oakLine = summary100.lines.find((l) => l.materialId === 102)!;
  assert.equal(oakLine.hasStockShortage, true);
  assert.equal(oakLine.shortageGrams, 10);

  // Cheapest lot strategy lowers Bergamot to $0.30/g -> 80*0.30 ($24) + 20*1.20 ($24) = $48.00
  const summaryCheapest = calculateRealTimeBatchCost({
    items: SAMPLE_ITEMS,
    inventoryLots: SAMPLE_LOTS,
    targetBatchGrams: 100,
    strategy: 'cheapest-lot',
  });
  assert.equal(summaryCheapest.totalBatchCostUsd, 48.0);
  assert.equal(summaryCheapest.lines[0].costSharePercent, 50);
  assert.equal(summaryCheapest.lines[1].costSharePercent, 50);
});

test('currency conversion and IRR / Toman formatting work deterministically', () => {
  const irrSettings: CurrencySettings = {
    ...DEFAULT_CURRENCY_SETTINGS,
    activeCurrency: 'IRR',
    rateMode: 'manual',
    usdToIrrRate: 850000,
    showTomanHelper: true,
  };

  assert.equal(getExchangeRateForCurrency(irrSettings, 'IRR'), 850000);
  assert.equal(convertFromUsd(10, irrSettings, 'IRR'), 8500000);

  const formattedPlain = formatCurrencyAmount(10, irrSettings);
  assert.equal(formattedPlain, '8,500,000 IRR');

  const formattedWithToman = formatCurrencyAmount(10, irrSettings, {
    includeTomanHint: true,
  });
  assert.equal(formattedWithToman, '8,500,000 IRR (850,000 Toman)');
});

test('buildTopMaterialsCostDistribution ranks Top 5 materials and aggregates remaining items', () => {
  const sevenItems: FormulaLineItem[] = [
    { id: '1', type: 'material', name: 'Oud Assafi', quantityGrams: 5, percentage: 5, dilutionPercent: 100, solvent: 'Neat', activeMaterialPercent: 5, supplier: 'Firmenich', lotNumber: 'LOT-OUD', costPerGram: 10, notes: '' }, // $50
    { id: '2', type: 'material', name: 'Orris Butter', quantityGrams: 10, percentage: 10, dilutionPercent: 100, solvent: 'Neat', activeMaterialPercent: 10, supplier: 'Robertet', lotNumber: 'LOT-ORR', costPerGram: 3, notes: '' }, // $30
    { id: '3', type: 'material', name: 'Rose Otto', quantityGrams: 5, percentage: 5, dilutionPercent: 100, solvent: 'Neat', activeMaterialPercent: 5, supplier: 'Enio Bonchev', lotNumber: 'LOT-ROS', costPerGram: 4, notes: '' }, // $20
    { id: '4', type: 'material', name: 'Sandalwood Album', quantityGrams: 10, percentage: 10, dilutionPercent: 100, solvent: 'Neat', activeMaterialPercent: 10, supplier: 'IFF', lotNumber: 'LOT-SAN', costPerGram: 1.5, notes: '' }, // $15
    { id: '5', type: 'material', name: 'Ambroxan', quantityGrams: 20, percentage: 20, dilutionPercent: 100, solvent: 'Neat', activeMaterialPercent: 20, supplier: 'Kao', lotNumber: 'LOT-AMB', costPerGram: 0.5, notes: '' }, // $10
    { id: '6', type: 'material', name: 'Iso E Super', quantityGrams: 30, percentage: 30, dilutionPercent: 100, solvent: 'Neat', activeMaterialPercent: 30, supplier: 'IFF', lotNumber: 'LOT-ISO', costPerGram: 0.2, notes: '' }, // $6
    { id: '7', type: 'material', name: 'Bergamot FCF', quantityGrams: 20, percentage: 20, dilutionPercent: 100, solvent: 'Neat', activeMaterialPercent: 20, supplier: 'Capua', lotNumber: 'LOT-BER', costPerGram: 0.2, notes: '' }, // $4
  ];

  // Total weight = 100g, Total cost = 50 + 30 + 20 + 15 + 10 + 6 + 4 = $135.00
  // Top 5 cost = 50 + 30 + 20 + 15 + 10 = $125.00, Remaining 2 cost = $10.00
  const summary = calculateRealTimeBatchCost({
    items: sevenItems,
    inventoryLots: [],
    targetBatchGrams: 100,
    strategy: 'line-assigned',
  });

  const dist = buildTopMaterialsCostDistribution(summary, 5);
  assert.equal(dist.topItems.length, 5);
  assert.equal(dist.topItems[0].rank, 1);
  assert.equal(dist.topItems[0].name, 'Oud Assafi');
  assert.equal(dist.topItems[0].lineTotalCostUsd, 50);
  assert.equal(dist.topItems[0].relativeToMaxPercent, 100);
  assert.equal(dist.topItems[1].name, 'Orris Butter');
  assert.equal(dist.topItems[1].relativeToMaxPercent, 60);
  assert.equal(dist.topItems[4].name, 'Ambroxan');
  assert.equal(dist.topItemsTotalCostUsd, 125);
  assert.equal(dist.remainingCount, 2);
  assert.equal(dist.remainingCostUsd, 10);
  assert.equal(
    Math.round(dist.topItemsTotalSharePercent + dist.remainingSharePercent),
    100
  );
});

