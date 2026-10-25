import React, { useState, useMemo } from 'react';
import {
  AccordDefinition,
  Formula,
  MacroFamily,
  OlfactoryFamilyDef,
  RawMaterial,
  SensoryEvaluation,
} from '../domain/types';
import { OLFACTORY_WHEEL_FAMILIES } from '../domain/seed-data';
import { Plus, Layers, Compass, ArrowRight, Radar } from 'lucide-react';
import { motion } from 'framer-motion';

interface OlfactoryWheelViewProps {
  mode: 'wheel' | 'hierarchy';
  formulas: Formula[];
  activeFormula: Formula;
  materials: RawMaterial[];
  accords: AccordDefinition[];
  evaluations: SensoryEvaluation[];
  onUpdateTargetFacets: (formulaId: number, updatedFacets: Record<string, number>) => void;
  onSelectMaterial: (materialId: number) => void;
  onSelectFormula: (formulaId: number) => void;
}

interface MacroFamilyMeta {
  id: MacroFamily;
  name: string;
  tagline: string;
  color: string;
  bgLight: string;
  borderStroke: string;
}

const MACRO_GROUPS: MacroFamilyMeta[] = [
  {
    id: 'Floral',
    name: 'Floral',
    tagline: 'Blossoms, powdery aldehydes & airy musks',
    color: '#F43F5E',
    bgLight: 'rgba(244, 63, 94, 0.16)',
    borderStroke: '#F43F5E',
  },
  {
    id: 'Amber',
    name: 'Amber',
    tagline: 'Warm resins, spices, ambergris & gourmand',
    color: '#F97316',
    bgLight: 'rgba(249, 115, 22, 0.16)',
    borderStroke: '#F97316',
  },
  {
    id: 'Woody',
    name: 'Woody',
    tagline: 'Cedar, sandalwood, mossy chypres & leather',
    color: '#A16207',
    bgLight: 'rgba(161, 98, 7, 0.16)',
    borderStroke: '#A16207',
  },
  {
    id: 'Fresh',
    name: 'Fresh',
    tagline: 'Citrus peel, green leaves, marine & aromatics',
    color: '#10B981',
    bgLight: 'rgba(16, 185, 129, 0.16)',
    borderStroke: '#10B981',
  },
];

// Aligned clockwise radar axes matching all 14 sectors of the Michael Edwards wheel:
export const RADAR_AXES_CLOCKWISE = [
  { id: 'floral', name: 'Floral', angleDeg: -167.14, macro: 'Floral', aliases: ['Jasmine', 'Rose', 'Floral'] },
  { id: 'soft-floral', name: 'Soft Floral', angleDeg: -141.43, macro: 'Floral', aliases: ['Musky', 'Aldehydic', 'Powdery', 'Soft Floral'] },
  { id: 'floral-amber', name: 'Floral Amber', angleDeg: -115.71, macro: 'Floral', aliases: ['Solar', 'Orange Blossom', 'Floral Amber'] },
  { id: 'soft-amber', name: 'Soft Amber', angleDeg: -90.00, macro: 'Amber', aliases: ['Spicy', 'Incense', 'Cardamom', 'Soft Amber'] },
  { id: 'amber', name: 'Amber', angleDeg: -64.29, macro: 'Amber', aliases: ['Ambroxan', 'Resinous', 'Balsamic', 'Amber'] },
  { id: 'woody-amber', name: 'Woody Amber', angleDeg: -38.57, macro: 'Amber', aliases: ['Sweet', 'Tonka', 'Gourmand', 'Woody Amber'] },
  { id: 'woods', name: 'Woods', angleDeg: -12.86, macro: 'Woody', aliases: ['Woody', 'Cedar', 'Sandalwood', 'Woods'] },
  { id: 'mossy-woods', name: 'Mossy Woods', angleDeg: 12.86, macro: 'Woody', aliases: ['Mossy', 'Chypre', 'Oakmoss', 'Mossy Woods'] },
  { id: 'dry-woods', name: 'Dry Woods', angleDeg: 38.57, macro: 'Woody', aliases: ['Earthy', 'Leather', 'Smoky', 'Tobacco', 'Dry Woods'] },
  { id: 'aromatic', name: 'Aromatic', angleDeg: 64.29, macro: 'Fresh', aliases: ['Fougère', 'Lavender', 'Herbal', 'Aromatic'] },
  { id: 'citrus', name: 'Citrus', angleDeg: 90.00, macro: 'Fresh', aliases: ['Bergamot', 'Lemon', 'Mandarin', 'Citrus'] },
  { id: 'water', name: 'Water', angleDeg: 115.71, macro: 'Fresh', aliases: ['Marine', 'Aquatic', 'Ozonic', 'Mineral', 'Water'] },
  { id: 'green', name: 'Green', angleDeg: 141.43, macro: 'Fresh', aliases: ['Galbanum', 'Leafy', 'Cut Grass', 'Green'] },
  { id: 'fruity', name: 'Fruity', angleDeg: 167.14, macro: 'Fresh', aliases: ['Cassis', 'Peach', 'Pear', 'Apple', 'Berry', 'Fruity'] },
];

export const getFacetScore = (
  profile: Record<string, number>,
  axis: (typeof RADAR_AXES_CLOCKWISE)[number]
): number => {
  if (profile[axis.name] !== undefined) return profile[axis.name];
  if (profile[axis.id] !== undefined) return profile[axis.id];
  for (const al of axis.aliases) {
    if (profile[al] !== undefined) return profile[al];
  }
  return 0;
};

