import React, { useState } from 'react';
import {
  AccordDefinition,
  AccordItem,
  AccordVersionSnapshot,
  Formula,
  InventoryLot,
  InventoryMovement,
  MaterialRegulatoryLimit,
  MaterialUsageReview,
  RawMaterial,
  ScentMemoryRecord,
  VolatilityTier,
} from '../domain/types';
import { OLFACTORY_WHEEL_FAMILIES } from '../domain/seed-data';
import {
  Plus,
  Search,
  FlaskConical,
  PackageCheck,
  AlertTriangle,
  BookOpen,
  Sparkles,
  Layers,
  History,
  Check,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Scale,
  Shield,
  AlertOctagon,
  HelpCircle,
  CheckCircle2,
  Database,
} from 'lucide-react';

interface MaterialsAndInventoryViewProps {
  mode: 'materials' | 'inventory' | 'accords';
  materials: RawMaterial[];
  selectedMaterialId: number;
  regulatoryLimits: MaterialRegulatoryLimit[];
  scentMemories: ScentMemoryRecord[];
  usageReviews: MaterialUsageReview[];
  inventoryLots: InventoryLot[];
  inventoryMovements: InventoryMovement[];
  accords: AccordDefinition[];
  formulas: Formula[];
  educationalPromptsEnabled: boolean;
  onSelectMaterial: (id: number) => void;
  onCreateMaterial: (
    payload: Omit<RawMaterial, 'id'> & {
      maxAllowedPercent?: number | null;
      ifraSource?: string;
    }
  ) => Promise<void>;
  onCreateInventoryLot: (payload: Omit<InventoryLot, 'id'>) => Promise<void>;
  onCreateAccord: (payload: Omit<AccordDefinition, 'id'>) => Promise<void>;
  onUpdateAccord?: (accord: AccordDefinition) => void;
  onDeleteAccord?: (accordId: number) => void;
  onInsertAccordIntoActiveFormula: (
    accord: AccordDefinition,
    dosageGrams?: number,
    targetFormulaId?: number,
    newFormulaName?: string
  ) => void;
  onInsertMaterialIntoFormula?: (
    material: RawMaterial,
    dosageGrams: number,
    dilutionPercent: number,
    targetFormulaId?: number,
    newFormulaName?: string
  ) => void;
  onSaveScentMemory: (
    payload: Omit<ScentMemoryRecord, 'id' | 'lastReviewedAt'>
  ) => Promise<void>;
  onOpenFormula: (formulaId: number, versionLabel?: string) => void;
}