// Maps each of the 14 Michael Edwards wheel families to related material/accord family tags
const FAMILY_MATCH_ALIASES: Record<string, string[]> = {
  floral: ['floral', 'jasmine', 'rose', 'white floral'],
  'soft-floral': ['soft floral', 'aldehydic', 'musky', 'powdery'],
  'floral-amber': ['floral amber', 'orange blossom', 'solar', 'musky'],
  'soft-amber': ['soft amber', 'spicy', 'incense', 'cardamom'],
  amber: ['amber', 'resinous', 'balsamic', 'labdanum'],
  'woody-amber': ['woody amber', 'gourmand', 'sweet', 'tonka', 'patchouli'],
  woods: ['woods', 'woody', 'cedar', 'sandalwood'],
  'mossy-woods': ['mossy woods', 'mossy', 'earthy', 'chypre', 'oakmoss'],
  'dry-woods': ['dry woods', 'leather', 'tobacco', 'smoky', 'suede'],
  aromatic: ['aromatic', 'fougère', 'lavender', 'herbal'],
  citrus: ['citrus', 'bergamot', 'lemon', 'mandarin'],
  water: ['water', 'marine', 'mineral', 'ozonic', 'aquatic'],
  green: ['green', 'galbanum', 'leafy', 'violet leaf'],
  fruity: ['fruity', 'pear', 'fig', 'cassis', 'peach'],
};

export const OlfactoryWheelView: React.FC<OlfactoryWheelViewProps> = ({
  mode,
  formulas,
  activeFormula,
  materials,
  accords,
  evaluations,
  onUpdateTargetFacets,
  onSelectMaterial,
  onSelectFormula,
}) => {
  // Allow null state when "All 14 Families" is active so no sector appears selected
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [selectedSubFacet, setSelectedSubFacet] = useState<string>('Crystalline');
  const [customSubFacets, setCustomSubFacets] = useState<Record<string, string[]>>({});
  const [newSubFacetName, setNewSubFacetName] = useState('');
  const [macroFilter, setMacroFilter] = useState<'All' | MacroFamily>('All');
  const [showRadarOverlay, setShowRadarOverlay] = useState<boolean>(true);
  const [editProfileMode, setEditProfileMode] = useState<'target' | 'result'>('target');

  const latestEval = evaluations.find((e) => e.formulaId === activeFormula.id) || evaluations[0];
  const [localResultFacets, setLocalResultFacets] = useState<Record<string, number>>(
    latestEval?.evaluatedFacets || {
      Floral: 6,
      'Soft Floral': 5,
      'Floral Amber': 4,
      'Soft Amber': 3,
      Amber: 5,
      'Woody Amber': 2,
      Woods: 8,
      'Mossy Woods': 4,
      'Dry Woods': 4,
      Aromatic: 4,
      Citrus: 5,
      Water: 6,
      Green: 8,
      Fruity: 3,
    }
  );

  const selectedFamily = selectedFamilyId
    ? OLFACTORY_WHEEL_FAMILIES.find((f) => f.id === selectedFamilyId) || null
    : null;

  const activeFamilyForSubFacets = selectedFamily || OLFACTORY_WHEEL_FAMILIES[0];

  const allSubFacetsForFamily = [
    ...activeFamilyForSubFacets.subFacets,
    ...(customSubFacets[activeFamilyForSubFacets.id] || []),
  ];

  const targetFacets = activeFormula.targetFacets || {};

  const handleScoreChange = (facetName: string, score: number) => {
    if (editProfileMode === 'target') {
      const next = { ...targetFacets, [facetName]: score };
      onUpdateTargetFacets(activeFormula.id, next);
    } else {
      setLocalResultFacets((prev) => ({ ...prev, [facetName]: score }));
    }
  };

  const handleAddCustomSubFacet = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubFacetName.trim();
    if (!trimmed || !activeFamilyForSubFacets) return;
    setCustomSubFacets((prev) => ({
      ...prev,
      [activeFamilyForSubFacets.id]: [...(prev[activeFamilyForSubFacets.id] || []), trimmed],
    }));
    setSelectedSubFacet(trimmed);
    setNewSubFacetName('');
  };

  // Build radar polygon using 14 clockwise axes aligned with the wheel sectors
  const buildRadarPolygonClockwise = (
    profile: Record<string, number>,
    maxRadius: number,
    cx: number,
    cy: number
  ) => {
    return RADAR_AXES_CLOCKWISE.map((axis) => {
      const rad = (axis.angleDeg * Math.PI) / 180;
      const val = Math.min(10, Math.max(0, getFacetScore(profile, axis)));
      const r = (val / 10) * maxRadius;
      const x = cx + r * Math.cos(rad);
      const y = cy + r * Math.sin(rad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  const selectedAliases = selectedFamily
    ? FAMILY_MATCH_ALIASES[selectedFamily.id] || [selectedFamily.name.toLowerCase()]
    : [];

  // Filter materials, accords, and formulas using canonical family aliases
  const matchingMaterials = materials.filter((m) => {
    if (!selectedFamily) return true;
    const pFam = m.primaryFamily.toLowerCase();
    return (
      selectedAliases.includes(pFam) ||
      m.facets.some((f) => {
        const lowerF = f.toLowerCase();
        return (
          lowerF.includes(selectedSubFacet.toLowerCase()) ||
          selectedAliases.some((al) => lowerF.includes(al))
        );
      })
    );
  });

  const matchingAccords = accords.filter((a) => {
    if (!selectedFamily) return true;
    const cat = a.category.toLowerCase();
    return (
      selectedAliases.some((al) => cat.includes(al)) ||
      cat === selectedSubFacet.toLowerCase() ||
      Object.keys(a.olfactoryProfile).some((k) =>
        selectedAliases.includes(k.toLowerCase())
      )
    );
  });

  const matchingFormulas = formulas.filter((f) => {
    if (!selectedFamily) return true;
    return (
      f.targetFamilies.some((fam) =>
        selectedAliases.includes(fam.toLowerCase())
      ) ||
      (f.targetFacets &&
        Object.entries(f.targetFacets).some(
          ([k, score]) => score >= 4 && selectedAliases.includes(k.toLowerCase())
        ))
    );
  });

  // Active formula distribution mapped across the 14 wheel families
  const activeFormulaFamilyWeights = useMemo(() => {
    const currentVersion =
      activeFormula.versions.find(
        (v) => v.versionLabel === activeFormula.activeVersionLabel
      ) || activeFormula.versions[0];
    const items = currentVersion?.items || [];
    const totalGrams = items.reduce((s, it) => s + it.quantityGrams, 0);
    const map: Record<string, { grams: number; pct: number; count: number }> = {};

    OLFACTORY_WHEEL_FAMILIES.forEach((fam) => {
      map[fam.id] = { grams: 0, pct: 0, count: 0 };
    });

    items.forEach((it) => {
      const mat = materials.find((m) => m.id === it.materialId);
      const primary = (mat?.primaryFamily || (it as any).role || '').toLowerCase();
      if (!primary) return;

      // Match to canonical wheel family ID
      const matchedFam =
        OLFACTORY_WHEEL_FAMILIES.find(
          (f) => f.name.toLowerCase() === primary || f.id === primary
        ) ||
        OLFACTORY_WHEEL_FAMILIES.find((f) =>
          (FAMILY_MATCH_ALIASES[f.id] || []).includes(primary)
        );

      if (matchedFam) {
        map[matchedFam.id].grams += it.quantityGrams;
        map[matchedFam.id].count += 1;
      }
    });

    Object.keys(map).forEach((k) => {
      map[k].pct = totalGrams > 0 ? (map[k].grams / totalGrams) * 100 : 0;
    });
    return map;
  }, [activeFormula, materials]);

  // Michael Edwards 14-Sector Single-Ring Wheel Geometry:
  // Center Circle: rCenterHub = 228 (diameter 456px; expanded calibration hub)
  // Single Ring of 14 Equal Wedges: rInnerSub = 236 to rOuterSub = 312 (76px slim radial thickness)
  // Curved Sub-Family Titles outside each wedge: rSubTitle = 328..335
  // Outer Aspect Border Track & Directional Arrows: rOuterTrack = 380
  const cx = 420;
  const cy = 420;
  const rCenterHub = 228;
  const rRadarMax = 175;
  const rInnerSub = 236;
  const rOuterSub = 312;
  const rOuterTrack = 380;
  const degToRad = (deg: number) => (deg * Math.PI) / 180;
  const sliceDeg = 360 / OLFACTORY_WHEEL_FAMILIES.length; // 25.7142857°

  // Outer Aspect Border Configurations matching the Michael Edwards schematic:
  // Floral: Wedges 0..2 (-180° to -102.86°)
  // Amber (AMBERY): Wedges 3..5 (-102.86° to -25.71°)
  // Woody (WOODY): Wedges 6..8 (-25.71° to +51.43°)
  // Fresh (FRESH): Wedges 9..13 (+51.43° to +180°)
  const OUTER_ASPECT_ARCS: Array<{
    macro: MacroFamily;
    displayLabel: string;
    color: string;
    startDeg: number;
    endDeg: number;
    labelStartDeg: number;
    labelEndDeg: number;
    reverseText: boolean;
  }> = [
    {
      macro: 'Floral',
      displayLabel: 'FLORAL',
      color: '#EA6E99',
      startDeg: -178.8,
      endDeg: -104.2,
      labelStartDeg: -155.0,
      labelEndDeg: -128.0,
      reverseText: false,
    },
    {
      macro: 'Amber',
      displayLabel: 'AMBERY',
      color: '#BD5C18',
      startDeg: -101.6,
      endDeg: -27.0,
      labelStartDeg: -78.5,
      labelEndDeg: -50.0,
      reverseText: false,
    },
    {
      macro: 'Woody',
      displayLabel: 'WOODY',
      color: '#AD7B3B',
      startDeg: -24.4,
      endDeg: 50.1,
      labelStartDeg: 4.0,
      labelEndDeg: 31.0,
      reverseText: true,
    },
    {
      macro: 'Fresh',
      displayLabel: 'FRESH',
      color: '#008AC5',
      startDeg: 52.7,
      endDeg: 178.8,
      labelStartDeg: 103.0,
      labelEndDeg: 129.0,
      reverseText: true,
    },
  ];

  if (mode === 'hierarchy') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-sans font-semibold text-white">
              Scent Hierarchy Explorer
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Navigate from Academic Super-Family (Floral, Amber, Woody, Fresh) → Family → Sub-Facet → Raw Materials → Accords → Formulas.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-tabular">
            <span>4 Primary Super-Families</span>
            <span aria-hidden="true">·</span>
            <span>{OLFACTORY_WHEEL_FAMILIES.length} Standard Families</span>
            <span aria-hidden="true">·</span>
            <span>{materials.length} Materials</span>
          </div>
        </div>

        {(() => {
          const academicFamily = selectedFamily || OLFACTORY_WHEEL_FAMILIES[0];
          const academicSubFacets = [
            ...academicFamily.subFacets,
            ...(customSubFacets[academicFamily.id] || []),
          ];
          return (
            <>
              {/* Academic Breadcrumb Chain */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-[#111621] border border-slate-800 text-xs">
                <span className="text-slate-400">Academic Hierarchy:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
                  {academicFamily.macroFamily} Super-Family
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-white">{academicFamily.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-semibold text-slate-300">{selectedSubFacet} Sub-Facet</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-400 font-mono-tabular">
                  {matchingMaterials.length} Raw Materials · {matchingAccords.length} Accords · {matchingFormulas.length} Formulas
                </span>
              </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column 1: 17 Olfactory Families Grouped by Super-Family */}
          <div className="lg:col-span-3 rounded-lg bg-[#111621] border border-slate-800 p-4">
            <h2 className="text-xs font-semibold text-slate-300 mb-3 flex items-center justify-between">
              <span>01. Standard Families</span>
              <span className="font-mono-tabular text-slate-400">17 Categories</span>
            </h2>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {MACRO_GROUPS.map((mg) => {
                const groupFamilies = OLFACTORY_WHEEL_FAMILIES.filter(
                  (f) => f.macroFamily === mg.id
                );
                return (
                  <div key={mg.id} className="space-y-1">
                    <div className="text-[10px] uppercase font-mono-tabular tracking-wider text-slate-400 px-2 py-0.5 border-b border-slate-800/80">
                      {mg.name} Super-Family ({groupFamilies.length})
                    </div>
                    {groupFamilies.map((fam) => {
                      const isSelected = fam.id === academicFamily.id;
                      return (
                        <button
                          key={fam.id}
                          type="button"
                          onClick={() => {
                            setSelectedFamilyId(fam.id);
                            setSelectedSubFacet(fam.subFacets[0] || fam.name);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-slate-800 text-white font-medium'
                              : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: fam.color }}
                            />
                            <span className="truncate">{fam.name}</span>
                          </span>
                          <span className="font-mono-tabular text-[11px] text-slate-400">
                            {fam.subFacets.length + (customSubFacets[fam.id]?.length || 0)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Sub-Facets + Academic Reference */}
          <div className="lg:col-span-3 rounded-lg bg-[#111621] border border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: academicFamily.color }}
                />
                <h2 className="text-xs font-semibold text-slate-200">
                  02. {academicFamily.name} Facets
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                {academicFamily.description}
              </p>
              {academicFamily.academicNotes && (
                <div className="p-2.5 rounded-md bg-[#0B0E14] border border-slate-800/80 text-[11px] text-slate-300 mb-3 leading-relaxed">
                  <span className="text-emerald-400 font-mono-tabular block text-[10px] uppercase">
                    Academic Standard Note
                  </span>
                  {academicFamily.academicNotes}
                </div>
              )}
              <div className="space-y-1.5">
                {academicSubFacets.map((sub) => {
                  const active = sub === selectedSubFacet;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSubFacet(sub)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors ${
                        active
                          ? 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 font-medium'
                          : 'bg-[#0B0E14] border border-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span>{sub}</span>
                      <ArrowRight className="w-3 h-3 opacity-70" />
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleAddCustomSubFacet} className="mt-6 pt-4 border-t border-slate-800">
              <label
                htmlFor="custom-subfacet-input"
                className="block text-[11px] font-medium text-slate-400 mb-1.5"
              >
                Add Custom Sub-Facet to {academicFamily.name}
              </label>
              <div className="flex gap-2">
                <input
                  id="custom-subfacet-input"
                  type="text"
                  value={newSubFacetName}
                  onChange={(e) => setNewSubFacetName(e.target.value)}
                  placeholder="e.g., Damp Pine Needles"
                  className="flex-1 bg-[#0B0E14] border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Column 3: Connected Raw Materials, Accords, and Formulas */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-lg bg-[#111621] border border-slate-800 p-4">
              <h2 className="text-xs font-semibold text-slate-300 mb-3">
                03. Raw Materials in {academicFamily.name} → {selectedSubFacet} ({matchingMaterials.length})
              </h2>
              {matchingMaterials.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">
                  No raw materials currently tagged with {selectedSubFacet}. Select another facet or tag a raw material in the library.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchingMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="p-3 rounded-md bg-[#0B0E14] border border-slate-800/90 hover:border-slate-700 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-white">{mat.name}</span>
                          <span className="text-[11px] font-mono-tabular text-slate-400">
                            {mat.volatility}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {mat.naturalOrSynthetic} · CAS {mat.casNumber}
                        </p>
                        <p className="text-xs text-slate-300 mt-2 line-clamp-2">
                          {mat.descriptiveNotes}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 truncate">
                          {mat.facets.join(' · ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectMaterial(mat.id)}
                          className="text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap shrink-0 ml-2"
                        >
                          Inspect →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-[#111621] border border-slate-800 p-4">
                <h3 className="text-xs font-semibold text-slate-300 mb-2">
                  04. Structural Accords ({matchingAccords.length})
                </h3>
                {matchingAccords.length === 0 ? (
                  <p className="text-xs text-slate-400">No accords linked to {academicFamily.name}.</p>
                ) : (
                  <div className="space-y-2">
                    {matchingAccords.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-2.5 rounded bg-[#0B0E14] border border-slate-800 text-xs"
                      >
                        <div className="font-semibold text-white">{acc.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {acc.items.map((i) => `${i.materialName} ${i.percentage}%`).join(' · ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-[#111621] border border-slate-800 p-4">
                <h3 className="text-xs font-semibold text-slate-300 mb-2">
                  05. Formulas Using This Family ({matchingFormulas.length})
                </h3>
                {matchingFormulas.length === 0 ? (
                  <p className="text-xs text-slate-400">No formulas targeting {academicFamily.name}.</p>
                ) : (
                  <div className="space-y-2">
                    {matchingFormulas.map((f) => (
                      <div
                        key={f.id}
                        className="p-2.5 rounded bg-[#0B0E14] border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {f.name} ({f.activeVersionLabel})
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {f.status} · {f.intendedProduct}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectFormula(f.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium whitespace-nowrap shrink-0"
                        >
                          Open Lab
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
            </>
          );
        })()}
      </div>
    );
  }

  // 2. Interactive Academic Olfactory Wheel View
  return (
    <div className="space-y-7">
      {/* Educational Banner: The Michael Edwards & Osmothèque Standard */}
      <div className="rounded-xl bg-[#111621] border border-slate-800/80 p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-400 font-mono-tabular">
                Academic Standard Fragrance Wheel (Michael Edwards & Osmothèque Taxonomy)
              </span>
            </div>
            <h1 className="text-xl font-sans font-semibold text-white mt-1">
              Academic Fragrance Wheel & Aligned Calibration
            </h1>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-4xl font-normal">
              Modeled on the <span className="text-slate-200">Michael Edwards Fragrances of the World</span> standard: <span className="text-slate-200">4 outer aspect borders</span> (Floral, Ambery, Woody, Fresh) enclose <span className="text-slate-200">14 equal-angle fragrance families</span> around an expanded calibration hub so adjacent families transition smoothly and opposite families provide complementary contrast.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="toggle-radar-overlay-btn"
              onClick={() => setShowRadarOverlay((prev) => !prev)}
              className={`px-3 py-1.5 rounded-md text-xs font-normal border transition-colors flex items-center gap-1.5 ${
                showRadarOverlay
                  ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#0B0E14] text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>{showRadarOverlay ? 'Radar Overlay On' : 'Radar Overlay Off'}</span>
            </button>
          </div>
        </div>

        {/* Super-Family Segmented Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 mr-1 font-normal">Outer Aspects:</span>
            <button
              type="button"
              data-testid="filter-macro-all"
              onClick={() => {
                setMacroFilter('All');
                setSelectedFamilyId(null);
              }}
              className={`px-2.5 py-1 rounded text-xs font-normal transition-colors border ${
                macroFilter === 'All'
                  ? 'bg-slate-700/80 text-white border-slate-600'
                  : 'bg-[#0B0E14] text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              All 14 Families
            </button>
            {MACRO_GROUPS.map((mg) => {
              const count = OLFACTORY_WHEEL_FAMILIES.filter((f) => f.macroFamily === mg.id).length;
              const isActive = macroFilter === mg.id;
              return (
                <button
                  key={mg.id}
                  type="button"
                  data-testid={`filter-macro-${mg.id.toLowerCase()}`}
                  onClick={() => {
                    setMacroFilter(mg.id);
                    const firstFam = OLFACTORY_WHEEL_FAMILIES.find((f) => f.macroFamily === mg.id);
                    if (firstFam) {
                      setSelectedFamilyId(firstFam.id);
                      setSelectedSubFacet(firstFam.subFacets[0] || firstFam.name);
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-normal transition-colors border flex items-center gap-1.5 ${
                    isActive
                      ? 'text-white font-medium border-current'
                      : 'bg-[#0B0E14] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  style={isActive ? { backgroundColor: mg.bgLight, borderColor: mg.color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: mg.color }}
                  />
                  <span>
                    {mg.name} ({count})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-[#0B0E14] border border-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setEditProfileMode('target')}
              className={`px-3 py-1 rounded-md transition-colors ${
                editProfileMode === 'target'
                  ? 'bg-emerald-600 text-white font-normal'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Intent (Brief)
            </button>
            <button
              type="button"
              onClick={() => setEditProfileMode('result')}
              className={`px-3 py-1 rounded-md transition-colors ${
                editProfileMode === 'result'
                  ? 'bg-amber-600 text-white font-normal'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Result (Smelled)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Michael Edwards Academic Single-Ring Fragrance Wheel SVG */}
        <div className="lg:col-span-7 rounded-xl bg-[#111621] border border-slate-800/80 p-5 sm:p-7 flex flex-col items-center">
          <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                Academic Fragrance Wheel
              </span>
              <span className="text-xs text-slate-400 font-mono-tabular">
                4 Outer Aspects · 14 Canonical Families
              </span>
            </div>
            {showRadarOverlay && (
              <div className="flex items-center gap-4 text-xs font-medium font-mono-tabular">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3.5 h-1 rounded bg-emerald-400 inline-block" /> Intent
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-3.5 h-1 rounded bg-amber-400 inline-block" /> Smelled
                </span>
              </div>
            )}
          </div>

          <svg
            viewBox="0 0 840 840"
            data-testid="olfactory-wheel-svg"
            className="w-full max-w-[760px] h-auto select-none my-1"
            role="img"
            aria-label="Academic Fragrance Wheel with 4 outer aspect borders and 14 canonical fragrance families"
          >
            <defs>
              <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1E293B" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#0B0E14" stopOpacity="1" />
              </radialGradient>

              {/* Curved Text Paths for the 4 Outer Aspect Titles (FLORAL, AMBERY, WOODY, FRESH) */}
              {OUTER_ASPECT_ARCS.map((arc) => {
                const rText = arc.reverseText ? rOuterTrack + 5 : rOuterTrack - 2;
                const sRad = degToRad(arc.reverseText ? arc.labelEndDeg : arc.labelStartDeg);
                const eRad = degToRad(arc.reverseText ? arc.labelStartDeg : arc.labelEndDeg);
                const sweep = arc.reverseText ? 0 : 1;
                const x1 = cx + rText * Math.cos(sRad);
                const y1 = cy + rText * Math.sin(sRad);
                const x2 = cx + rText * Math.cos(eRad);
                const y2 = cy + rText * Math.sin(eRad);
                return (
                  <path
                    key={`aspect-arc-def-${arc.macro}`}
                    id={`outer-aspect-arc-${arc.macro}`}
                    d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rText} ${rText} 0 0 ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`}
                  />
                );
              })}

              {/* Curved Text Paths for each of the 14 Sub-Family Titles right outside their wedge */}
              {OLFACTORY_WHEEL_FAMILIES.map((fam, idx) => {
                const startDeg = -180 + idx * sliceDeg + 0.5;
                const endDeg = -180 + (idx + 1) * sliceDeg - 0.5;
                const isBottomHalf = idx >= 7; // 0° to +180° reads left-to-right counter-clockwise
                const rSubArc = isBottomHalf ? rOuterSub + 25 : rOuterSub + 18;
                const sRad = degToRad(isBottomHalf ? endDeg : startDeg);
                const eRad = degToRad(isBottomHalf ? startDeg : endDeg);
                const sweep = isBottomHalf ? 0 : 1;
                const x1 = cx + rSubArc * Math.cos(sRad);
                const y1 = cy + rSubArc * Math.sin(sRad);
                const x2 = cx + rSubArc * Math.cos(eRad);
                const y2 = cy + rSubArc * Math.sin(eRad);
                return (
                  <path
                    key={`sub-arc-def-${fam.id}`}
                    id={`sub-title-arc-${fam.id}`}
                    d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rSubArc} ${rSubArc} 0 0 ${sweep} ${x2.toFixed(2)} ${y2.toFixed(2)}`}
                  />
                );
              })}
            </defs>

            {/* 1. OUTER ASPECT BORDER TRACK, RADIAL BOUNDARIES & DIRECTIONAL ARROWS (FLORAL, AMBERY, WOODY, FRESH) */}
            {OUTER_ASPECT_ARCS.map((arc) => {
              const isMacroHighlighted =
                macroFilter === arc.macro || selectedFamily?.macroFamily === arc.macro;
              const strokeColor = isMacroHighlighted ? '#FFFFFF' : arc.color;

              // Arc segment 1: startDeg -> labelStartDeg
              const s1 = degToRad(arc.startDeg);
              const e1 = degToRad(arc.labelStartDeg);
              const seg1D = `M ${(cx + rOuterTrack * Math.cos(s1)).toFixed(2)} ${(cy + rOuterTrack * Math.sin(s1)).toFixed(2)} A ${rOuterTrack} ${rOuterTrack} 0 0 1 ${(cx + rOuterTrack * Math.cos(e1)).toFixed(2)} ${(cy + rOuterTrack * Math.sin(e1)).toFixed(2)}`;

              // Arc segment 2: labelEndDeg -> endDeg
              const s2 = degToRad(arc.labelEndDeg);
              const e2 = degToRad(arc.endDeg);
              const seg2D = `M ${(cx + rOuterTrack * Math.cos(s2)).toFixed(2)} ${(cy + rOuterTrack * Math.sin(s2)).toFixed(2)} A ${rOuterTrack} ${rOuterTrack} 0 0 1 ${(cx + rOuterTrack * Math.cos(e2)).toFixed(2)} ${(cy + rOuterTrack * Math.sin(e2)).toFixed(2)}`;

              // Clockwise directional arrowhead at endDeg along the outer circle
              const tipX = cx + rOuterTrack * Math.cos(e2);
              const tipY = cy + rOuterTrack * Math.sin(e2);
              const tangentAngleDeg = arc.endDeg + 90;

              // Radial boundary tick at aspect start boundary
              const boundRad = degToRad(arc.startDeg - 1.2);
              const bx1 = cx + (rOuterSub + 6) * Math.cos(boundRad);
              const by1 = cy + (rOuterSub + 6) * Math.sin(boundRad);
              const bx2 = cx + (rOuterTrack + 10) * Math.cos(boundRad);
              const by2 = cy + (rOuterTrack + 10) * Math.sin(boundRad);

              return (
                <g
                  key={arc.macro}
                  data-testid={`wheel-macro-${arc.macro.toLowerCase()}`}
                  onClick={() => {
                    setMacroFilter(arc.macro);
                    const firstFam = OLFACTORY_WHEEL_FAMILIES.find(
                      (f) => f.macroFamily === arc.macro
                    );
                    if (firstFam) {
                      setSelectedFamilyId(firstFam.id);
                      setSelectedSubFacet(firstFam.subFacets[0] || firstFam.name);
                    }
                  }}
                  className="cursor-pointer transition-all hover:opacity-95"
                >
                  {/* Radial boundary divider tick marking the exact sector area for this aspect */}
                  <line
                    x1={bx1}
                    y1={by1}
                    x2={bx2}
                    y2={by2}
                    stroke={arc.color}
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    strokeOpacity="0.65"
                  />

                  {/* Outer Circular Border Segments */}
                  <path
                    d={seg1D}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={isMacroHighlighted ? '5' : '3.5'}
                    strokeLinecap="round"
                  />
                  <path
                    d={seg2D}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={isMacroHighlighted ? '5' : '3.5'}
                    strokeLinecap="round"
                  />

                  {/* Directional Arrowhead along the Outer Aspect Track */}
                  <polygon
                    points="0,0 -11,-5.5 -11,5.5"
                    fill={arc.color}
                    transform={`translate(${tipX.toFixed(2)}, ${tipY.toFixed(2)}) rotate(${tangentAngleDeg.toFixed(2)})`}
                  />

                  {/* Curved Aspect Title (FLORAL, AMBERY, WOODY, FRESH) in the break of the outer border */}
                  <text
                    fill={strokeColor}
                    fontSize="16"
                    fontFamily="sans-serif"
                    fontWeight="700"
                    letterSpacing="0.18em"
                    className="select-none"
                  >
                    <textPath
                      href={`#outer-aspect-arc-${arc.macro}`}
                      startOffset="50%"
                      textAnchor="middle"
                    >
                      {arc.displayLabel}
                    </textPath>
                  </text>
                </g>
              );
            })}

            {/* 2. SINGLE RING OF 14 EQUAL-ANGLE WEDGE SECTORS + CLEAN CURVED TITLES (ZERO INTERIOR CLUTTER) */}
            {OLFACTORY_WHEEL_FAMILIES.map((fam, idx) => {
              const padDeg = 1.15;
              const startDeg = -180 + idx * sliceDeg + padDeg;
              const endDeg = -180 + (idx + 1) * sliceDeg - padDeg;
              const sRad = degToRad(startDeg);
              const eRad = degToRad(endDeg);

              const isSelected = selectedFamily ? fam.id === selectedFamily.id : false;
              const isDimmedByFilter =
                macroFilter !== 'All' && fam.macroFamily !== macroFilter;
              const rOuterCur = isSelected ? rOuterSub + 6 : rOuterSub;

              const x1 = cx + rOuterCur * Math.cos(sRad);
              const y1 = cy + rOuterCur * Math.sin(sRad);
              const x2 = cx + rOuterCur * Math.cos(eRad);
              const y2 = cy + rOuterCur * Math.sin(eRad);
              const x3 = cx + rInnerSub * Math.cos(eRad);
              const y3 = cy + rInnerSub * Math.sin(eRad);
              const x4 = cx + rInnerSub * Math.cos(sRad);
              const y4 = cy + rInnerSub * Math.sin(sRad);

              const pathD = [
                `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
                `A ${rOuterCur} ${rOuterCur} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
                `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
                `A ${rInnerSub} ${rInnerSub} 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
                'Z',
              ].join(' ');

              // Ensure bright, legible text color for the curved title outside the wedge
              const curvedTitleColor =
                fam.id === 'amber'
                  ? '#E11D48'
                  : fam.id === 'aromatic'
                  ? '#6366F1'
                  : fam.id === 'mossy-woods'
                  ? '#10B981'
                  : fam.id === 'citrus'
                  ? '#D97706'
                  : fam.color;

              return (
                <motion.g
                  key={fam.id}
                  data-testid={`wheel-sector-${fam.id}`}
                  initial={{ opacity: 0, scale: 0.93 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.45,
                    delay: idx * 0.03,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                  onClick={() => {
                    setSelectedFamilyId(fam.id);
                    setSelectedSubFacet(fam.subFacets[0] || fam.name);
                  }}
                  className="cursor-pointer transition-all hover:opacity-95"
                >
                  {/* A. Rich Solid Michael Edwards Sector Wedge (Slim 76px Radial Thickness) */}
                  <path
                    d={pathD}
                    fill={fam.color}
                    fillOpacity={isDimmedByFilter ? 0.28 : isSelected ? 1 : 0.92}
                    stroke={isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)'}
                    strokeWidth={isSelected ? '3' : '1'}
                  />

                  {/* B. Curved Sub-Family Title Right Outside the Wedge Arc */}
                  <text
                    fill={curvedTitleColor}
                    fontSize="15"
                    fontFamily="sans-serif"
                    fontWeight="700"
                    letterSpacing="0.02em"
                    className="select-none"
                  >
                    <textPath
                      href={`#sub-title-arc-${fam.id}`}
                      startOffset="50%"
                      textAnchor="middle"
                    >
                      {fam.name}
                    </textPath>
                  </text>
                </motion.g>
              );
            })}

            {/* 3. ENLARGED CENTER CIRCLE (DIAMETER 456px: r=228, expanded for crystal-clear radar calibration) */}
            <circle
              cx={cx}
              cy={cy}
              r={rCenterHub}
              fill="url(#hubGradient)"
              stroke="#475569"
              strokeWidth="2"
            />

            {showRadarOverlay ? (
              /* ALIGNED CALIBRATION RADAR: 14 discrete axes matching all 14 families 1:1 */
              <g data-testid="aligned-radar-overlay">
                {[0.25, 0.5, 0.75, 1].map((step) => (
                  <circle
                    key={step}
                    cx={cx}
                    cy={cy}
                    r={rRadarMax * step}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="0.9"
                    strokeDasharray={step < 1 ? '3 3' : undefined}
                    strokeOpacity={0.75}
                  />
                ))}

                {RADAR_AXES_CLOCKWISE.map((ax) => {
                  const rad = (ax.angleDeg * Math.PI) / 180;
                  const xEnd = cx + rRadarMax * Math.cos(rad);
                  const yEnd = cy + rRadarMax * Math.sin(rad);
                  return (
                    <line
                      key={ax.id}
                      x1={cx}
                      y1={cy}
                      x2={xEnd}
                      y2={yEnd}
                      stroke="#475569"
                      strokeWidth="1"
                      strokeOpacity="0.75"
                    />
                  );
                })}

                {/* Target Intent Polygon (Emerald) */}
                <polygon
                  points={buildRadarPolygonClockwise(targetFacets, rRadarMax, cx, cy)}
                  fill="rgba(16, 185, 129, 0.26)"
                  stroke="#10B981"
                  strokeWidth="2.5"
                />

                {/* Smelled Result Polygon (Amber) */}
                <polygon
                  points={buildRadarPolygonClockwise(localResultFacets, rRadarMax, cx, cy)}
                  fill="rgba(245, 158, 11, 0.24)"
                  stroke="#F59E0B"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                />

                <circle cx={cx} cy={cy} r="4" fill="#10B981" />
              </g>
            ) : (
              /* LARGE MICHAEL EDWARDS STYLE CENTER HUB OVERVIEW */
              <g className="cursor-pointer" onClick={() => setShowRadarOverlay(true)}>
                <rect
                  x={cx - 90}
                  y={cy - 68}
                  width="180"
                  height="28"
                  rx="14"
                  fill="rgba(16, 185, 129, 0.16)"
                  stroke="#10B981"
                  strokeWidth="1.2"
                />
                <text
                  x={cx}
                  y={cy - 53}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#34D399"
                  fontSize="12"
                  fontFamily="monospace"
                  letterSpacing="0.12em"
                  fontWeight="700"
                >
                  {selectedFamily ? `${selectedFamily.macroFamily.toUpperCase()} ASPECT` : 'ALL 14 FAMILIES'}
                </text>

                <text
                  x={cx}
                  y={cy - 12}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="24"
                  fontFamily="sans-serif"
                  fontWeight="700"
                >
                  {selectedFamily ? selectedFamily.name : 'Michael Edwards Standard'}
                </text>

                <text
                  x={cx}
                  y={cy + 22}
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize="13"
                  fontFamily="sans-serif"
                  fontWeight="500"
                >
                  {selectedFamily
                    ? selectedFamily.subFacets.slice(0, 3).join(' · ')
                    : '14 Canonical Fragrance Families'}
                </text>

                <text
                  x={cx}
                  y={cy + 54}
                  textAnchor="middle"
                  fill="#38BDF8"
                  fontSize="12"
                  fontFamily="sans-serif"
                  fontWeight="600"
                >
                  Click to Show Radar Overlay ↻
                </text>
              </g>
            )}
          </svg>

          <p className="text-xs text-slate-400 text-center mt-3 max-w-lg font-normal leading-relaxed">
            Click any sector to inspect its notes and calibrate your formula's Target Intent against blotter evaluation.
          </p>
        </div>

        {/* Right Column: Selected Family Intelligence, Academic Notes & 0–10 Sliders */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Selected Family Academic Card or 14-Family Overview */}
          {selectedFamily ? (
            <div className="rounded-xl bg-[#111621] border border-slate-800/80 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/70 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-sm shrink-0"
                    style={{ backgroundColor: selectedFamily.color }}
                  />
                  <div>
                    <span className="text-[10px] uppercase font-mono-tabular tracking-wider text-emerald-400 block">
                      {selectedFamily.macroFamily} Super-Family
                    </span>
                    <h2 className="text-base font-normal text-white mt-0.5">
                      {selectedFamily.name} Family
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono-tabular text-slate-400 font-normal">
                    Intent: {targetFacets[selectedFamily.name] ?? 0}/10 · Result:{' '}
                    {localResultFacets[selectedFamily.name] ?? 0}/10
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFamilyId(null)}
                    title="Clear sector selection"
                    className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                  >
                    Clear ×
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {selectedFamily.description}
              </p>

              {selectedFamily.academicNotes && (
                <div className="p-3 rounded-lg bg-[#0B0E14] border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1">
                  <span className="text-emerald-400 font-mono-tabular text-[10px] uppercase block">
                    Perfumery Standard Context
                  </span>
                  <p>{selectedFamily.academicNotes}</p>
                </div>
              )}

              {selectedFamily.keyMaterials && selectedFamily.keyMaterials.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-normal">
                    Iconic Aroma Chemicals & Raw Materials:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFamily.keyMaterials.map((km) => (
                      <span
                        key={km}
                        className="px-2 py-0.5 rounded bg-[#0B0E14] border border-slate-800 text-[11px] text-slate-200 font-normal"
                      >
                        {km}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Facet Note Selectors */}
              <div className="pt-2 border-t border-slate-800/70 space-y-2">
                <div className="text-xs font-normal text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sub-Facet Notes in {selectedFamily.name}:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allSubFacetsForFamily.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSubFacet(sub)}
                      className={`px-2.5 py-1 rounded-md text-xs font-normal transition-colors whitespace-nowrap ${
                        selectedSubFacet === sub
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0B0E14] border border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* GLOBAL 14-FAMILY OVERVIEW WHEN NO SECTOR IS SELECTED */
            <div className="rounded-xl bg-[#111621] border border-slate-800/80 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/70 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono-tabular tracking-wider text-emerald-400 block">
                    Michael Edwards Taxonomy
                  </span>
                  <h2 className="text-base font-normal text-white mt-0.5">
                    All 14 Fragrance Families
                  </h2>
                </div>
                <span className="text-xs font-mono-tabular text-slate-400">
                  Global Schematic
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Click any sector on the wheel or select a family below to inspect its iconic raw materials, sub-facets, and formula presence.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {OLFACTORY_WHEEL_FAMILIES.map((fam) => {
                  const weight = activeFormulaFamilyWeights[fam.id];
                  return (
                    <button
                      key={fam.id}
                      type="button"
                      onClick={() => {
                        setSelectedFamilyId(fam.id);
                        setSelectedSubFacet(fam.subFacets[0] || fam.name);
                      }}
                      className="p-2.5 rounded-lg bg-[#0B0E14] border border-slate-800/80 hover:border-slate-700 text-left transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: fam.color }}
                        />
                        <span className="text-xs text-white truncate">{fam.name}</span>
                      </div>
                      <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
                        {weight && weight.pct > 0 ? `${weight.pct.toFixed(0)}%` : `${fam.subFacets.length} notes`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Intent vs Result Calibration (14 Axes 0–10 Scale) */}
          <div className="rounded-xl bg-[#111621] border border-slate-800/80 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/70 pb-3">
              <div>
                <h3 className="text-xs font-normal text-slate-200">
                  Target Intent vs Smelled Result Calibration
                </h3>
                <p className="text-[11px] text-slate-400">
                  Calibrate for {activeFormula.name} ({activeFormula.activeVersionLabel})
                </p>
              </div>
              <span className="text-[11px] font-mono-tabular text-emerald-400 font-normal">
                Editing: {editProfileMode === 'target' ? 'Target Intent' : 'Smelled Result'}
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {RADAR_AXES_CLOCKWISE.map((axis) => {
                const facet = axis.name;
                const targetVal = getFacetScore(targetFacets, axis);
                const resultVal = getFacetScore(localResultFacets, axis);
                const delta = resultVal - targetVal;
                const activeVal = editProfileMode === 'target' ? targetVal : resultVal;

                return (
                  <div key={axis.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-200 font-normal">{facet}</span>
                        <span className="text-[10px] text-slate-400 font-mono-tabular">
                          ({axis.macro})
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 font-mono-tabular text-[11px] font-normal">
                        <span className="text-emerald-400">Intent {targetVal}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-amber-400">Result {resultVal}</span>
                        <span className="text-slate-600">·</span>
                        <span
                          className={
                            delta === 0
                              ? 'text-slate-400'
                              : delta > 0
                              ? 'text-amber-300'
                              : 'text-sky-300'
                          }
                        >
                          {delta === 0 ? 'Match' : `${delta > 0 ? '+' : ''}${delta}`}
                        </span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      aria-label={`${facet} ${editProfileMode} intensity`}
                      value={activeVal}
                      onChange={(e) => handleScoreChange(facet, Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