export const MaterialsAndInventoryView: React.FC<MaterialsAndInventoryViewProps> = ({
  mode,
  materials,
  selectedMaterialId,
  regulatoryLimits,
  scentMemories,
  usageReviews,
  inventoryLots,
  inventoryMovements,
  accords,
  formulas,
  educationalPromptsEnabled,
  onSelectMaterial,
  onCreateMaterial,
  onCreateInventoryLot,
  onCreateAccord,
  onUpdateAccord,
  onDeleteAccord,
  onInsertAccordIntoActiveFormula,
  onInsertMaterialIntoFormula,
  onSaveScentMemory,
  onOpenFormula,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [familyFilter, setFamilyFilter] = useState('All');
  const [originFilter, setOriginFilter] = useState('All');
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showAddLotModal, setShowAddLotModal] = useState(false);
  const [showAddAccordModal, setShowAddAccordModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [materialSubTab, setMaterialSubTab] = useState<
    'profile' | 'regulatory' | 'usage' | 'memory'
  >('profile');

  // Interactive Target Formula Modal for Accords and Palette Materials
  const [targetFormulaModal, setTargetFormulaModal] = useState<{
    isOpen: boolean;
    itemType: 'accord' | 'material';
    accord?: AccordDefinition;
    material?: RawMaterial;
    dosageGrams: number;
    dilutionPercent: number;
    selectedFormulaId: number | 'new';
    newFormulaName: string;
  } | null>(null);

  const openTargetFormulaModalForAccord = (acc: AccordDefinition, defaultGrams = 10) => {
    setTargetFormulaModal({
      isOpen: true,
      itemType: 'accord',
      accord: acc,
      dosageGrams: defaultGrams,
      dilutionPercent: 100,
      selectedFormulaId: formulas[0]?.id ?? 'new',
      newFormulaName: `${acc.name} Study V1`,
    });
  };

  const openTargetFormulaModalForMaterial = (mat: RawMaterial, defaultGrams = 2) => {
    setTargetFormulaModal({
      isOpen: true,
      itemType: 'material',
      material: mat,
      dosageGrams: defaultGrams,
      dilutionPercent: mat.recommendedDilution || 100,
      selectedFormulaId: formulas[0]?.id ?? 'new',
      newFormulaName: `${mat.name} Study V1`,
    });
  };

  const renderTargetFormulaModal = () => {
    if (!targetFormulaModal || !targetFormulaModal.isOpen) return null;
    const isAccord = targetFormulaModal.itemType === 'accord';
    const itemName = isAccord
      ? targetFormulaModal.accord?.name
      : targetFormulaModal.material?.name;
    const targetFormula = formulas.find(
      (f) => f.id === targetFormulaModal.selectedFormulaId
    );

    const handleConfirm = (e: React.FormEvent) => {
      e.preventDefault();
      if (isAccord && targetFormulaModal.accord) {
        onInsertAccordIntoActiveFormula(
          targetFormulaModal.accord,
          targetFormulaModal.dosageGrams,
          typeof targetFormulaModal.selectedFormulaId === 'number'
            ? targetFormulaModal.selectedFormulaId
            : undefined,
          targetFormulaModal.selectedFormulaId === 'new'
            ? targetFormulaModal.newFormulaName
            : undefined
        );
        setToastMsg(
          `Added ${targetFormulaModal.dosageGrams}g of ${itemName} to ${
            targetFormulaModal.selectedFormulaId === 'new'
              ? targetFormulaModal.newFormulaName
              : targetFormula?.name || 'formula'
          }`
        );
      } else if (!isAccord && targetFormulaModal.material && onInsertMaterialIntoFormula) {
        onInsertMaterialIntoFormula(
          targetFormulaModal.material,
          targetFormulaModal.dosageGrams,
          targetFormulaModal.dilutionPercent,
          typeof targetFormulaModal.selectedFormulaId === 'number'
            ? targetFormulaModal.selectedFormulaId
            : undefined,
          targetFormulaModal.selectedFormulaId === 'new'
            ? targetFormulaModal.newFormulaName
            : undefined
        );
        setToastMsg(
          `Added ${targetFormulaModal.dosageGrams}g of ${itemName} to ${
            targetFormulaModal.selectedFormulaId === 'new'
              ? targetFormulaModal.newFormulaName
              : targetFormula?.name || 'formula'
          }`
        );
      }
      setTargetFormulaModal(null);
      setTimeout(() => setToastMsg(null), 3000);
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-lg rounded-xl bg-[#111621] border border-slate-700 shadow-2xl p-6 space-y-4 text-xs">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-emerald-400 block">
                Formula Insertion Target
              </span>
              <h3 className="text-base font-semibold text-white mt-0.5">
                {isAccord
                  ? `Insert "${itemName}" Accord into Formula (${targetFormulaModal.dosageGrams}g)`
                  : `Add "${itemName}" to Formula (${targetFormulaModal.dosageGrams}g)`}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select which formula will receive this {isAccord ? 'accord base' : 'raw material note'}, or start a brand new formula project.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTargetFormulaModal(null)}
              className="text-slate-400 hover:text-white p-1 rounded text-lg leading-none"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleConfirm} className="space-y-4">
            {/* Target Formula Picker */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                1. Choose Destination Formula
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {formulas.map((f) => {
                  const isSelected = targetFormulaModal.selectedFormulaId === f.id;
                  const activeVer =
                    f.versions.find((v) => v.versionLabel === f.activeVersionLabel) ||
                    f.versions[0];
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setTargetFormulaModal((prev) =>
                          prev ? { ...prev, selectedFormulaId: f.id } : null
                        )
                      }
                      className={`w-full p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                          : 'bg-[#0B0E14] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{f.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300 font-mono-tabular">
                            {f.activeVersionLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {f.projectName} · {f.intendedProduct} · {activeVer?.items.length || 0} notes
                        </div>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-500 text-black'
                            : 'border-slate-700'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </span>
                    </button>
                  );
                })}

                {/* Create New Formula Option */}
                <button
                  type="button"
                  onClick={() =>
                    setTargetFormulaModal((prev) =>
                      prev ? { ...prev, selectedFormulaId: 'new' } : null
                    )
                  }
                  className={`w-full p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between ${
                    targetFormulaModal.selectedFormulaId === 'new'
                      ? 'bg-emerald-950/30 border-emerald-500/60 text-white'
                      : 'bg-[#0B0E14] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span>+ Create Brand New Formula</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Start a fresh study centered around {itemName}
                    </div>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      targetFormulaModal.selectedFormulaId === 'new'
                        ? 'border-emerald-400 bg-emerald-500'
                        : 'border-slate-700'
                    }`}
                  >
                    {targetFormulaModal.selectedFormulaId === 'new' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-black" />
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* New Formula Name input (only when 'new' is chosen) */}
            {targetFormulaModal.selectedFormulaId === 'new' && (
              <div className="p-3 rounded-lg bg-[#0B0E14] border border-emerald-900/50 space-y-2">
                <label className="block text-slate-300 font-medium">New Formula Title</label>
                <input
                  type="text"
                  required
                  value={targetFormulaModal.newFormulaName}
                  onChange={(e) =>
                    setTargetFormulaModal((prev) =>
                      prev ? { ...prev, newFormulaName: e.target.value } : null
                    )
                  }
                  placeholder="e.g. Amber Rose Study V1"
                  className="w-full bg-[#111621] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Dosage and Dilution Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-slate-400 mb-1">Dosage (Grams)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0.01}
                    step={0.1}
                    required
                    value={targetFormulaModal.dosageGrams}
                    onChange={(e) =>
                      setTargetFormulaModal((prev) =>
                        prev ? { ...prev, dosageGrams: Number(e.target.value) } : null
                      )
                    }
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded px-3 py-1.5 font-mono-tabular text-white"
                  />
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  {[2, 5, 10, 15, 20].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() =>
                        setTargetFormulaModal((prev) =>
                          prev ? { ...prev, dosageGrams: g } : null
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular border ${
                        targetFormulaModal.dosageGrams === g
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                          : 'bg-[#0B0E14] text-slate-400 border-slate-800'
                      }`}
                    >
                      {g}g
                    </button>
                  ))}
                </div>
              </div>

              {!isAccord && (
                <div>
                  <label className="block text-slate-400 mb-1">Dilution Conc. (%)</label>
                  <input
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.5}
                    value={targetFormulaModal.dilutionPercent}
                    onChange={(e) =>
                      setTargetFormulaModal((prev) =>
                        prev ? { ...prev, dilutionPercent: Number(e.target.value) } : null
                      )
                    }
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded px-3 py-1.5 font-mono-tabular text-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    100% = Neat concentrate
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTargetFormulaModal(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Add to Formula ({targetFormulaModal.dosageGrams}g) →</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // New Material form state
  const [matName, setMatName] = useState('');
  const [matCas, setMatCas] = useState('');
  const [matOrigin, setMatOrigin] = useState<'Natural' | 'Synthetic' | 'Base'>('Synthetic');
  const [matFamily, setMatFamily] = useState('Green');
  const [matVolatility, setMatVolatility] = useState<VolatilityTier>('Heart');
  const [matSupplier, setMatSupplier] = useState('Firmenich');
  const [matNotes, setMatNotes] = useState('');
  const [matIfraMax, setMatIfraMax] = useState('');
  const [matIfraSource, setMatIfraSource] = useState('');

  // New Inventory Lot form state
  const [lotMaterialId, setLotMaterialId] = useState<number>(materials[0]?.id || 1);
  const [lotNumber, setLotNumber] = useState('LOT-2026-881');
  const [lotSupplier, setLotSupplier] = useState('Robertet');
  const [lotConc, setLotConc] = useState(100);
  const [lotSolvent, setLotSolvent] = useState('Neat');
  const [lotSize, setLotSize] = useState(50);
  const [lotRemaining, setLotRemaining] = useState(50);
  const [lotPrice, setLotPrice] = useState(32);
  const [lotLocation, setLotLocation] = useState('Organ Tier A-02');
  const [lotRetestDate, setLotRetestDate] = useState('2028-10-23');

  // Dedicated Accord Builder state (starts empty so users have 100% control over composition)
  const [accName, setAccName] = useState('');
  const [accCategory, setAccCategory] = useState('Floral');
  const [accDescription, setAccDescription] = useState('');
  const [accObjective, setAccObjective] = useState('');
  const [accDraftItems, setAccDraftItems] = useState<
    Array<{ materialId: number; materialName: string; percentage: number; dilutionPercent: number }>
  >([]);

  // Search-and-select dropdown state for Dedicated Accord Builder
  const [builderSearchQuery, setBuilderSearchQuery] = useState('');
  const [builderTierFilter, setBuilderTierFilter] = useState<'All' | 'Top' | 'Heart' | 'Base'>('All');
  const [isBuilderDropdownOpen, setIsBuilderDropdownOpen] = useState(false);

  // Accord Version History & Compact View state
  const [accordsViewMode, setAccordsViewMode] = useState<'cards' | 'compact'>('cards');
  const [selectedHistoryAccordId, setSelectedHistoryAccordId] = useState<number>(
    accords[0]?.id || 1
  );
  const [editingAccordId, setEditingAccordId] = useState<number | null>(null);
  const [accordVersionNoteDraft, setAccordVersionNoteDraft] = useState('');

  // Per-card custom search-and-select note picker & insert dosage state
  const [cardOpenDropdownId, setCardOpenDropdownId] = useState<number | null>(null);
  const [cardSearchQuery, setCardSearchQuery] = useState<Record<number, string>>({});
  const [cardInsertDosage, setCardInsertDosage] = useState<Record<number, number>>({});

  const selectedMaterial =
    materials.find((m) => m.id === selectedMaterialId) || materials[0];

  const selectedLimit = regulatoryLimits.find(
    (r) => r.materialId === selectedMaterial?.id
  );

  const selectedMemory = scentMemories.find(
    (mem) => mem.materialId === selectedMaterial?.id
  );

  // Compute all formulas where this material is used
  const materialUsageList = formulas.flatMap((f) =>
    f.versions.flatMap((v) => {
      const found = v.items.find(
        (i) =>
          i.materialId === selectedMaterial?.id ||
          i.name.toLowerCase() === selectedMaterial?.name.toLowerCase()
      );
      if (!found) return [];
      const review = usageReviews.find(
        (r) =>
          r.materialId === selectedMaterial?.id &&
          r.versionLabel === v.versionLabel
      );
      return [
        {
          formulaId: f.id,
          formulaName: f.name,
          versionLabel: v.versionLabel,
          percentage: found.percentage,
          effectiveness: review?.effectivenessScore ?? 8,
          observation:
            review?.observation ||
            v.versionNotes ||
            'Integrated cleanly into structural backbone.',
        },
      ];
    })
  );

  const handleCreateMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim()) return;
    await onCreateMaterial({
      name: matName.trim(),
      aliases: '',
      casNumber: matCas.trim() || 'Unknown / Not Provided',
      inciName: matName.trim(),
      naturalOrSynthetic: matOrigin,
      supplier: matSupplier.trim(),
      supplierProductCode: '',
      manufacturer: matSupplier.trim(),
      primaryFamily: matFamily,
      facets: [matFamily, 'Transparent'],
      intensity: 7,
      substantivityHours: 24,
      diffusion: 7,
      volatility: matVolatility,
      descriptiveNotes: matNotes.trim() || 'Added to personal perfumery organ.',
      texture: 'Smooth',
      temperatureImpression: 'Neutral',
      personalNotes: '',
      purity: '98% min',
      density: 0.95,
      recommendedDilution: 100,
      storageInfo: 'Cool, dark cabinet (15–20°C)',
      shelfLifeMonths: 24,
      flashPointCelsius: 95,
      educationalObserve: ['Evaluate on blotter at 0m, 30m, 4h, and 24h'],
      complements: ['Bergamot FCF', 'Hedione', 'Iso E Super'],
      contrasts: ['Ambroxan'],
      maxAllowedPercent: matIfraMax.trim() ? parseFloat(matIfraMax) : null,
      ifraSource: matIfraSource.trim() || 'Unknown / Not Provided',
    });
    setShowAddMaterialModal(false);
    setMatName('');
    setMatCas('');
    setMatNotes('');
    setToastMsg(`Added ${matName} to Raw Material Encyclopedia`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateLotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const costPerG = lotSize > 0 ? Number((lotPrice / lotSize).toFixed(3)) : 0;
    await onCreateInventoryLot({
      materialId: Number(lotMaterialId),
      supplier: lotSupplier,
      lotNumber: lotNumber.trim() || `LOT-${Date.now()}`,
      concentrationPercent: Number(lotConc),
      solvent: Number(lotConc) === 100 ? 'Neat' : lotSolvent,
      containerSizeGrams: Number(lotSize),
      quantityRemainingGrams: Number(lotRemaining),
      reservedQuantityGrams: 0,
      lowStockThresholdGrams: 10,
      purchaseDate: '2026-10-23',
      openedDate: '2026-10-23',
      retestDate: lotRetestDate,
      priceTotal: Number(lotPrice),
      costPerGram: costPerG,
      storageLocation: lotLocation,
      supplierReference: '',
      notes: 'Logged in Inventory Manager',
    });
    setShowAddLotModal(false);
    setToastMsg(`Logged Inventory Lot ${lotNumber}`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const normalizeAccordItemsTo100 = <T extends { percentage: number }>(items: T[]): T[] => {
    if (items.length === 0) return [];
    if (items.length === 1) {
      return [{ ...items[0], percentage: 100 }];
    }
    const sanitized = items.map((it) => Math.max(0, Number(it.percentage) || 0));
    const total = sanitized.reduce((sum, val) => sum + val, 0);
    const rawNormalized = sanitized.map((val) =>
      total > 0 ? (val / total) * 100 : 100 / items.length
    );
    const rounded = rawNormalized.map((val) => Math.round(val * 10) / 10);
    const sumExceptLast = rounded
      .slice(0, rounded.length - 1)
      .reduce((sum, val) => sum + val, 0);
    const exactLast = Math.max(0, Number((100 - sumExceptLast).toFixed(1)));
    return items.map((it, idx) => ({
      ...it,
      percentage: idx === items.length - 1 ? exactLast : rounded[idx],
    }));
  };

  const handleCreateAccordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) {
      setToastMsg('Please enter a name for your accord.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    if (accDraftItems.length === 0) {
      setToastMsg('Please add at least one ingredient from the search-and-select dropdown.');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    const normalizedItems = normalizeAccordItemsTo100(accDraftItems);

    const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    await onCreateAccord({
      name: accName.trim(),
      category: accCategory,
      description: accDescription.trim() || `Custom ${accCategory} structural accord.`,
      objective: accObjective.trim() || 'Reusable sub-formula block for fragrance composition.',
      usageSuggestions: 'Use at 5–20% in concentrate',
      notes: 'Created in Accord Studio',
      isEducational: false,
      items: normalizedItems,
      olfactoryProfile: { [accCategory]: 8 },
      activeVersionLabel: 'V1',
      versions: [
        {
          versionId: `acc-${Date.now()}-v1`,
          versionLabel: 'V1',
          createdAt: nowStamp,
          versionNotes:
            accObjective.trim() ||
            accDescription.trim() ||
            'Initial accord composition saved from Builder.',
          items: normalizedItems.map((it) => ({ ...it })),
        },
      ],
    });
    setShowAddAccordModal(false);
    const savedName = accName.trim();
    setAccName('');
    setAccDescription('');
    setAccObjective('');
    setAccDraftItems([]);
    setEditingAccordId(null);
    setBuilderSearchQuery('');
    setIsBuilderDropdownOpen(false);
    setToastMsg(`Saved accord "${savedName}" (V1) with ${normalizedItems.length} ingredients`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // 1. INVENTORY MODE
  if (mode === 'inventory') {
    const lowStockLots = inventoryLots.filter(
      (l) => l.quantityRemainingGrams <= l.lowStockThresholdGrams
    );
    const retestLots = inventoryLots.filter(
      (l) => l.retestDate && l.retestDate <= '2026-11-15'
    );
    const totalValue = inventoryLots.reduce((s, l) => s + l.priceTotal, 0);

    return (
      <div className="space-y-6">
        {toastMsg && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-950 border border-emerald-600 px-4 py-2.5 text-xs text-emerald-200">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-sans font-semibold text-white">
              Lot-Based Inventory & Stock Audit System
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Track physical raw material lots, dilutions, storage locations, retest dates, and controlled batch consumption movements.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddLotModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 self-start whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Inventory Lot
          </button>
        </div>

        {/* Inventory KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[#111621] border border-slate-800">
            <div className="text-xs text-slate-400">Active Organ Lots</div>
            <div className="text-2xl font-mono-tabular font-semibold text-white mt-1">
              {inventoryLots.length}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#111621] border border-slate-800">
            <div className="text-xs text-slate-400">Low-Stock Alerts</div>
            <div className="text-2xl font-mono-tabular font-semibold text-amber-400 mt-1">
              {lowStockLots.length}{' '}
              <span className="text-xs text-slate-400 font-normal">
                ({lowStockLots.map((l) => l.lotNumber).join(', ') || 'None'})
              </span>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#111621] border border-slate-800">
            <div className="text-xs text-slate-400">Approaching Retest Date</div>
            <div className="text-2xl font-mono-tabular font-semibold text-rose-400 mt-1">
              {retestLots.length}{' '}
              <span className="text-xs text-slate-400 font-normal">
                ({retestLots.map((l) => l.lotNumber).join(', ') || 'None'})
              </span>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#111621] border border-slate-800">
            <div className="text-xs text-slate-400">Total Organ Valuation</div>
            <div className="text-2xl font-mono-tabular font-semibold text-emerald-400 mt-1">
              ${totalValue.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Lots Table */}
        <div className="rounded-lg bg-[#111621] border border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                <th className="py-3 px-4 font-medium">Lot Number</th>
                <th className="py-3 px-4 font-medium">Raw Material</th>
                <th className="py-3 px-4 font-medium">Supplier</th>
                <th className="py-3 px-4 font-medium">Concentration</th>
                <th className="py-3 px-4 font-medium text-right">Remaining / Size</th>
                <th className="py-3 px-4 font-medium text-right">Cost / g</th>
                <th className="py-3 px-4 font-medium">Location</th>
                <th className="py-3 px-4 font-medium">Retest Date</th>
                <th className="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {inventoryLots.map((lot) => {
                const mat = materials.find((m) => m.id === lot.materialId);
                const isLow = lot.quantityRemainingGrams <= lot.lowStockThresholdGrams;
                const isRetestDue = lot.retestDate && lot.retestDate <= '2026-11-15';
                return (
                  <tr key={lot.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-white">
                      {lot.lotNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-emerald-300">
                      {mat?.name || `Material #${lot.materialId}`}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{lot.supplier}</td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-300">
                      {lot.concentrationPercent}% in {lot.solvent}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-white">
                      {lot.quantityRemainingGrams.toFixed(1)} g / {lot.containerSizeGrams} g
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-300">
                      ${lot.costPerGram.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{lot.storageLocation}</td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-400">
                      {lot.retestDate || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-[11px]">
                      {isLow ? (
                        <span className="text-amber-400 font-medium">
                          ⚠ Low stock (&lt;{lot.lowStockThresholdGrams}g)
                        </span>
                      ) : isRetestDue ? (
                        <span className="text-rose-400 font-medium">
                          ▲ Retest due ({lot.retestDate})
                        </span>
                      ) : (
                        <span className="text-emerald-400">● Nominal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Stock Movement Audit Trail */}
        <div className="rounded-lg bg-[#111621] border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              Complete Stock Movement Audit Trail
            </h2>
            <span className="text-xs text-slate-400 font-mono-tabular">
              {inventoryMovements.length} Logged Movements
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                  <th className="py-2 px-3 font-medium">Timestamp</th>
                  <th className="py-2 px-3 font-medium">Movement Type</th>
                  <th className="py-2 px-3 font-medium">Lot ID</th>
                  <th className="py-2 px-3 font-medium text-right">Theoretical (g)</th>
                  <th className="py-2 px-3 font-medium text-right">Actual Weighed (g)</th>
                  <th className="py-2 px-3 font-medium text-right">Stock Delta (g)</th>
                  <th className="py-2 px-3 font-medium">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {inventoryMovements.map((mov) => {
                  const lot = inventoryLots.find((l) => l.id === mov.lotId);
                  return (
                    <tr key={mov.id}>
                      <td className="py-2 px-3 font-mono-tabular text-slate-400">
                        {mov.createdAt}
                      </td>
                      <td className="py-2 px-3 font-medium text-white">
                        {mov.movementType}
                      </td>
                      <td className="py-2 px-3 font-mono-tabular text-slate-300">
                        {lot?.lotNumber || `Lot #${mov.lotId}`}
                      </td>
                      <td className="py-2 px-3 text-right font-mono-tabular text-slate-400">
                        {mov.theoreticalGrams !== null && mov.theoreticalGrams !== undefined
                          ? `${mov.theoreticalGrams.toFixed(3)} g`
                          : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono-tabular text-slate-200">
                        {mov.actualGrams !== null && mov.actualGrams !== undefined
                          ? `${mov.actualGrams.toFixed(3)} g`
                          : '—'}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-mono-tabular font-semibold ${
                          mov.deltaGrams < 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        {mov.deltaGrams > 0 ? '+' : ''}
                        {mov.deltaGrams.toFixed(3)} g
                      </td>
                      <td className="py-2 px-3 text-slate-400">{mov.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Lot Modal */}
        {showAddLotModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={handleCreateLotSubmit}
              className="w-full max-w-lg rounded-lg bg-[#111621] border border-slate-800 p-6 space-y-4 text-xs"
            >
              <h3 className="text-base font-semibold text-white">
                Register New Raw Material Lot
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Raw Material</label>
                  <select
                    value={lotMaterialId}
                    onChange={(e) => setLotMaterialId(Number(e.target.value))}
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 text-white"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Lot / Batch Number</label>
                  <input
                    type="text"
                    required
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 font-mono-tabular text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={lotSupplier}
                    onChange={(e) => setLotSupplier(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Concentration %</label>
                  <input
                    type="number"
                    min={0.1}
                    max={100}
                    step="0.1"
                    value={lotConc}
                    onChange={(e) => setLotConc(Number(e.target.value))}
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 font-mono-tabular text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Container Size (g)</label>
                  <input
                    type="number"
                    min={1}
                    value={lotSize}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLotSize(val);
                      setLotRemaining(val);
                    }}
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 font-mono-tabular text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Price Paid ($)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={lotPrice}
                    onChange={(e) => setLotPrice(Number(e.target.value))}
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 font-mono-tabular text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={lotLocation}
                    onChange={(e) => setLotLocation(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Retest / Expiry Date</label>
                  <input
                    type="date"
                    value={lotRetestDate}
                    onChange={(e) => setLotRetestDate(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 font-mono-tabular text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddLotModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-md"
                >
                  Save Inventory Lot
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // 2. ACCORDS & BASES MODE
  if (mode === 'accords') {
    const getAccordVersions = (acc: AccordDefinition): AccordVersionSnapshot[] => {
      if (acc.versions && acc.versions.length > 0) {
        return acc.versions;
      }
      return [
        {
          versionId: `acc-${acc.id}-v1`,
          versionLabel: acc.activeVersionLabel || 'V1',
          createdAt: '2026-10-20 10:00',
          versionNotes: acc.objective || 'Initial baseline composition',
          items: acc.items.map((it) => ({ ...it })),
        },
      ];
    };

    const activeHistoryAccord =
      accords.find((a) => a.id === selectedHistoryAccordId) || accords[0] || null;
    const activeHistoryVersions = activeHistoryAccord
      ? getAccordVersions(activeHistoryAccord)
      : [];

    const handleAddBuilderMaterial = (matObj: RawMaterial) => {
      const alreadyExists = accDraftItems.some((it) => it.materialId === matObj.id);
      if (alreadyExists) {
        setToastMsg(`${matObj.name} is already in your accord ingredient list`);
        setTimeout(() => setToastMsg(null), 2500);
        return;
      }
      const nextCount = accDraftItems.length + 1;
      const defaultShare = nextCount === 1 ? 100 : 25;
      setAccDraftItems((prev) => [
        ...prev,
        {
          materialId: matObj.id,
          materialName: matObj.name,
          percentage: defaultShare,
          dilutionPercent: matObj.recommendedDilution || 100,
        },
      ]);
      setBuilderSearchQuery('');
      setToastMsg(`Added ${matObj.name} to accord builder`);
      setTimeout(() => setToastMsg(null), 2200);
    };

    const getActiveFormulasUsingAccord = (acc: AccordDefinition): Formula[] => {
      return formulas.filter((f) => {
        if (f.status === 'Archived') return false;
        const activeVer =
          f.versions.find((v) => v.versionLabel === f.activeVersionLabel) ||
          f.versions[f.versions.length - 1];
        if (!activeVer) return false;
        return activeVer.items.some(
          (item) =>
            item.accordId === acc.id ||
            item.parentAccordId === acc.id ||
            (item.type === 'accord' &&
              item.name.trim().toLowerCase() === acc.name.trim().toLowerCase())
        );
      });
    };

    const handleNormalizeBuilderDraft = () => {
      if (accDraftItems.length === 0) return;
      setAccDraftItems((prev) => normalizeAccordItemsTo100(prev));
      setToastMsg('Normalized builder ingredient ratios to 100.0%');
      setTimeout(() => setToastMsg(null), 2200);
    };

    const handleLoadAccordIntoBuilder = (acc: AccordDefinition) => {
      setSelectedHistoryAccordId(acc.id);
      setEditingAccordId(acc.id);
      setAccName(acc.name);
      setAccCategory(acc.category || 'Floral');
      setAccDescription(acc.description || '');
      setAccObjective(acc.objective || '');
      setAccDraftItems(
        acc.items.map((it) => ({
          materialId: it.materialId,
          materialName: it.materialName,
          percentage: Number(it.percentage) || 10,
          dilutionPercent: Number(it.dilutionPercent) || 100,
        }))
      );
      setToastMsg(
        `Loaded "${acc.name}" (${acc.activeVersionLabel || 'V1'}) into Builder & Version History`
      );
      setTimeout(() => setToastMsg(null), 2800);
    };

    const handleCommitAccordVersion = (
      targetAcc: AccordDefinition,
      sourceItems: AccordItem[],
      customNote?: string
    ) => {
      if (!onUpdateAccord || sourceItems.length === 0) return;
      const normalizedItems = normalizeAccordItemsTo100(sourceItems);
      const existingVersions = getAccordVersions(targetAcc);
      const nextVersionNum = existingVersions.length + 1;
      const nextLabel = `V${nextVersionNum}`;
      const nowStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const noteText =
        (customNote ?? accordVersionNoteDraft).trim() ||
        `Iteration ${nextLabel} (${normalizedItems.length} notes balanced to 100%)`;

      const newSnapshot: AccordVersionSnapshot = {
        versionId: `acc-${targetAcc.id}-v${nextVersionNum}-${Date.now()}`,
        versionLabel: nextLabel,
        createdAt: nowStamp,
        versionNotes: noteText,
        items: normalizedItems.map((it) => ({ ...it })),
      };

      onUpdateAccord({
        ...targetAcc,
        name: editingAccordId === targetAcc.id && accName.trim() ? accName.trim() : targetAcc.name,
        category:
          editingAccordId === targetAcc.id && accCategory ? accCategory : targetAcc.category,
        description:
          editingAccordId === targetAcc.id && accDescription.trim()
            ? accDescription.trim()
            : targetAcc.description,
        objective:
          editingAccordId === targetAcc.id && accObjective.trim()
            ? accObjective.trim()
            : targetAcc.objective,
        items: normalizedItems,
        activeVersionLabel: nextLabel,
        versions: [...existingVersions, newSnapshot],
      });

      if (editingAccordId === targetAcc.id) {
        setAccDraftItems(normalizedItems.map((it) => ({ ...it })));
      }
      setAccordVersionNoteDraft('');
      setToastMsg(`Saved version ${nextLabel} for "${targetAcc.name}"`);
      setTimeout(() => setToastMsg(null), 2800);
    };

    const handleRevertAccordToVersion = (
      targetAcc: AccordDefinition,
      snap: AccordVersionSnapshot
    ) => {
      if (!onUpdateAccord) return;
      const existingVersions = getAccordVersions(targetAcc);
      const revertedItems = snap.items.map((it) => ({ ...it }));
      onUpdateAccord({
        ...targetAcc,
        items: revertedItems,
        activeVersionLabel: snap.versionLabel,
        versions: existingVersions,
      });
      if (editingAccordId === targetAcc.id) {
        setAccDraftItems(revertedItems.map((it) => ({ ...it })));
      }
      setToastMsg(`Reverted "${targetAcc.name}" to ${snap.versionLabel}`);
      setTimeout(() => setToastMsg(null), 2800);
    };

    const handleLoadVersionIntoBuilderForm = (
      targetAcc: AccordDefinition,
      snap: AccordVersionSnapshot
    ) => {
      setSelectedHistoryAccordId(targetAcc.id);
      setEditingAccordId(targetAcc.id);
      setAccName(targetAcc.name);
      setAccCategory(targetAcc.category || 'Floral');
      setAccDescription(targetAcc.description || '');
      setAccObjective(targetAcc.objective || '');
      setAccDraftItems(
        snap.items.map((it) => ({
          materialId: it.materialId,
          materialName: it.materialName,
          percentage: Number(it.percentage) || 10,
          dilutionPercent: Number(it.dilutionPercent) || 100,
        }))
      );
      setToastMsg(
        `Loaded ${snap.versionLabel} of "${targetAcc.name}" into Builder form`
      );
      setTimeout(() => setToastMsg(null), 2500);
    };

    const handleUpdateCardItem = (
      acc: AccordDefinition,
      itemIdx: number,
      changes: Partial<{
        materialId: number;
        materialName: string;
        percentage: number;
        dilutionPercent: number;
      }>
    ) => {
      if (!onUpdateAccord) return;
      const nextItems = acc.items.map((it, idx) =>
        idx === itemIdx ? { ...it, ...changes } : it
      );
      onUpdateAccord({ ...acc, items: nextItems });
    };

    const handleRemoveCardItem = (acc: AccordDefinition, itemIdx: number) => {
      if (!onUpdateAccord) return;
      const nextItems = acc.items.filter((_, idx) => idx !== itemIdx);
      onUpdateAccord({ ...acc, items: nextItems });
      setToastMsg(`Removed ingredient from ${acc.name}`);
      setTimeout(() => setToastMsg(null), 2500);
    };

    const handleAddCardMaterialDirect = (acc: AccordDefinition, matObj: RawMaterial) => {
      if (!onUpdateAccord) return;
      const nextItems = [
        ...acc.items,
        {
          materialId: matObj.id,
          materialName: matObj.name,
          percentage: 15,
          dilutionPercent: matObj.recommendedDilution || 100,
        },
      ];
      onUpdateAccord({ ...acc, items: nextItems });
      setCardOpenDropdownId(null);
      setCardSearchQuery((prev) => ({ ...prev, [acc.id]: '' }));
      setToastMsg(`Added ${matObj.name} to ${acc.name}`);
      setTimeout(() => setToastMsg(null), 2500);
    };

    const handleNormalizeCard = (acc: AccordDefinition) => {
      if (!onUpdateAccord || acc.items.length === 0) return;
      const nextItems = normalizeAccordItemsTo100(acc.items);
      onUpdateAccord({ ...acc, items: nextItems });
      setToastMsg(`Normalized ${acc.name} ratios to 100.0%`);
      setTimeout(() => setToastMsg(null), 2500);
    };

    const builderFilteredMaterials = materials.filter((m) => {
      const q = builderSearchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.primaryFamily.toLowerCase().includes(q) ||
        m.volatility.toLowerCase().includes(q) ||
        m.descriptiveNotes.toLowerCase().includes(q);
      const matchTier =
        builderTierFilter === 'All' ||
        (builderTierFilter === 'Top' && m.volatility.includes('Top')) ||
        (builderTierFilter === 'Heart' && m.volatility.includes('Heart')) ||
        (builderTierFilter === 'Base' && m.volatility.includes('Base'));
      return matchQuery && matchTier;
    });

    const draftTotalPct = accDraftItems.reduce(
      (sum, it) => sum + (Number(it.percentage) || 0),
      0
    );

    const getVolatilityBadgeClass = (vol: string) => {
      if (vol.includes('Top')) {
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      }
      if (vol.includes('Heart')) {
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      }
      return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    };

    const editingTargetAccord = editingAccordId
      ? accords.find((a) => a.id === editingAccordId) || null
      : null;

    return (
      <div className="space-y-8">
        {toastMsg && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-950 border border-emerald-600 px-4 py-2.5 text-xs text-emerald-200 shadow-xl">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Studio Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/70 pb-5">
          <div>
            <h1 className="text-2xl font-sans font-semibold text-white">
              Accords & Fragrance Bases Studio
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 font-normal leading-relaxed max-w-3xl">
              Build custom accords from scratch using the dedicated form on the left, track and revert iterations in the Accord Version History section, and switch between Detailed Cards and Compact View on the right.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-[#111621] border border-slate-800/80 font-mono-tabular">
              {accords.length} Saved Accords
            </span>
          </div>
        </div>

        {/* Main 2-Column Layout: Dedicated Accord Builder + Version History (Left) | Saved Accords Library (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Dedicated Form for Naming, Building, and Tracking Accord Versions */}
          <div className="lg:col-span-5 space-y-6">
            <form
              onSubmit={handleCreateAccordSubmit}
              noValidate
              data-testid="dedicated-accord-builder-form"
              className="rounded-xl bg-[#111621] border border-slate-800/80 p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800/70 pb-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-emerald-400 block">
                    {editingTargetAccord
                      ? `Editing Saved Accord · ${
                          editingTargetAccord.activeVersionLabel || 'V1'
                        }`
                      : 'Step-by-Step Builder'}
                  </span>
                  <h2 className="text-base font-normal text-white mt-0.5">
                    {editingTargetAccord
                      ? `Customize "${editingTargetAccord.name}"`
                      : 'Build a New Custom Accord'}
                  </h2>
                </div>
                {(accDraftItems.length > 0 || editingTargetAccord) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAccName('');
                      setAccDescription('');
                      setAccObjective('');
                      setAccDraftItems([]);
                      setEditingAccordId(null);
                      setBuilderSearchQuery('');
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    New Blank Form
                  </button>
                )}
              </div>

              {/* 1. Naming & Family */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="accord-builder-name"
                    className="block text-xs text-slate-300 mb-1.5 font-normal"
                  >
                    1. Accord Name *
                  </label>
                  <input
                    id="accord-builder-name"
                    data-testid="accord-name-input"
                    type="text"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    placeholder="e.g., Velvet Ambergris Base, Crisp Fig Leaf..."
                    className="w-full bg-[#0B0E14] border border-slate-800 focus:border-emerald-500/70 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="accord-builder-family"
                    className="block text-xs text-slate-300 mb-1.5 font-normal"
                  >
                    Olfactory Family
                  </label>
                  <select
                    id="accord-builder-family"
                    data-testid="accord-family-select"
                    value={accCategory}
                    onChange={(e) => setAccCategory(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-slate-800 focus:border-emerald-500/70 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none"
                  >
                    {OLFACTORY_WHEEL_FAMILIES.map((f) => (
                      <option
                        key={f.id}
                        value={f.name}
                        className="bg-[#111622] text-slate-100"
                      >
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Scent Profile & Objective */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="accord-builder-desc"
                    className="block text-xs text-slate-400 mb-1 font-normal"
                  >
                    Scent Impression (Optional)
                  </label>
                  <input
                    id="accord-builder-desc"
                    type="text"
                    value={accDescription}
                    onChange={(e) => setAccDescription(e.target.value)}
                    placeholder="Luminous, velvety, green-lactonic..."
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="accord-builder-objective"
                    className="block text-xs text-slate-400 mb-1 font-normal"
                  >
                    Role in Formula (Optional)
                  </label>
                  <input
                    id="accord-builder-objective"
                    type="text"
                    value={accObjective}
                    onChange={(e) => setAccObjective(e.target.value)}
                    placeholder="Heart bridge or diffusive base..."
                    className="w-full bg-[#0B0E14] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. Search-and-Select Ingredient Dropdown */}
              <div className="pt-2 border-t border-slate-800/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="accord-ingredient-search"
                    className="text-xs text-slate-300 font-normal"
                  >
                    2. Add Ingredients (Search & Select Note)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {materials.length} notes available
                  </span>
                </div>

                {/* Volatility Tier Filter Chips for Dropdown */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['All', 'Top', 'Heart', 'Base'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => {
                        setBuilderTierFilter(tier);
                        setIsBuilderDropdownOpen(true);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-normal transition-colors border ${
                        builderTierFilter === tier
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : 'bg-[#0B0E14] text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {tier === 'All' ? 'All Notes' : `${tier} Notes`}
                    </button>
                  ))}
                </div>

                {/* Custom Search-and-Select Dropdown Input & High-Contrast List */}
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="accord-ingredient-search"
                        data-testid="accord-ingredient-search-input"
                        type="text"
                        value={builderSearchQuery}
                        onFocus={() => setIsBuilderDropdownOpen(true)}
                        onChange={(e) => {
                          setBuilderSearchQuery(e.target.value);
                          setIsBuilderDropdownOpen(true);
                        }}
                        placeholder="Search by note name, family, or tier..."
                        className="w-full bg-[#0B0E14] border border-slate-700/90 focus:border-emerald-500 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      data-testid="accord-ingredient-dropdown-toggle"
                      onClick={() => setIsBuilderDropdownOpen((prev) => !prev)}
                      className="px-3 py-2 rounded-lg bg-[#0B0E14] hover:bg-slate-800 border border-slate-700/90 text-xs text-slate-200 whitespace-nowrap transition-colors"
                    >
                      {isBuilderDropdownOpen ? 'Hide List ▲' : 'Browse Notes ▼'}
                    </button>
                  </div>

                  {/* High-Contrast Custom Dropdown Menu (Readable in both Dark & Day themes) */}
                  {isBuilderDropdownOpen && (
                    <div
                      data-testid="accord-ingredient-dropdown-list"
                      className="mt-1.5 rounded-xl bg-[#0B0E14] border border-slate-700 shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-800/70 z-30"
                    >
                      {builderFilteredMaterials.length === 0 ? (
                        <div className="px-4 py-4 text-xs text-slate-400 text-center">
                          No matching notes found for "{builderSearchQuery}".
                        </div>
                      ) : (
                        builderFilteredMaterials.map((m) => {
                          const isAdded = accDraftItems.some((it) => it.materialId === m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              data-testid={`accord-select-option-${m.id}`}
                              onClick={() => handleAddBuilderMaterial(m)}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                                isAdded
                                  ? 'bg-emerald-950/25 text-emerald-300'
                                  : 'hover:bg-slate-800/80 text-slate-100'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-normal text-white truncate">
                                    {m.name}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] border ${getVolatilityBadgeClass(
                                      m.volatility
                                    )}`}
                                  >
                                    {m.volatility.replace(' Note', '')}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {m.primaryFamily} · {m.naturalOrSynthetic}
                                </p>
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded-md text-[11px] shrink-0 border ${
                                  isAdded
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-[#111621] text-emerald-400 border-slate-700'
                                }`}
                              >
                                {isAdded ? 'Added ✓' : '+ Select'}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Selected Accord Ingredients List & Proportions */}
              <div className="pt-3 border-t border-slate-800/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-300">
                    <span>3. Accord Composition</span>
                    <span className="ml-2 text-slate-400 font-mono-tabular">
                      ({accDraftItems.length} notes · Total:{' '}
                      <span
                        className={
                          Math.abs(draftTotalPct - 100) <= 0.5 && accDraftItems.length > 0
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }
                      >
                        {draftTotalPct.toFixed(1)}%
                      </span>
                      )
                    </span>
                  </div>
                  {accDraftItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleNormalizeBuilderDraft}
                      className="px-2.5 py-1 rounded bg-[#0B0E14] hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[11px] font-normal transition-colors"
                    >
                      Normalize to 100%
                    </button>
                  )}
                </div>

                {accDraftItems.length === 0 ? (
                  <div
                    data-testid="accord-builder-empty-state"
                    className="rounded-xl bg-[#0B0E14] border border-dashed border-slate-800 p-5 text-center space-y-2"
                  >
                    <p className="text-xs text-slate-300 font-normal">
                      Your accord ingredient list is currently empty.
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Search or click <span className="text-slate-200">Browse Notes ▼</span> above to choose the exact raw materials you want in this accord.
                    </p>
                  </div>
                ) : (
                  <div
                    data-testid="accord-builder-ingredients-list"
                    className="space-y-2 max-h-72 overflow-y-auto pr-1"
                  >
                    {accDraftItems.map((draftItem, idx) => {
                      const matMeta = materials.find((m) => m.id === draftItem.materialId);
                      const relShare =
                        draftTotalPct > 0
                          ? Math.min(100, (Number(draftItem.percentage) / draftTotalPct) * 100)
                          : 0;
                      return (
                        <div
                          key={`${draftItem.materialId}-${idx}`}
                          data-testid={`accord-draft-row-${idx}`}
                          className="rounded-lg bg-[#0B0E14] border border-slate-800/90 px-3 py-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-white font-normal truncate">
                                  {draftItem.materialName}
                                </span>
                                {matMeta && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] border ${getVolatilityBadgeClass(
                                      matMeta.volatility
                                    )}`}
                                  >
                                    {matMeta.volatility.replace(' Note', '')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Percentage Input */}
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="any"
                                aria-label={`${draftItem.materialName} percentage`}
                                value={draftItem.percentage}
                                onChange={(e) =>
                                  setAccDraftItems((prev) =>
                                    prev.map((row, rIdx) =>
                                      rIdx === idx
                                        ? {
                                            ...row,
                                            percentage: Math.max(
                                              0,
                                              Math.min(100, Number(e.target.value))
                                            ),
                                          }
                                        : row
                                    )
                                  )
                                }
                                className="w-16 bg-[#111621] border border-slate-700 rounded px-2 py-1 text-right font-mono-tabular text-emerald-400 text-xs"
                              />
                              <span className="text-slate-400 text-[11px]">%</span>
                            </div>

                            {/* Dilution Input */}
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-slate-400 text-[10px]">@</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step="any"
                                aria-label={`${draftItem.materialName} dilution`}
                                value={draftItem.dilutionPercent}
                                onChange={(e) =>
                                  setAccDraftItems((prev) =>
                                    prev.map((row, rIdx) =>
                                      rIdx === idx
                                        ? {
                                            ...row,
                                            dilutionPercent: Math.min(
                                              100,
                                              Math.max(0.1, Number(e.target.value))
                                            ),
                                          }
                                        : row
                                    )
                                  )
                                }
                                className="w-14 bg-[#111621] border border-slate-700 rounded px-1.5 py-1 text-right font-mono-tabular text-slate-200 text-[11px]"
                              />
                              <span className="text-slate-400 text-[10px]">%</span>
                            </div>

                            {/* Remove Ingredient Button */}
                            <button
                              type="button"
                              onClick={() =>
                                setAccDraftItems((prev) =>
                                  prev.filter((_, rIdx) => rIdx !== idx)
                                )
                              }
                              title="Remove ingredient"
                              className="px-1.5 py-0.5 text-slate-400 hover:text-rose-400 transition-colors text-sm"
                            >
                              ×
                            </button>
                          </div>

                          {/* Minimal flat proportion bar */}
                          <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500/70 rounded-full transition-all"
                              style={{ width: `${relShare}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit / Save Iteration Actions */}
              <div className="pt-3 border-t border-slate-800/70 space-y-2">
                {editingTargetAccord && accDraftItems.length > 0 && (
                  <button
                    type="button"
                    data-testid="save-accord-iteration-btn"
                    onClick={() =>
                      handleCommitAccordVersion(
                        editingTargetAccord,
                        accDraftItems,
                        accordVersionNoteDraft
                      )
                    }
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-normal bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>
                      Save as New Version (V
                      {getAccordVersions(editingTargetAccord).length + 1}) of "
                      {editingTargetAccord.name}"
                    </span>
                  </button>
                )}

                <button
                  type="submit"
                  data-testid="save-new-accord-btn"
                  disabled={!accName.trim() || accDraftItems.length === 0}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-normal transition-colors flex items-center justify-center gap-2 ${
                    accName.trim() && accDraftItems.length > 0
                      ? editingTargetAccord
                        ? 'bg-[#0B0E14] hover:bg-slate-800 text-emerald-400 border border-slate-700 cursor-pointer'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                      : 'bg-slate-800/70 text-slate-400 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {editingTargetAccord ? 'Save as Separate New Accord' : 'Save Accord to Library'}
                    {accDraftItems.length > 0
                      ? ` (${accDraftItems.length} ${
                          accDraftItems.length === 1 ? 'Note' : 'Notes'
                        })`
                      : ''}
                  </span>
                </button>
              </div>

              {/* 4. ACCORD VERSION HISTORY SECTION (Inside Form) */}
              <div
                data-testid="accord-version-history-section"
                className="pt-5 border-t border-slate-800/80 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <h3 className="text-sm font-normal text-white">
                        4. Accord Version History
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Track iterations and revert any saved accord to an earlier version
                      </p>
                    </div>
                  </div>
                </div>

                {/* Saved Accord Selector for History */}
                <div>
                  <label
                    htmlFor="accord-history-selector"
                    className="block text-[11px] text-slate-400 mb-1 font-normal"
                  >
                    Inspect Saved Accord History
                  </label>
                  <select
                    id="accord-history-selector"
                    data-testid="accord-history-select"
                    value={activeHistoryAccord?.id || ''}
                    onChange={(e) => {
                      const nextId = Number(e.target.value);
                      setSelectedHistoryAccordId(nextId);
                    }}
                    className="w-full bg-[#0B0E14] border border-slate-800 focus:border-emerald-500/70 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    {accords.map((a) => (
                      <option
                        key={a.id}
                        value={a.id}
                        className="bg-[#111622] text-slate-100"
                      >
                        {a.name} ({a.category} · Active: {a.activeVersionLabel || 'V1'})
                      </option>
                    ))}
                  </select>
                </div>

                {activeHistoryAccord && (
                  <>
                    {/* Quick Snapshot Commit Bar for Selected Accord */}
                    <div className="rounded-lg bg-[#0B0E14] border border-slate-800/90 p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-300">
                          Record New Iteration (V{activeHistoryVersions.length + 1})
                        </span>
                        <span className="text-slate-400 font-mono-tabular">
                          Current: {activeHistoryAccord.activeVersionLabel || 'V1'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          data-testid="accord-version-note-input"
                          value={accordVersionNoteDraft}
                          onChange={(e) => setAccordVersionNoteDraft(e.target.value)}
                          placeholder="Version note (e.g., Softened galbanum to 5%)..."
                          className="flex-1 bg-[#111621] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60"
                        />
                        <button
                          type="button"
                          data-testid="commit-accord-version-btn"
                          onClick={() =>
                            handleCommitAccordVersion(
                              activeHistoryAccord,
                              editingAccordId === activeHistoryAccord.id &&
                                accDraftItems.length > 0
                                ? accDraftItems
                                : activeHistoryAccord.items,
                              accordVersionNoteDraft
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-normal whitespace-nowrap transition-colors shrink-0"
                        >
                          + Save V{activeHistoryVersions.length + 1}
                        </button>
                      </div>
                    </div>

                    {/* Timeline of Versions */}
                    <div
                      data-testid="accord-version-timeline"
                      className="space-y-2.5 max-h-64 overflow-y-auto pr-1"
                    >
                      {activeHistoryVersions
                        .slice()
                        .reverse()
                        .map((snap) => {
                          const isCurrent =
                            (activeHistoryAccord.activeVersionLabel || 'V1') ===
                            snap.versionLabel;
                          return (
                            <div
                              key={snap.versionId}
                              data-testid={`accord-version-row-${snap.versionLabel}`}
                              className={`rounded-lg border p-3 space-y-2 transition-colors ${
                                isCurrent
                                  ? 'bg-emerald-950/15 border-emerald-500/40'
                                  : 'bg-[#0B0E14] border-slate-800/80'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-mono-tabular bg-[#111621] border border-slate-700 text-emerald-400">
                                    {snap.versionLabel}
                                  </span>
                                  {isCurrent && (
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      Active Version
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-400 font-mono-tabular">
                                    {snap.createdAt}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    data-testid={`load-accord-version-${snap.versionLabel}`}
                                    onClick={() =>
                                      handleLoadVersionIntoBuilderForm(
                                        activeHistoryAccord,
                                        snap
                                      )
                                    }
                                    className="px-2 py-1 rounded bg-[#111621] hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] transition-colors"
                                  >
                                    Load in Form
                                  </button>
                                  <button
                                    type="button"
                                    data-testid={`revert-accord-version-${snap.versionLabel}`}
                                    onClick={() =>
                                      handleRevertAccordToVersion(activeHistoryAccord, snap)
                                    }
                                    className={`px-2.5 py-1 rounded text-[11px] transition-colors border ${
                                      isCurrent
                                        ? 'bg-[#111621] text-slate-400 border-slate-800 hover:text-white'
                                        : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                                    }`}
                                  >
                                    {isCurrent
                                      ? 'Restore Snapshot'
                                      : `Revert to ${snap.versionLabel}`}
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 font-normal leading-relaxed">
                                {snap.versionNotes}
                              </p>

                              {/* Snapshot Ingredient Breakdown Pills */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {snap.items.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-[#111621] border border-slate-800 text-[11px] text-slate-300 font-mono-tabular"
                                  >
                                    {it.materialName}{' '}
                                    <span className="text-emerald-400">{it.percentage}%</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT COLUMN: Saved Accords & Classical Bases Library (Cards vs Compact View) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-normal text-slate-200">
                  Saved Accords & Classical Bases ({accords.length})
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Switch between Detailed Cards for inline ratio editing or Compact View for quick scanning
                </p>
              </div>

              {/* View Mode Switcher: Detailed Cards vs Compact View */}
              <div
                data-testid="accords-view-mode-switcher"
                className="flex items-center gap-1 p-1 rounded-lg bg-[#111621] border border-slate-800"
              >
                <button
                  type="button"
                  data-testid="accords-view-cards"
                  onClick={() => setAccordsViewMode('cards')}
                  className={`px-3 py-1.5 rounded-md text-xs font-normal transition-colors ${
                    accordsViewMode === 'cards'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Detailed Cards
                </button>
                <button
                  type="button"
                  data-testid="accords-view-compact"
                  onClick={() => setAccordsViewMode('compact')}
                  className={`px-3 py-1.5 rounded-md text-xs font-normal transition-colors ${
                    accordsViewMode === 'compact'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Compact View
                </button>
              </div>
            </div>

            {accordsViewMode === 'compact' ? (
              /* COMPACT VIEW FOR ACCORDS */
              <div
                data-testid="accords-compact-list"
                className="space-y-3"
              >
                {accords.map((acc) => {
                  const totalPct = acc.items.reduce(
                    (s, it) => s + (Number(it.percentage) || 0),
                    0
                  );
                  const isNormalized = Math.abs(totalPct - 100) <= 0.5;
                  const insertGrams = cardInsertDosage[acc.id] ?? 10;
                  const verCount = getAccordVersions(acc).length;
                  const usedByActiveFormulas = getActiveFormulasUsingAccord(acc);
                  const usageCount = usedByActiveFormulas.length;

                  return (
                    <div
                      key={acc.id}
                      data-testid={`accord-compact-row-${acc.id}`}
                      className="rounded-xl bg-[#111621] border border-slate-800/80 px-5 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:border-slate-700/80 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-normal text-white">
                            {acc.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded bg-[#0B0E14] border border-slate-800 text-[11px] text-slate-300">
                            {acc.category}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono-tabular text-emerald-300">
                            {acc.activeVersionLabel || 'V1'} ({verCount} rev)
                          </span>
                          <span
                            data-testid={`accord-usage-badge-${acc.id}`}
                            title={
                              usageCount > 0
                                ? `Used in active formulas: ${usedByActiveFormulas
                                    .map((f) => f.name)
                                    .join(', ')}`
                                : 'Not currently used in any active formula'
                            }
                            className={`px-2 py-0.5 rounded text-[11px] font-mono-tabular border ${
                              usageCount > 0
                                ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                                : 'bg-[#0B0E14] border-slate-800 text-slate-400'
                            }`}
                          >
                            Usage: {usageCount} active {usageCount === 1 ? 'formula' : 'formulas'}
                          </span>
                          <span
                            className={`text-[11px] font-mono-tabular ${
                              isNormalized ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            Total: {totalPct.toFixed(1)}%
                          </span>
                        </div>

                        {/* Compact Inline Ingredient Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {acc.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-[#0B0E14] border border-slate-800/90 text-xs text-slate-200 font-normal"
                            >
                              {item.materialName}{' '}
                              <span className="font-mono-tabular text-emerald-400">
                                {item.percentage}%
                              </span>
                              {item.dilutionPercent < 100 && (
                                <span className="text-[10px] text-slate-400 ml-1">
                                  @{item.dilutionPercent}%
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Compact Row Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => handleLoadAccordIntoBuilder(acc)}
                          className="px-3 py-1.5 rounded-lg bg-[#0B0E14] hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-normal transition-colors"
                        >
                          History & Edit
                        </button>
                        <div className="flex items-center gap-1">
                          {[5, 10, 15].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() =>
                                setCardInsertDosage((prev) => ({
                                  ...prev,
                                  [acc.id]: g,
                                }))
                              }
                              className={`px-2 py-1 rounded text-[11px] font-mono-tabular border transition-colors ${
                                insertGrams === g
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-[#0B0E14] text-slate-400 border-slate-800 hover:text-slate-200'
                              }`}
                            >
                              {g}g
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => openTargetFormulaModalForAccord(acc, insertGrams)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-normal rounded-lg transition-colors whitespace-nowrap"
                        >
                          Insert into Formula
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* DETAILED CARDS VIEW FOR ACCORDS */
              <div className="grid grid-cols-1 gap-6">
                {accords.map((acc) => {
                  const totalPct = acc.items.reduce(
                    (s, it) => s + (Number(it.percentage) || 0),
                    0
                  );
                  const isNormalized = Math.abs(totalPct - 100) <= 0.5;
                  const insertGrams = cardInsertDosage[acc.id] ?? 10;
                  const isCardPickerOpen = cardOpenDropdownId === acc.id;
                  const cardQuery = (cardSearchQuery[acc.id] || '').trim().toLowerCase();
                  const cardFilteredMaterials = materials.filter(
                    (m) =>
                      !cardQuery ||
                      m.name.toLowerCase().includes(cardQuery) ||
                      m.primaryFamily.toLowerCase().includes(cardQuery) ||
                      m.volatility.toLowerCase().includes(cardQuery)
                  );
                  const verCount = getAccordVersions(acc).length;
                  const usedByActiveFormulas = getActiveFormulasUsingAccord(acc);
                  const usageCount = usedByActiveFormulas.length;

                  return (
                    <div
                      key={acc.id}
                      data-testid={`accord-card-${acc.id}`}
                      className="rounded-xl bg-[#111621] border border-slate-800/70 p-6 flex flex-col justify-between space-y-5"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#0B0E14] border border-slate-800 text-slate-300">
                              {acc.category} · {acc.isEducational ? 'Classical Base' : 'Custom Accord'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono-tabular">
                              {acc.activeVersionLabel || 'V1'} ({verCount} rev)
                            </span>
                            <span
                              data-testid={`accord-usage-badge-${acc.id}`}
                              title={
                                usageCount > 0
                                  ? `Used in active formulas: ${usedByActiveFormulas
                                      .map((f) => f.name)
                                      .join(', ')}`
                                  : 'Not currently used in any active formula'
                              }
                              className={`px-2.5 py-0.5 rounded-md font-mono-tabular border ${
                                usageCount > 0
                                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                                  : 'bg-[#0B0E14] border-slate-800 text-slate-400'
                              }`}
                            >
                              Usage: {usageCount} active {usageCount === 1 ? 'formula' : 'formulas'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono-tabular">
                              {acc.items.length} Notes · Total:{' '}
                              <span
                                className={
                                  isNormalized ? 'text-emerald-400' : 'text-amber-400'
                                }
                              >
                                {totalPct.toFixed(1)}%
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleLoadAccordIntoBuilder(acc)}
                              className="text-emerald-400 hover:text-emerald-300 transition-colors text-[11px]"
                            >
                              History & Load in Form
                            </button>
                            {onDeleteAccord && (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteAccord(acc.id);
                                  setToastMsg(`Deleted accord "${acc.name}"`);
                                  setTimeout(() => setToastMsg(null), 2500);
                                }}
                                title="Delete Accord"
                                className="text-slate-400 hover:text-rose-400 transition-colors text-[11px]"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>

                        <h3 className="text-lg font-normal text-white mt-2">{acc.name}</h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed font-normal">
                          {acc.description}
                        </p>
                        {acc.objective && (
                          <p className="text-[11px] text-slate-400 mt-1 font-normal">
                            <span className="text-slate-300">Objective:</span> {acc.objective}
                          </p>
                        )}

                        {/* Interactive Ingredient Ratio List */}
                        <div className="mt-5 pt-4 border-t border-slate-800/70 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-slate-300 font-normal">
                              Accord Ingredients & Proportions
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleCommitAccordVersion(
                                    acc,
                                    acc.items,
                                    `Snapshot saved from card (${acc.items.length} notes)`
                                  )
                                }
                                className="px-2.5 py-1 rounded bg-[#0B0E14] hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] font-normal transition-colors"
                              >
                                + Save Version (V{verCount + 1})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleNormalizeCard(acc)}
                                className="px-2.5 py-1 rounded bg-[#0B0E14] hover:bg-slate-800 text-emerald-400 border border-slate-800 text-[11px] font-normal transition-colors"
                              >
                                Normalize to 100%
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {acc.items.map((item, idx) => {
                              const matMeta = materials.find((m) => m.id === item.materialId);
                              return (
                                <div
                                  key={idx}
                                  className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-[#0B0E14] border border-slate-800/80 rounded-lg px-3 py-2 text-xs"
                                >
                                  {/* Readable Material Label & Tier Badge */}
                                  <div className="flex items-center gap-2 min-w-[140px] flex-1">
                                    <span className="text-slate-100 font-normal truncate">
                                      {item.materialName}
                                    </span>
                                    {matMeta && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] border shrink-0 ${getVolatilityBadgeClass(
                                          matMeta.volatility
                                        )}`}
                                      >
                                        {matMeta.volatility.replace(' Note', '')}
                                      </span>
                                    )}
                                  </div>

                                  {/* Editable Percentage Input */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step="any"
                                      aria-label={`${item.materialName} percentage`}
                                      value={item.percentage}
                                      onChange={(e) =>
                                        handleUpdateCardItem(acc, idx, {
                                          percentage: Math.max(
                                            0,
                                            Math.min(100, Number(e.target.value))
                                          ),
                                        })
                                      }
                                      className="w-16 bg-[#111621] border border-slate-800 rounded px-2 py-1 text-right font-mono-tabular text-emerald-400 text-xs"
                                    />
                                    <span className="text-slate-400 text-[11px]">%</span>
                                  </div>

                                  {/* Editable Dilution Input */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-slate-400 text-[10px]">@</span>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      step="any"
                                      aria-label={`${item.materialName} dilution`}
                                      value={item.dilutionPercent}
                                      onChange={(e) =>
                                        handleUpdateCardItem(acc, idx, {
                                          dilutionPercent: Math.min(
                                            100,
                                            Math.max(0.1, Number(e.target.value))
                                          ),
                                        })
                                      }
                                      className="w-14 bg-[#111621] border border-slate-800 rounded px-1.5 py-1 text-right font-mono-tabular text-slate-300 text-[11px]"
                                    />
                                    <span className="text-slate-400 text-[10px]">% conc</span>
                                  </div>

                                  {/* Remove Line Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCardItem(acc, idx)}
                                    title="Remove ingredient from accord"
                                    className="px-1.5 py-0.5 text-slate-400 hover:text-rose-400 transition-colors"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Custom High-Contrast Search-and-Select Note Adder Inside Card */}
                          <div className="pt-1 relative">
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  aria-label={`Search note to add to ${acc.name}`}
                                  value={cardSearchQuery[acc.id] || ''}
                                  onFocus={() => setCardOpenDropdownId(acc.id)}
                                  onChange={(e) => {
                                    setCardSearchQuery((prev) => ({
                                      ...prev,
                                      [acc.id]: e.target.value,
                                    }));
                                    setCardOpenDropdownId(acc.id);
                                  }}
                                  placeholder="+ Search & select a note to add to this accord..."
                                  className="w-full bg-[#0B0E14] border border-slate-800 focus:border-emerald-500/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setCardOpenDropdownId((prev) =>
                                    prev === acc.id ? null : acc.id
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg bg-[#0B0E14] hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-normal whitespace-nowrap transition-colors"
                              >
                                {isCardPickerOpen ? 'Close ▲' : 'Select Note ▼'}
                              </button>
                            </div>

                            {isCardPickerOpen && (
                              <div className="mt-1.5 rounded-xl bg-[#0B0E14] border border-slate-700 shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800/70 z-20">
                                {cardFilteredMaterials.map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleAddCardMaterialDirect(acc, m)}
                                    className="w-full text-left px-3.5 py-2 hover:bg-slate-800/80 flex items-center justify-between gap-2 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-xs text-white font-normal truncate">
                                        {m.name}
                                      </span>
                                      <span className="text-[11px] text-slate-400 truncate">
                                        ({m.primaryFamily} · {m.volatility.replace(' Note', '')})
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-emerald-400 shrink-0">
                                      + Add
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Dosage Picker + Insert into Active Formula */}
                      <div className="pt-4 border-t border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>Dose in Formula:</span>
                          <div className="flex items-center gap-1">
                            {[2, 5, 10, 15, 20].map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() =>
                                  setCardInsertDosage((prev) => ({
                                    ...prev,
                                    [acc.id]: g,
                                  }))
                                }
                                className={`px-2 py-1 rounded text-[11px] font-mono-tabular border transition-colors ${
                                  insertGrams === g
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-[#0B0E14] text-slate-400 border-slate-800 hover:text-slate-200'
                                }`}
                              >
                                {g}g
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openTargetFormulaModalForAccord(acc, insertGrams)}
                          className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-normal rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center"
                        >
                          Insert into Formula
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {renderTargetFormulaModal()}
      </div>
    );
  }

  // 3. RAW MATERIALS LIBRARY MODE (Default)
  const filteredMaterials = materials.filter((m) => {
    const matchFam =
      familyFilter === 'All' ||
      m.primaryFamily.toLowerCase() === familyFilter.toLowerCase();
    const matchOrig =
      originFilter === 'All' ||
      m.naturalOrSynthetic.toLowerCase() === originFilter.toLowerCase();
    const matchQ =
      !searchQuery.trim() ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.casNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.facets.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchFam && matchOrig && matchQ;
  });

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-emerald-950 border border-emerald-600 px-4 py-2.5 text-xs text-emerald-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Step 1 Workflow Orientation Banner */}
      <div className="rounded-lg bg-[#111621] border border-slate-800/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="font-semibold text-white">
              Formula Development Route · Step 1: Raw Materials Palette
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              The perfumer's organ of individual aroma chemicals and natural absolutes. Inspect notes, then click <span className="text-emerald-400 font-medium">"Add to Formula"</span> to start or enrich a formula project, or combine notes into an <span className="text-slate-300 font-medium">Accord</span>.
            </p>
          </div>
        </div>
        {selectedMaterial && (
          <button
            type="button"
            onClick={() => openTargetFormulaModalForMaterial(selectedMaterial, 2)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-normal transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add "{selectedMaterial.name}" to Formula...</span>
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-white">
            Raw Material Encyclopedia & Usage Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Scientific identity, personal olfactory perceptions, historical formulation effectiveness, and authoritative IFRA limits.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddMaterialModal(true)}
          className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 self-start whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Raw Material
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Searchable Raw Material Organ List */}
        <div className="lg:col-span-4 rounded-lg bg-[#111621] border border-slate-800 p-4 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, CAS, or facet..."
              aria-label="Search raw materials"
              className="w-full bg-[#0B0E14] border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              aria-label="Filter by Olfactory Family"
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value)}
              className="flex-1 bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-slate-300"
            >
              <option value="All">All Families</option>
              {OLFACTORY_WHEEL_FAMILIES.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by Natural or Synthetic"
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="bg-[#0B0E14] border border-slate-800 rounded px-2 py-1 text-slate-300"
            >
              <option value="All">All Origins</option>
              <option value="Natural">Natural</option>
              <option value="Synthetic">Synthetic</option>
            </select>
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {filteredMaterials.map((mat) => {
              const isSelected = mat.id === selectedMaterial?.id;
              return (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => onSelectMaterial(mat.id)}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-600/60 text-white'
                      : 'bg-[#0B0E14] border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{mat.name}</span>
                    <span className="text-[11px] font-mono-tabular text-emerald-400">
                      {mat.volatility}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono-tabular">
                    <span>
                      {mat.primaryFamily} · {mat.naturalOrSynthetic}
                    </span>
                    <span>CAS {mat.casNumber}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Comprehensive Material Dossier */}
        {selectedMaterial && (
          <div className="lg:col-span-8 space-y-5">
            {/* 1. Identity & Olfactory Profile */}
            <div className="rounded-lg bg-[#111621] border border-slate-800 p-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs text-slate-400 font-mono-tabular">
                    {selectedMaterial.primaryFamily} Family · {selectedMaterial.naturalOrSynthetic} ·{' '}
                    {selectedMaterial.volatility} Note · CAS {selectedMaterial.casNumber}
                  </div>
                  <h2 className="text-2xl font-sans font-semibold text-white mt-1">
                    {selectedMaterial.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aliases: {selectedMaterial.aliases || 'None'} · INCI: {selectedMaterial.inciName}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openTargetFormulaModalForMaterial(selectedMaterial, 2)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-normal transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Formula...</span>
                  </button>
                  <div className="text-right font-mono-tabular text-xs text-slate-300">
                    <div>Supplier: {selectedMaterial.supplier || 'Standard'}</div>
                    <div className="text-slate-400 mt-0.5">
                      Substantivity: {selectedMaterial.substantivityHours} h
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed mt-4">
                {selectedMaterial.descriptiveNotes}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Facets</span>
                  <span className="text-white font-medium">
                    {selectedMaterial.facets.join(' · ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Intensity & Diffusion</span>
                  <span className="text-white font-mono-tabular">
                    {selectedMaterial.intensity}/10 · Diff {selectedMaterial.diffusion}/10
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Texture & Temp</span>
                  <span className="text-white">
                    {selectedMaterial.texture} ({selectedMaterial.temperatureImpression})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Density & Flash Pt</span>
                  <span className="text-white font-mono-tabular">
                    {selectedMaterial.density} g/cm³ ·{' '}
                    {selectedMaterial.flashPointCelsius
                      ? `${selectedMaterial.flashPointCelsius}°C`
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            {/* Dossier Sub-Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-1.5 p-1.5 bg-[#0B0E14] border border-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setMaterialSubTab('profile')}
                className={`px-3.5 py-2 rounded-md font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
                  materialSubTab === 'profile'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Profile & Study Notes</span>
              </button>
              <button
                type="button"
                onClick={() => setMaterialSubTab('regulatory')}
                className={`px-3.5 py-2 rounded-md font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
                  materialSubTab === 'regulatory'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Regulatory Compliance (IFRA 51)</span>
              </button>
              <button
                type="button"
                onClick={() => setMaterialSubTab('usage')}
                className={`px-3.5 py-2 rounded-md font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
                  materialSubTab === 'usage'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Formula Usage ({materialUsageList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMaterialSubTab('memory')}
                className={`px-3.5 py-2 rounded-md font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
                  materialSubTab === 'memory'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Sensory Memory Profile</span>
              </button>
            </div>

            {/* TAB 1: PROFILE & STUDY NOTES */}
            {materialSubTab === 'profile' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {educationalPromptsEnabled && (
                    <div className="rounded-lg bg-[#111621] border border-slate-800 p-5">
                      <h3 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Things to Observe (Perfumery School Study)
                      </h3>
                      <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                        {selectedMaterial.educationalObserve.map((obs, i) => (
                          <li key={i} className="leading-relaxed">
                            {obs}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-lg bg-[#111621] border border-slate-800 p-5">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-1.5 mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Potential Complements & Structural Contrasts
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          Harmonious Complements (Synergy & Bridging):
                        </span>
                        <span className="text-emerald-300 font-medium">
                          {selectedMaterial.complements.join(' · ') || 'Hedione · Bergamot FCF'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-slate-400 block text-[11px]">
                          Creative Contrasts (Tension & Counterpoint):
                        </span>
                        <span className="text-amber-300 font-medium">
                          {selectedMaterial.contrasts.join(' · ') || 'Vetiver Haiti EO'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Regulatory Summary Snippet */}
                <div className="rounded-lg bg-[#111621] border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-white">Authoritative IFRA Status: </span>
                    <span className="text-slate-300">
                      {selectedLimit?.amendmentStatus || 'IFRA 51st Amendment'} ·{' '}
                      {selectedLimit?.maxAllowedPercent !== null && selectedLimit?.maxAllowedPercent !== undefined
                        ? `Cat 4 Limit: ${selectedLimit.maxAllowedPercent}%`
                        : 'Safety info unavailable'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMaterialSubTab('regulatory')}
                    className="text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap shrink-0 flex items-center gap-1"
                  >
                    View Full Regulatory Compliance Table →
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: DEDICATED REGULATORY COMPLIANCE SUB-VIEW */}
            {materialSubTab === 'regulatory' && (
              <div className="space-y-5">
                {/* 1. Substance Identification & IFRA 51 Amendment Header */}
                <div className="rounded-lg bg-[#111621] border border-slate-800 p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono-tabular text-emerald-400 font-medium">
                          {selectedLimit?.amendmentStatus || 'IFRA 51st Amendment (2023)'}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-mono-tabular font-medium ${
                            selectedLimit?.restrictionType === 'RESTRICTION'
                              ? 'bg-amber-950/60 border border-amber-700/60 text-amber-300'
                              : selectedLimit?.restrictionType === 'SPECIFICATION'
                              ? 'bg-blue-950/60 border border-blue-700/60 text-blue-300'
                              : selectedLimit?.restrictionType === 'PROHIBITION'
                              ? 'bg-rose-950/60 border border-rose-700/60 text-rose-300'
                              : selectedLimit?.maxAllowedPercent === null
                              ? 'bg-rose-950/40 border border-rose-700 text-rose-300'
                              : 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300'
                          }`}
                        >
                          {selectedLimit?.restrictionType || (selectedLimit?.maxAllowedPercent === null ? 'UNVERIFIED' : 'CONFORMS')}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mt-1">
                        Regulatory Compliance Dossier: {selectedMaterial.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        CAS: {selectedMaterial.casNumber} · EC/EINECS: {selectedLimit?.ecNumber || 'Listed'} · INCI: {selectedMaterial.inciName}
                      </p>
                    </div>

                    <div className="text-right text-xs font-mono-tabular text-slate-300 shrink-0">
                      <div>IFRA Cat 4 (Fine Fragrance):</div>
                      <div className="text-lg font-bold text-emerald-400 mt-0.5">
                        {selectedLimit && selectedLimit.maxAllowedPercent !== null
                          ? `${selectedLimit.maxAllowedPercent.toFixed(2)}%`
                          : 'Manual Check Req.'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {selectedLimit?.effectiveDate ? `Effective: ${selectedLimit.effectiveDate}` : 'Source: Official Dossier'}
                      </div>
                    </div>
                  </div>

                  {/* Primary Hazard & Legal Restriction Statement */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded bg-[#0B0E14] border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 block font-medium">
                        Primary Toxicological Hazard / Rationale:
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        {selectedLimit?.primaryHazard || 'Skin Sensitization & Phototoxic Evaluation'}
                      </p>
                    </div>
                    <div className="p-3 rounded bg-[#0B0E14] border border-slate-800 space-y-1">
                      <span className="text-[11px] text-slate-400 block font-medium">
                        Specific IFRA Restriction / Specification:
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        {selectedLimit?.restrictions || 'No quantitative restriction recorded in Category 4.'}
                      </p>
                    </div>
                  </div>

                  {selectedLimit?.isDemoData && (
                    <div className="p-3 rounded bg-amber-950/30 border border-amber-800/60 flex items-start gap-2 text-xs text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        Regulatory values are verified against the IFRA 51st Amendment educational standard dataset. Always confirm commercial lots against official supplier Certificate of Analysis (CoA) and IFRA Conformity Certificate.
                      </span>
                    </div>
                  )}

                  {selectedLimit?.maxAllowedPercent === null && (
                    <div className="p-4 rounded bg-rose-950/40 border border-rose-800/80 flex items-start gap-3 text-xs text-rose-200">
                      <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-semibold text-white">
                          Safety information unavailable. Manual verification required.
                        </div>
                        <p className="leading-relaxed text-rose-300">
                          No quantitative limits, allergen profile, or IFRA certificate of conformity have been recorded in the local database for {selectedMaterial.name}. Do not compound for dermal application until official supplier SDS is obtained.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Restricted Use Levels Data Table Across IFRA Product Categories */}
                {selectedLimit?.categoryLimitsTable && selectedLimit.categoryLimitsTable.length > 0 && (
                  <div className="rounded-lg bg-[#111621] border border-slate-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-emerald-400" />
                          Maximum Permitted Concentration Across IFRA Categories (51st Amendment)
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Maximum permitted weight concentration in finished commercial end-products.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded border border-slate-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-[#0B0E14] text-[11px] text-slate-400">
                            <th className="py-2.5 px-3.5 font-medium">Category</th>
                            <th className="py-2.5 px-3.5 font-medium">Application Product Class</th>
                            <th className="py-2.5 px-3.5 font-medium text-right">Maximum Permitted %</th>
                            <th className="py-2.5 px-3.5 font-medium">Exposure Route / Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 font-mono-tabular">
                          {selectedLimit.categoryLimitsTable.map((cat) => {
                            const isFineFragrance = cat.category === 'Cat 4';
                            return (
                              <tr
                                key={cat.category}
                                className={`transition-colors ${
                                  isFineFragrance
                                    ? 'bg-emerald-950/20 font-semibold'
                                    : 'hover:bg-slate-800/30'
                                }`}
                              >
                                <td className="py-2.5 px-3.5 text-emerald-400">
                                  {cat.category}
                                </td>
                                <td className="py-2.5 px-3.5 font-sans font-medium text-white">
                                  {cat.categoryName} {isFineFragrance && '(Active Focus)'}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-semibold text-white">
                                  {cat.maxAllowedPercent !== null
                                    ? `${cat.maxAllowedPercent.toFixed(2)}%`
                                    : 'Not Permitted / Restricted'}
                                </td>
                                <td className="py-2.5 px-3.5 font-sans text-slate-400 text-[11px]">
                                  {cat.description}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. Allergen Concentrations Data Table (EU 1223/2009 & IFRA Annex) */}
                {selectedLimit?.allergenBreakdown && selectedLimit.allergenBreakdown.length > 0 && (
                  <div className="rounded-lg bg-[#111621] border border-slate-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          Regulated Fragrance Allergens & Constituent Breakdown (EU 1223/2009)
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Concentrations triggering mandatory on-pack cosmetic ingredient declaration (&gt; 0.001% leave-on / &gt; 0.01% rinse-off).
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded border border-slate-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-[#0B0E14] text-[11px] text-slate-400">
                            <th className="py-2.5 px-3.5 font-medium">Allergen Constituent</th>
                            <th className="py-2.5 px-3.5 font-medium">CAS Number</th>
                            <th className="py-2.5 px-3.5 font-medium text-right">Typical % in Material</th>
                            <th className="py-2.5 px-3.5 font-medium text-right">Declaration Threshold</th>
                            <th className="py-2.5 px-3.5 font-medium">Toxicological Risk / Sensitization Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {selectedLimit.allergenBreakdown.map((alg) => (
                            <tr key={alg.name} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-3.5 font-medium text-white">{alg.name}</td>
                              <td className="py-2.5 px-3.5 font-mono-tabular text-slate-400">{alg.casNumber}</td>
                              <td className="py-2.5 px-3.5 text-right font-mono-tabular font-semibold text-emerald-400">
                                {alg.typicalPercent.toFixed(2)}%
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-mono-tabular text-slate-300">
                                {alg.euThresholdPercent}% (10 ppm)
                              </td>
                              <td className="py-2.5 px-3.5 text-slate-300 text-[11px] leading-relaxed">
                                {alg.riskNote}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. Chemical Specifications & Purity Requirements */}
                {selectedLimit?.puritySpecifications && selectedLimit.puritySpecifications.length > 0 && (
                  <div className="rounded-lg bg-[#111621] border border-slate-800 p-5 space-y-3">
                    <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      IFRA Quality & Purity Specifications
                    </h4>
                    <div className="overflow-x-auto rounded border border-slate-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-[#0B0E14] text-[11px] text-slate-400">
                            <th className="py-2.5 px-3.5 font-medium">Specification Parameter</th>
                            <th className="py-2.5 px-3.5 font-medium">Standard Limit</th>
                            <th className="py-2.5 px-3.5 font-medium">Test Protocol</th>
                            <th className="py-2.5 px-3.5 font-medium">Compounding & Handling Requirement</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                          {selectedLimit.puritySpecifications.map((spec) => (
                            <tr key={spec.parameter} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-3.5 font-medium text-white">{spec.parameter}</td>
                              <td className="py-2.5 px-3.5 font-mono-tabular font-semibold text-amber-300">
                                {spec.standardLimit}
                              </td>
                              <td className="py-2.5 px-3.5 font-mono-tabular text-slate-400">{spec.testMethod}</td>
                              <td className="py-2.5 px-3.5 text-slate-300 text-[11px]">{spec.complianceRequirement}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FORMULA USAGE INTELLIGENCE */}
            {materialSubTab === 'usage' && (
              <div className="rounded-lg bg-[#111621] border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                    Material Usage Intelligence — Used In ({materialUsageList.length} Formulations)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Historical dosage & empirical effectiveness
                  </span>
                </div>

                {materialUsageList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Not yet used in any saved formula versions. Add {selectedMaterial.name} in Formula Lab to track historical performance.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {materialUsageList.map((u, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded bg-[#0B0E14] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {u.formulaName} ({u.versionLabel})
                            </span>
                            <span className="font-mono-tabular text-emerald-400 font-semibold">
                              {u.percentage}%
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="font-mono-tabular text-amber-300">
                              Effectiveness: {u.effectiveness}/10
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Observation: {u.observation}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenFormula(u.formulaId, u.versionLabel)}
                          className="text-emerald-400 hover:text-emerald-300 text-[11px] font-medium whitespace-nowrap shrink-0"
                        >
                          Inspect Formula →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PERSONAL SENSORY MEMORY */}
            {materialSubTab === 'memory' && (
              <div className="rounded-lg bg-[#111621] border border-slate-800 p-5 space-y-4 text-xs">
                <h3 className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  My Personal Sensory Memory & Perception Profile
                </h3>
                {selectedMemory ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded bg-[#0B0E14] border border-slate-800">
                        <span className="text-slate-400 block text-[11px]">Personal Descriptors</span>
                        <span className="text-white font-medium mt-0.5 block">
                          {selectedMemory.myPerception.join(' · ')}
                        </span>
                      </div>
                      <div className="p-3 rounded bg-[#0B0E14] border border-slate-800">
                        <span className="text-slate-400 block text-[11px]">Associated Memory</span>
                        <span className="text-slate-200 mt-0.5 block">
                          {selectedMemory.associatedMemories.join(' · ')}
                        </span>
                      </div>
                      <div className="p-3 rounded bg-[#0B0E14] border border-slate-800">
                        <span className="text-slate-400 block text-[11px]">Emotional Tone</span>
                        <span className="text-emerald-300 mt-0.5 block">
                          {selectedMemory.emotions.join(' · ')}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between gap-2 font-mono-tabular text-[11px]">
                      <span>Olfactory Intensity: {selectedMemory.strengthScore}/10</span>
                      <span>Familiarity: {selectedMemory.familiarityScore}/10</span>
                      <span>Blind Smell Confidence: {selectedMemory.blindConfidenceScore}/10</span>
                      <span>
                        Trials: {selectedMemory.recognitionCorrect} / {selectedMemory.recognitionTrials} (
                        {selectedMemory.recognitionTrials > 0
                          ? Math.round(
                              (selectedMemory.recognitionCorrect / selectedMemory.recognitionTrials) * 100
                            )
                          : 0}
                        %)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 py-4 text-center">
                    <p className="text-slate-400">
                      No personal sensory memory recorded yet for {selectedMaterial.name}.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        onSaveScentMemory({
                          materialId: selectedMaterial.id,
                          myPerception: selectedMaterial.facets,
                          associatedMemories: ['Studio blotter study'],
                          emotions: ['Focused', 'Curious'],
                          mentalImages: selectedMaterial.descriptiveNotes,
                          places: 'Perfumery School Organ',
                          colors: '#10B981',
                          textures: selectedMaterial.texture,
                          temperature: selectedMaterial.temperatureImpression,
                          strengthScore: selectedMaterial.intensity,
                          familiarityScore: 7,
                          blindConfidenceScore: 6,
                          recognitionTrials: 1,
                          recognitionCorrect: 1,
                        })
                      }
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
                    >
                      Initialize Personal Sensory Profile
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Raw Material Modal */}
      {showAddMaterialModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleCreateMaterialSubmit}
            className="w-full max-w-lg rounded-lg bg-[#111621] border border-slate-800 p-6 space-y-4 text-xs"
          >
            <h3 className="text-base font-semibold text-white">
              Add Raw Material to Encyclopedia
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Material Name *</label>
                <input
                  type="text"
                  required
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="e.g., Frankincense Carterii EO"
                  className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">CAS Number</label>
                <input
                  type="text"
                  value={matCas}
                  onChange={(e) => setMatCas(e.target.value)}
                  placeholder="e.g., 8016-36-2 or Unknown"
                  className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 font-mono-tabular text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Natural / Synthetic</label>
                <select
                  value={matOrigin}
                  onChange={(e) =>
                    setMatOrigin(e.target.value as 'Natural' | 'Synthetic' | 'Base')
                  }
                  className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 text-white"
                >
                  <option value="Natural">Natural</option>
                  <option value="Synthetic">Synthetic</option>
                  <option value="Base">Base</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Primary Family</label>
                <select
                  value={matFamily}
                  onChange={(e) => setMatFamily(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 text-white"
                >
                  {OLFACTORY_WHEEL_FAMILIES.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Volatility Tier</label>
                <select
                  value={matVolatility}
                  onChange={(e) => setMatVolatility(e.target.value as VolatilityTier)}
                  className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 text-white"
                >
                  <option value="Top">Top</option>
                  <option value="Top-Heart">Top-Heart</option>
                  <option value="Heart">Heart</option>
                  <option value="Heart-Base">Heart-Base</option>
                  <option value="Base">Base</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Supplier</label>
                <input
                  type="text"
                  value={matSupplier}
                  onChange={(e) => setMatSupplier(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  IFRA Cat 4 Max % (Leave blank if unknown)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={matIfraMax}
                  onChange={(e) => setMatIfraMax(e.target.value)}
                  placeholder="Unknown / Not Provided"
                  className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 font-mono-tabular text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">IFRA Document Source</label>
                <input
                  type="text"
                  value={matIfraSource}
                  onChange={(e) => setMatIfraSource(e.target.value)}
                  placeholder="e.g., Supplier SDS 2026"
                  className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Sensory & Descriptive Notes</label>
              <textarea
                rows={2}
                value={matNotes}
                onChange={(e) => setMatNotes(e.target.value)}
                placeholder="Describe odor profile, texture, and evaporation behavior..."
                className="w-full bg-[#0B0E14] border border-slate-800 rounded px-2.5 py-2 text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMaterialModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-md"
              >
                Save Raw Material
              </button>
            </div>
          </form>
        </div>
      )}
      {renderTargetFormulaModal()}
    </div>
  );
};
