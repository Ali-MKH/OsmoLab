import { eq, and, desc } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  materials,
  materialRegulatoryLimits,
  scentMemories,
  inventoryLots,
  inventoryMovements,
  accords,
  projects,
  formulas,
  formulaVersions,
  batches,
  experiments,
  evaluations,
  materialUsageReviews,
  auditLogs,
} from './schema.ts';
import {
  SEED_MATERIALS,
  SEED_REGULATORY_LIMITS,
  SEED_SCENT_MEMORIES,
  SEED_INVENTORY_LOTS,
  SEED_INVENTORY_MOVEMENTS,
  SEED_ACCORDS,
  SEED_FORMULAS,
  SEED_BATCHES,
  SEED_EXPERIMENTS,
  SEED_EVALUATIONS,
  SEED_USAGE_REVIEWS,
} from '../domain/seed-data.ts';
import type {
  AccordDefinition,
  ExperimentEntry,
  Formula,
  FormulaVersion,
  InventoryLot,
  InventoryMovement,
  MaterialRegulatoryLimit,
  MaterialUsageReview,
  PhysicalBatch,
  RawMaterial,
  ScentMemoryRecord,
  SensoryEvaluation,
} from '../domain/types.ts';

export async function getOrCreateUserAndSeed(uid: string, email: string) {
  try {
    const upserted = await db
      .insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email, updatedAt: new Date() },
      })
      .returning();

    const user = upserted[0];

    // Check if user already has materials in PostgreSQL; if not, seed the educational dataset
    const existingMaterials = await db
      .select()
      .from(materials)
      .where(eq(materials.userUid, uid));

    if (existingMaterials.length === 0) {
      await seedUserWorkspace(uid);
    }

    return user;
  } catch (error) {
    console.error('Database query failed in getOrCreateUserAndSeed:', error);
    throw new Error('Failed to initialize user workspace.', { cause: error });
  }
}

async function seedUserWorkspace(uid: string) {
  try {
    const materialIdMap = new Map<number, number>();

    for (const m of SEED_MATERIALS) {
      const inserted = await db
        .insert(materials)
        .values({
          userUid: uid,
          name: m.name,
          aliases: m.aliases,
          casNumber: m.casNumber,
          inciName: m.inciName,
          naturalOrSynthetic: m.naturalOrSynthetic,
          supplier: m.supplier,
          supplierProductCode: m.supplierProductCode,
          manufacturer: m.manufacturer,
          primaryFamily: m.primaryFamily,
          facets: m.facets.join('|'),
          intensity: m.intensity,
          substantivityHours: m.substantivityHours,
          diffusion: m.diffusion,
          volatility: m.volatility,
          descriptiveNotes: m.descriptiveNotes,
          texture: m.texture,
          temperatureImpression: m.temperatureImpression,
          personalNotes: m.personalNotes,
          purity: m.purity,
          density: m.density,
          recommendedDilution: m.recommendedDilution,
          storageInfo: m.storageInfo,
          shelfLifeMonths: m.shelfLifeMonths,
          flashPointCelsius: m.flashPointCelsius,
          educationalObserve: m.educationalObserve.join('|'),
          complements: m.complements.join('|'),
          contrasts: m.contrasts.join('|'),
          isSeedData: true,
        })
        .returning();
      materialIdMap.set(m.id, inserted[0].id);
    }

    for (const reg of SEED_REGULATORY_LIMITS) {
      const realMatId = materialIdMap.get(reg.materialId);
      if (!realMatId) continue;
      await db.insert(materialRegulatoryLimits).values({
        userUid: uid,
        materialId: realMatId,
        ifraCategory: reg.ifraCategory,
        maxAllowedPercent: reg.maxAllowedPercent,
        allergens: reg.allergens,
        restrictions: reg.restrictions,
        sourceDocument: reg.sourceDocument,
        documentVersion: reg.documentVersion,
        effectiveDate: reg.effectiveDate,
        isDemoData: reg.isDemoData,
      });
    }

    for (const mem of SEED_SCENT_MEMORIES) {
      const realMatId = materialIdMap.get(mem.materialId);
      if (!realMatId) continue;
      await db.insert(scentMemories).values({
        userUid: uid,
        materialId: realMatId,
        myPerception: mem.myPerception.join('|'),
        associatedMemories: mem.associatedMemories.join('|'),
        emotions: mem.emotions.join('|'),
        mentalImages: mem.mentalImages,
        places: mem.places,
        colors: mem.colors,
        textures: mem.textures,
        temperature: mem.temperature,
        strengthScore: mem.strengthScore,
        familiarityScore: mem.familiarityScore,
        blindConfidenceScore: mem.blindConfidenceScore,
        recognitionTrials: mem.recognitionTrials,
        recognitionCorrect: mem.recognitionCorrect,
      });
    }

    const lotIdMap = new Map<number, number>();
    for (const lot of SEED_INVENTORY_LOTS) {
      const realMatId = materialIdMap.get(lot.materialId);
      if (!realMatId) continue;
      const ins = await db
        .insert(inventoryLots)
        .values({
          userUid: uid,
          materialId: realMatId,
          supplier: lot.supplier,
          lotNumber: lot.lotNumber,
          concentrationPercent: lot.concentrationPercent,
          solvent: lot.solvent,
          containerSizeGrams: lot.containerSizeGrams,
          quantityRemainingGrams: lot.quantityRemainingGrams,
          reservedQuantityGrams: lot.reservedQuantityGrams,
          lowStockThresholdGrams: lot.lowStockThresholdGrams,
          purchaseDate: lot.purchaseDate,
          openedDate: lot.openedDate,
          retestDate: lot.retestDate,
          priceTotal: lot.priceTotal,
          costPerGram: lot.costPerGram,
          storageLocation: lot.storageLocation,
          supplierReference: lot.supplierReference,
          notes: lot.notes,
        })
        .returning();
      lotIdMap.set(lot.id, ins[0].id);
    }

    for (const mov of SEED_INVENTORY_MOVEMENTS) {
      const realLotId = lotIdMap.get(mov.lotId);
      if (!realLotId) continue;
      await db.insert(inventoryMovements).values({
        userUid: uid,
        lotId: realLotId,
        batchId: mov.batchId,
        movementType: mov.movementType,
        deltaGrams: mov.deltaGrams,
        theoreticalGrams: mov.theoreticalGrams,
        actualGrams: mov.actualGrams,
        notes: mov.notes,
      });
    }

    const accordIdMap = new Map<number, number>();
    for (const acc of SEED_ACCORDS) {
      const mappedItems = acc.items.map((item) => ({
        ...item,
        materialId: materialIdMap.get(item.materialId) || item.materialId,
      }));
      const ins = await db
        .insert(accords)
        .values({
          userUid: uid,
          name: acc.name,
          category: acc.category,
          description: acc.description,
          objective: acc.objective,
          usageSuggestions: acc.usageSuggestions,
          notes: acc.notes,
          isEducational: acc.isEducational,
          itemsJson: JSON.stringify(mappedItems),
          olfactoryProfileJson: JSON.stringify(acc.olfactoryProfile),
        })
        .returning();
      accordIdMap.set(acc.id, ins[0].id);
    }

    const projIns = await db
      .insert(projects)
      .values({
        userUid: uid,
        name: 'Forest Project',
        description: 'Mediterranean coastal woodland & petrichor studies',
        status: 'Active',
      })
      .returning();

    const formulaIdMap = new Map<number, number>();
    const versionIdMap = new Map<number, number>();

    for (const f of SEED_FORMULAS) {
      const fIns = await db
        .insert(formulas)
        .values({
          userUid: uid,
          projectId: projIns[0].id,
          projectName: f.projectName,
          name: f.name,
          status: f.status,
          description: f.description,
          intendedProduct: f.intendedProduct,
          ifraCategory: f.ifraCategory,
          finalProductConcentration: f.finalProductConcentration,
          targetBrief: f.targetBrief,
          targetFamilies: f.targetFamilies.join('|'),
          targetFacetsJson: JSON.stringify(f.targetFacets),
          targetIntensity: f.targetIntensity,
          targetTexture: f.targetTexture,
          targetAtmosphere: f.targetAtmosphere,
          targetTemperature: f.targetTemperature,
          targetColor: f.targetColor,
          targetMood: f.targetMood,
          targetDiffusion: f.targetDiffusion,
          targetEvolution: f.targetEvolution,
          targetDrydown: f.targetDrydown,
          materialsToAvoid: f.materialsToAvoid.join('|'),
          isFavorite: f.isFavorite,
          tags: f.tags.join('|'),
          activeVersionLabel: f.activeVersionLabel,
        })
        .returning();

      const realFormulaId = fIns[0].id;
      formulaIdMap.set(f.id, realFormulaId);

      for (const v of f.versions) {
        const mappedItems = v.items.map((item) => ({
          ...item,
          materialId: item.materialId
            ? materialIdMap.get(item.materialId) || item.materialId
            : undefined,
          accordId: item.accordId
            ? accordIdMap.get(item.accordId) || item.accordId
            : undefined,
        }));
        const vIns = await db
          .insert(formulaVersions)
          .values({
            userUid: uid,
            formulaId: realFormulaId,
            parentVersionId: v.parentVersionId
              ? versionIdMap.get(v.parentVersionId) || null
              : null,
            versionLabel: v.versionLabel,
            status: v.status,
            versionNotes: v.versionNotes,
            maturationDays: v.maturationDays,
            itemsJson: JSON.stringify(mappedItems),
          })
          .returning();
        versionIdMap.set(v.id, vIns[0].id);
      }
    }

    for (const b of SEED_BATCHES) {
      const realFormulaId = formulaIdMap.get(b.formulaId);
      if (!realFormulaId) continue;
      const mappedItems = b.items.map((item) => ({
        ...item,
        materialId: materialIdMap.get(item.materialId) || item.materialId,
        lotId: item.lotId ? lotIdMap.get(item.lotId) || item.lotId : null,
      }));
      await db.insert(batches).values({
        userUid: uid,
        formulaId: realFormulaId,
        formulaVersionId: versionIdMap.get(b.formulaVersionId) || 1,
        versionLabel: b.versionLabel,
        batchCode: b.batchCode,
        targetBatchGrams: b.targetBatchGrams,
        status: b.status,
        macerationStartDate: b.macerationStartDate,
        itemsJson: JSON.stringify(mappedItems),
        notes: b.notes,
      });
    }

    for (const exp of SEED_EXPERIMENTS) {
      const realFormulaId = formulaIdMap.get(exp.formulaId);
      if (!realFormulaId) continue;
      await db.insert(experiments).values({
        userUid: uid,
        formulaId: realFormulaId,
        formulaVersionLabel: exp.formulaVersionLabel,
        batchCode: exp.batchCode,
        stageLabel: exp.stageLabel,
        observation: exp.observation,
        recordedAt: exp.recordedAt,
      });
    }

    for (const ev of SEED_EVALUATIONS) {
      const realFormulaId = formulaIdMap.get(ev.formulaId);
      if (!realFormulaId) continue;
      await db.insert(evaluations).values({
        userUid: uid,
        formulaId: realFormulaId,
        formulaVersionLabel: ev.formulaVersionLabel,
        batchCode: ev.batchCode,
        checkpoint: ev.checkpoint,
        overallScore: ev.overallScore,
        scoresJson: JSON.stringify(ev.scores),
        evaluatedFacetsJson: JSON.stringify(ev.evaluatedFacets),
        openingNotes: ev.openingNotes,
        heartNotes: ev.heartNotes,
        drydownNotes: ev.drydownNotes,
        voiceTranscript: ev.voiceTranscript,
        voiceDurationSeconds: ev.voiceDurationSeconds,
      });
    }

    for (const rev of SEED_USAGE_REVIEWS) {
      const realMatId = materialIdMap.get(rev.materialId);
      const realFormulaId = formulaIdMap.get(rev.formulaId);
      if (!realMatId || !realFormulaId) continue;
      await db.insert(materialUsageReviews).values({
        userUid: uid,
        materialId: realMatId,
        formulaId: realFormulaId,
        formulaName: rev.formulaName,
        versionLabel: rev.versionLabel,
        percentageUsed: rev.percentageUsed,
        effectivenessScore: rev.effectivenessScore,
        observation: rev.observation,
      });
    }
  } catch (error) {
    console.error('Error seeding workspace:', error);
    throw new Error('Failed to seed initial perfumery workspace.', { cause: error });
  }
}

const splitPipe = (val: string | null | undefined): string[] =>
  val ? val.split('|').map((s) => s.trim()).filter(Boolean) : [];

export async function fetchFullWorkspace(uid: string, email: string) {
  try {
    const userRecord = await getOrCreateUserAndSeed(uid, email);

    const [
      dbMaterials,
      dbRegLimits,
      dbMemories,
      dbLots,
      dbMovements,
      dbAccords,
      dbFormulas,
      dbVersions,
      dbBatches,
      dbExperiments,
      dbEvaluations,
      dbUsageReviews,
    ] = await Promise.all([
      db.select().from(materials).where(eq(materials.userUid, uid)),
      db.select().from(materialRegulatoryLimits).where(eq(materialRegulatoryLimits.userUid, uid)),
      db.select().from(scentMemories).where(eq(scentMemories.userUid, uid)),
      db.select().from(inventoryLots).where(eq(inventoryLots.userUid, uid)),
      db.select().from(inventoryMovements).where(eq(inventoryMovements.userUid, uid)).orderBy(desc(inventoryMovements.id)),
      db.select().from(accords).where(eq(accords.userUid, uid)),
      db.select().from(formulas).where(eq(formulas.userUid, uid)),
      db.select().from(formulaVersions).where(eq(formulaVersions.userUid, uid)),
      db.select().from(batches).where(eq(batches.userUid, uid)).orderBy(desc(batches.id)),
      db.select().from(experiments).where(eq(experiments.userUid, uid)),
      db.select().from(evaluations).where(eq(evaluations.userUid, uid)).orderBy(desc(evaluations.id)),
      db.select().from(materialUsageReviews).where(eq(materialUsageReviews.userUid, uid)),
    ]);

    const mappedMaterials: RawMaterial[] = dbMaterials.map((m) => ({
      id: m.id,
      name: m.name,
      aliases: m.aliases || '',
      casNumber: m.casNumber || 'Unknown / Not Provided',
      inciName: m.inciName || 'Unknown / Not Provided',
      naturalOrSynthetic: (m.naturalOrSynthetic as RawMaterial['naturalOrSynthetic']) || 'Synthetic',
      supplier: m.supplier || '',
      supplierProductCode: m.supplierProductCode || '',
      manufacturer: m.manufacturer || '',
      primaryFamily: m.primaryFamily,
      facets: splitPipe(m.facets),
      intensity: m.intensity ?? 7,
      substantivityHours: m.substantivityHours ?? 24,
      diffusion: m.diffusion ?? 7,
      volatility: (m.volatility as RawMaterial['volatility']) || 'Heart',
      descriptiveNotes: m.descriptiveNotes || '',
      texture: m.texture || '',
      temperatureImpression: m.temperatureImpression || 'Neutral',
      personalNotes: m.personalNotes || '',
      purity: m.purity || 'Unknown / Not Provided',
      density: m.density ?? 1.0,
      recommendedDilution: m.recommendedDilution ?? 100,
      storageInfo: m.storageInfo || '',
      shelfLifeMonths: m.shelfLifeMonths ?? 24,
      flashPointCelsius: m.flashPointCelsius ?? null,
      educationalObserve: splitPipe(m.educationalObserve),
      complements: splitPipe(m.complements),
      contrasts: splitPipe(m.contrasts),
      isSeedData: m.isSeedData ?? false,
    }));

    const mappedRegLimits: MaterialRegulatoryLimit[] = dbRegLimits.map((r) => ({
      id: r.id,
      materialId: r.materialId,
      ifraCategory: r.ifraCategory,
      maxAllowedPercent: r.maxAllowedPercent ?? null,
      allergens: r.allergens || 'Unknown / Not Provided',
      restrictions: r.restrictions || '',
      sourceDocument: r.sourceDocument || 'Unknown / Not Provided',
      documentVersion: r.documentVersion || 'Unknown / Not Provided',
      effectiveDate: r.effectiveDate || 'Unknown / Not Provided',
      isDemoData: r.isDemoData ?? true,
    }));

    const mappedMemories: ScentMemoryRecord[] = dbMemories.map((mem) => ({
      id: mem.id,
      materialId: mem.materialId,
      myPerception: splitPipe(mem.myPerception),
      associatedMemories: splitPipe(mem.associatedMemories),
      emotions: splitPipe(mem.emotions),
      mentalImages: mem.mentalImages || '',
      places: mem.places || '',
      colors: mem.colors || '#2E6F40',
      textures: mem.textures || '',
      temperature: mem.temperature || 'Neutral',
      strengthScore: mem.strengthScore ?? 7,
      familiarityScore: mem.familiarityScore ?? 6,
      blindConfidenceScore: mem.blindConfidenceScore ?? 6,
      recognitionTrials: mem.recognitionTrials ?? 0,
      recognitionCorrect: mem.recognitionCorrect ?? 0,
      lastReviewedAt: mem.lastReviewedAt
        ? mem.lastReviewedAt.toISOString().slice(0, 10)
        : '2026-10-23',
    }));

    const mappedLots: InventoryLot[] = dbLots.map((l) => ({
      id: l.id,
      materialId: l.materialId,
      supplier: l.supplier,
      lotNumber: l.lotNumber,
      concentrationPercent: l.concentrationPercent,
      solvent: l.solvent || 'Neat',
      containerSizeGrams: l.containerSizeGrams,
      quantityRemainingGrams: l.quantityRemainingGrams,
      reservedQuantityGrams: l.reservedQuantityGrams,
      lowStockThresholdGrams: l.lowStockThresholdGrams,
      purchaseDate: l.purchaseDate || '',
      openedDate: l.openedDate || '',
      retestDate: l.retestDate || '',
      priceTotal: l.priceTotal,
      costPerGram: l.costPerGram,
      storageLocation: l.storageLocation || '',
      supplierReference: l.supplierReference || '',
      notes: l.notes || '',
    }));

    const mappedMovements: InventoryMovement[] = dbMovements.map((mov) => ({
      id: mov.id,
      lotId: mov.lotId,
      batchId: mov.batchId,
      movementType: (mov.movementType as InventoryMovement['movementType']) || 'Consumed',
      deltaGrams: mov.deltaGrams,
      theoreticalGrams: mov.theoreticalGrams,
      actualGrams: mov.actualGrams,
      notes: mov.notes || '',
      createdAt: mov.createdAt
        ? mov.createdAt.toISOString().slice(0, 16).replace('T', ' ')
        : '2026-10-23 12:00',
    }));

    const mappedAccords: AccordDefinition[] = dbAccords.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      description: a.description || '',
      objective: a.objective || '',
      usageSuggestions: a.usageSuggestions || '',
      notes: a.notes || '',
      isEducational: a.isEducational ?? false,
      items: JSON.parse(a.itemsJson || '[]'),
      olfactoryProfile: JSON.parse(a.olfactoryProfileJson || '{}'),
    }));

    const mappedFormulas: Formula[] = dbFormulas.map((f) => {
      const fVersions: FormulaVersion[] = dbVersions
        .filter((v) => v.formulaId === f.id)
        .map((v) => ({
          id: v.id,
          formulaId: v.formulaId,
          parentVersionId: v.parentVersionId ?? null,
          versionLabel: v.versionLabel,
          status: (v.status as 'Draft' | 'Committed') || 'Committed',
          versionNotes: v.versionNotes || '',
          maturationDays: v.maturationDays ?? 14,
          items: JSON.parse(v.itemsJson || '[]'),
          createdAt: v.createdAt
            ? v.createdAt.toISOString().slice(0, 10)
            : '2026-10-23',
        }));

      return {
        id: f.id,
        projectId: f.projectId ?? null,
        projectName: f.projectName || 'Personal Study',
        name: f.name,
        status: (f.status as Formula['status']) || 'Draft',
        description: f.description || '',
        intendedProduct: f.intendedProduct || 'Eau de Parfum (20% conc.)',
        ifraCategory: f.ifraCategory || 'Category 4 (Fine Fragrance)',
        finalProductConcentration: f.finalProductConcentration ?? 20,
        targetBrief: f.targetBrief || '',
        targetFamilies: splitPipe(f.targetFamilies),
        targetFacets: JSON.parse(f.targetFacetsJson || '{}'),
        targetIntensity: f.targetIntensity ?? 7,
        targetTexture: f.targetTexture || '',
        targetAtmosphere: f.targetAtmosphere || '',
        targetTemperature: f.targetTemperature || 'Cool',
        targetColor: f.targetColor || '#2E6F40',
        targetMood: f.targetMood || '',
        targetDiffusion: f.targetDiffusion ?? 7,
        targetEvolution: f.targetEvolution || '',
        targetDrydown: f.targetDrydown || '',
        materialsToAvoid: splitPipe(f.materialsToAvoid),
        isFavorite: f.isFavorite ?? false,
        tags: splitPipe(f.tags),
        activeVersionLabel:
          f.activeVersionLabel ||
          (fVersions.length > 0 ? fVersions[fVersions.length - 1].versionLabel : 'V1'),
        versions: fVersions,
        createdAt: f.createdAt ? f.createdAt.toISOString().slice(0, 10) : '2026-10-23',
        updatedAt: f.updatedAt ? f.updatedAt.toISOString().slice(0, 10) : '2026-10-23',
      };
    });

    const mappedBatches: PhysicalBatch[] = dbBatches.map((b) => ({
      id: b.id,
      formulaId: b.formulaId,
      formulaVersionId: b.formulaVersionId,
      versionLabel: b.versionLabel,
      batchCode: b.batchCode,
      targetBatchGrams: b.targetBatchGrams,
      status: (b.status as PhysicalBatch['status']) || 'Planned',
      macerationStartDate: b.macerationStartDate || '',
      items: JSON.parse(b.itemsJson || '[]'),
      notes: b.notes || '',
      createdAt: b.createdAt ? b.createdAt.toISOString().slice(0, 10) : '2026-10-23',
      updatedAt: b.updatedAt ? b.updatedAt.toISOString().slice(0, 10) : '2026-10-23',
    }));

    const mappedExperiments: ExperimentEntry[] = dbExperiments.map((e) => ({
      id: e.id,
      formulaId: e.formulaId,
      formulaVersionLabel: e.formulaVersionLabel,
      batchCode: e.batchCode || '',
      stageLabel: e.stageLabel,
      observation: e.observation,
      recordedAt: e.recordedAt,
    }));

    const mappedEvaluations: SensoryEvaluation[] = dbEvaluations.map((ev) => ({
      id: ev.id,
      formulaId: ev.formulaId,
      formulaVersionLabel: ev.formulaVersionLabel,
      batchCode: ev.batchCode || '',
      checkpoint: ev.checkpoint,
      overallScore: ev.overallScore ?? 8.0,
      scores: JSON.parse(ev.scoresJson || '{}'),
      evaluatedFacets: JSON.parse(ev.evaluatedFacetsJson || '{}'),
      openingNotes: ev.openingNotes || '',
      heartNotes: ev.heartNotes || '',
      drydownNotes: ev.drydownNotes || '',
      voiceTranscript: ev.voiceTranscript || '',
      voiceDurationSeconds: ev.voiceDurationSeconds ?? 0,
      createdAt: ev.createdAt
        ? ev.createdAt.toISOString().slice(0, 16).replace('T', ' ')
        : '2026-10-23 12:00',
    }));

    const mappedUsageReviews: MaterialUsageReview[] = dbUsageReviews.map((rev) => ({
      id: rev.id,
      materialId: rev.materialId,
      formulaId: rev.formulaId,
      formulaName: rev.formulaName,
      versionLabel: rev.versionLabel,
      percentageUsed: rev.percentageUsed,
      effectivenessScore: rev.effectivenessScore,
      observation: rev.observation,
      createdAt: rev.createdAt ? rev.createdAt.toISOString().slice(0, 10) : '2026-10-23',
    }));

    return {
      user: userRecord,
      materials: mappedMaterials,
      regulatoryLimits: mappedRegLimits,
      scentMemories: mappedMemories,
      inventoryLots: mappedLots,
      inventoryMovements: mappedMovements,
      accords: mappedAccords,
      formulas: mappedFormulas,
      batches: mappedBatches,
      experiments: mappedExperiments,
      evaluations: mappedEvaluations,
      usageReviews: mappedUsageReviews,
    };
  } catch (error) {
    console.error('Database query failed in fetchFullWorkspace:', error);
    throw new Error('Failed to load workspace data from database.', { cause: error });
  }
}

export async function createMaterialInDb(
  uid: string,
  payload: Omit<RawMaterial, 'id'> & {
    maxAllowedPercent?: number | null;
    ifraSource?: string;
  }
) {
  try {
    const ins = await db
      .insert(materials)
      .values({
        userUid: uid,
        name: payload.name,
        aliases: payload.aliases || '',
        casNumber: payload.casNumber || 'Unknown / Not Provided',
        inciName: payload.inciName || 'Unknown / Not Provided',
        naturalOrSynthetic: payload.naturalOrSynthetic || 'Synthetic',
        supplier: payload.supplier || '',
        supplierProductCode: payload.supplierProductCode || '',
        manufacturer: payload.manufacturer || '',
        primaryFamily: payload.primaryFamily || 'Woody',
        facets: (payload.facets || []).join('|'),
        intensity: payload.intensity ?? 7,
        substantivityHours: payload.substantivityHours ?? 24,
        diffusion: payload.diffusion ?? 7,
        volatility: payload.volatility || 'Heart',
        descriptiveNotes: payload.descriptiveNotes || '',
        texture: payload.texture || '',
        temperatureImpression: payload.temperatureImpression || 'Neutral',
        personalNotes: payload.personalNotes || '',
        purity: payload.purity || 'Unknown / Not Provided',
        density: payload.density ?? 1.0,
        recommendedDilution: payload.recommendedDilution ?? 100,
        storageInfo: payload.storageInfo || 'Cool, dark place',
        shelfLifeMonths: payload.shelfLifeMonths ?? 24,
        flashPointCelsius: payload.flashPointCelsius ?? null,
        educationalObserve: (payload.educationalObserve || []).join('|'),
        complements: (payload.complements || []).join('|'),
        contrasts: (payload.contrasts || []).join('|'),
        isSeedData: false,
      })
      .returning();

    const mat = ins[0];
    await db.insert(materialRegulatoryLimits).values({
      userUid: uid,
      materialId: mat.id,
      ifraCategory: 'Category 4 (Fine Fragrance)',
      maxAllowedPercent:
        payload.maxAllowedPercent !== undefined ? payload.maxAllowedPercent : null,
      allergens: 'Unknown / Not Provided',
      restrictions: '',
      sourceDocument: payload.ifraSource || 'Unknown / Not Provided',
      documentVersion: payload.ifraSource ? 'User Entered' : 'Unknown / Not Provided',
      effectiveDate: new Date().toISOString().slice(0, 10),
      isDemoData: false,
    });

    await db.insert(auditLogs).values({
      userUid: uid,
      action: 'CREATE_MATERIAL',
      entityType: 'material',
      entityId: String(mat.id),
      summary: `Created raw material ${mat.name} (CAS: ${mat.casNumber})`,
    });

    return mat;
  } catch (error) {
    console.error('Database query failed in createMaterialInDb:', error);
    throw new Error('Failed to save raw material.', { cause: error });
  }
}

async function assertMaterialOwnedByUser(uid: string, materialId: number) {
  const found = await db
    .select({ id: materials.id })
    .from(materials)
    .where(and(eq(materials.id, materialId), eq(materials.userUid, uid)));
  if (found.length === 0) {
    throw new Error('Forbidden: referenced raw material does not belong to the authenticated user.');
  }
}

async function assertFormulaOwnedByUser(uid: string, formulaId: number) {
  const found = await db
    .select({ id: formulas.id })
    .from(formulas)
    .where(and(eq(formulas.id, formulaId), eq(formulas.userUid, uid)));
  if (found.length === 0) {
    throw new Error('Forbidden: referenced formula does not belong to the authenticated user.');
  }
}

export async function createInventoryLotInDb(
  uid: string,
  payload: Omit<InventoryLot, 'id'>
) {
  try {
    await assertMaterialOwnedByUser(uid, payload.materialId);

    const ins = await db
      .insert(inventoryLots)
      .values({
        userUid: uid,
        materialId: payload.materialId,
        supplier: payload.supplier,
        lotNumber: payload.lotNumber,
        concentrationPercent: payload.concentrationPercent,
        solvent: payload.solvent,
        containerSizeGrams: payload.containerSizeGrams,
        quantityRemainingGrams: payload.quantityRemainingGrams,
        reservedQuantityGrams: payload.reservedQuantityGrams || 0,
        lowStockThresholdGrams: payload.lowStockThresholdGrams || 10,
        purchaseDate: payload.purchaseDate,
        openedDate: payload.openedDate,
        retestDate: payload.retestDate,
        priceTotal: payload.priceTotal,
        costPerGram: payload.costPerGram,
        storageLocation: payload.storageLocation,
        supplierReference: payload.supplierReference,
        notes: payload.notes,
      })
      .returning();

    await db.insert(inventoryMovements).values({
      userUid: uid,
      lotId: ins[0].id,
      movementType: 'Initial',
      deltaGrams: payload.quantityRemainingGrams,
      theoreticalGrams: payload.quantityRemainingGrams,
      actualGrams: payload.quantityRemainingGrams,
      notes: `Initial stock entry for lot ${payload.lotNumber}`,
    });

    return ins[0];
  } catch (error) {
    console.error('Database query failed in createInventoryLotInDb:', error);
    throw new Error('Failed to create inventory lot.', { cause: error });
  }
}

export async function saveFormulaAndVersionInDb(
  uid: string,
  formulaPayload: Partial<Formula> & { id?: number; name: string },
  versionPayload: {
    versionLabel: string;
    parentVersionId?: number | null;
    status: 'Draft' | 'Committed';
    versionNotes: string;
    maturationDays: number;
    items: FormulaVersion['items'];
  }
) {
  try {
    let formulaId = formulaPayload.id;

    if (formulaId) {
      await assertFormulaOwnedByUser(uid, formulaId);
      await db
        .update(formulas)
        .set({
          name: formulaPayload.name,
          projectName: formulaPayload.projectName || 'Forest Project',
          status: formulaPayload.status || 'Draft',
          description: formulaPayload.description || '',
          intendedProduct: formulaPayload.intendedProduct || 'Eau de Parfum (20% conc.)',
          ifraCategory: formulaPayload.ifraCategory || 'Category 4 (Fine Fragrance)',
          finalProductConcentration: formulaPayload.finalProductConcentration ?? 20,
          targetBrief: formulaPayload.targetBrief || '',
          targetFamilies: (formulaPayload.targetFamilies || []).join('|'),
          targetFacetsJson: JSON.stringify(formulaPayload.targetFacets || {}),
          targetIntensity: formulaPayload.targetIntensity ?? 7,
          targetTexture: formulaPayload.targetTexture || '',
          targetAtmosphere: formulaPayload.targetAtmosphere || '',
          targetTemperature: formulaPayload.targetTemperature || 'Cool',
          targetColor: formulaPayload.targetColor || '#2E6F40',
          targetMood: formulaPayload.targetMood || '',
          targetDiffusion: formulaPayload.targetDiffusion ?? 7,
          targetEvolution: formulaPayload.targetEvolution || '',
          targetDrydown: formulaPayload.targetDrydown || '',
          materialsToAvoid: (formulaPayload.materialsToAvoid || []).join('|'),
          isFavorite: formulaPayload.isFavorite ?? false,
          tags: (formulaPayload.tags || []).join('|'),
          activeVersionLabel: versionPayload.versionLabel,
          updatedAt: new Date(),
        })
        .where(and(eq(formulas.id, formulaId), eq(formulas.userUid, uid)));
    } else {
      const fIns = await db
        .insert(formulas)
        .values({
          userUid: uid,
          projectName: formulaPayload.projectName || 'Forest Project',
          name: formulaPayload.name,
          status: formulaPayload.status || 'Draft',
          description: formulaPayload.description || '',
          intendedProduct: formulaPayload.intendedProduct || 'Eau de Parfum (20% conc.)',
          ifraCategory: formulaPayload.ifraCategory || 'Category 4 (Fine Fragrance)',
          finalProductConcentration: formulaPayload.finalProductConcentration ?? 20,
          targetBrief: formulaPayload.targetBrief || '',
          targetFamilies: (formulaPayload.targetFamilies || []).join('|'),
          targetFacetsJson: JSON.stringify(formulaPayload.targetFacets || {}),
          targetIntensity: formulaPayload.targetIntensity ?? 7,
          targetTexture: formulaPayload.targetTexture || '',
          targetAtmosphere: formulaPayload.targetAtmosphere || '',
          targetTemperature: formulaPayload.targetTemperature || 'Cool',
          targetColor: formulaPayload.targetColor || '#2E6F40',
          targetMood: formulaPayload.targetMood || '',
          targetDiffusion: formulaPayload.targetDiffusion ?? 7,
          targetEvolution: formulaPayload.targetEvolution || '',
          targetDrydown: formulaPayload.targetDrydown || '',
          materialsToAvoid: (formulaPayload.materialsToAvoid || []).join('|'),
          isFavorite: formulaPayload.isFavorite ?? false,
          tags: (formulaPayload.tags || []).join('|'),
          activeVersionLabel: versionPayload.versionLabel,
        })
        .returning();
      formulaId = fIns[0].id;
    }

    // Never overwrite committed versions: check if this exact versionLabel exists and is Draft
    const existingVers = await db
      .select()
      .from(formulaVersions)
      .where(
        and(
          eq(formulaVersions.formulaId, formulaId),
          eq(formulaVersions.versionLabel, versionPayload.versionLabel),
          eq(formulaVersions.userUid, uid)
        )
      );

    let savedVersion;
    if (existingVers.length > 0 && existingVers[0].status === 'Draft') {
      const upd = await db
        .update(formulaVersions)
        .set({
          status: versionPayload.status,
          versionNotes: versionPayload.versionNotes,
          maturationDays: versionPayload.maturationDays,
          itemsJson: JSON.stringify(versionPayload.items),
        })
        .where(
          and(
            eq(formulaVersions.id, existingVers[0].id),
            eq(formulaVersions.userUid, uid)
          )
        )
        .returning();
      savedVersion = upd[0];
    } else {
      const labelToUse =
        existingVers.length > 0
          ? `${versionPayload.versionLabel}-${Date.now().toString().slice(-3)}`
          : versionPayload.versionLabel;

      const vIns = await db
        .insert(formulaVersions)
        .values({
          userUid: uid,
          formulaId,
          parentVersionId: versionPayload.parentVersionId ?? null,
          versionLabel: labelToUse,
          status: versionPayload.status,
          versionNotes: versionPayload.versionNotes,
          maturationDays: versionPayload.maturationDays,
          itemsJson: JSON.stringify(versionPayload.items),
        })
        .returning();
      savedVersion = vIns[0];

      await db
        .update(formulas)
        .set({ activeVersionLabel: labelToUse, updatedAt: new Date() })
        .where(and(eq(formulas.id, formulaId), eq(formulas.userUid, uid)));
    }

    return { formulaId, version: savedVersion };
  } catch (error) {
    console.error('Database query failed in saveFormulaAndVersionInDb:', error);
    throw new Error('Failed to save formula version.', { cause: error });
  }
}

export async function saveBatchAndPostInventoryInDb(
  uid: string,
  batchPayload: Partial<PhysicalBatch> & {
    formulaId: number;
    formulaVersionId: number;
    versionLabel: string;
    batchCode: string;
    targetBatchGrams: number;
    status: PhysicalBatch['status'];
    items: PhysicalBatch['items'];
  },
  postInventoryNow: boolean = false
) {
  try {
    await assertFormulaOwnedByUser(uid, batchPayload.formulaId);

    let batchRecord;
    if (batchPayload.id) {
      const upd = await db
        .update(batches)
        .set({
          status: postInventoryNow ? 'Inventory Posted' : batchPayload.status,
          itemsJson: JSON.stringify(batchPayload.items),
          notes: batchPayload.notes || '',
          updatedAt: new Date(),
        })
        .where(and(eq(batches.id, batchPayload.id), eq(batches.userUid, uid)))
        .returning();
      batchRecord = upd[0];
    } else {
      const ins = await db
        .insert(batches)
        .values({
          userUid: uid,
          formulaId: batchPayload.formulaId,
          formulaVersionId: batchPayload.formulaVersionId,
          versionLabel: batchPayload.versionLabel,
          batchCode: batchPayload.batchCode,
          targetBatchGrams: batchPayload.targetBatchGrams,
          status: postInventoryNow ? 'Inventory Posted' : batchPayload.status,
          macerationStartDate:
            batchPayload.macerationStartDate || new Date().toISOString().slice(0, 10),
          itemsJson: JSON.stringify(batchPayload.items),
          notes: batchPayload.notes || '',
        })
        .returning();
      batchRecord = ins[0];
    }

    if (postInventoryNow && batchRecord) {
      for (const line of batchPayload.items) {
        const consumedGrams =
          line.actualWeightGrams !== null && line.actualWeightGrams > 0
            ? line.actualWeightGrams
            : line.targetWeightGrams;

        if (line.lotId && consumedGrams > 0) {
          const lotsFound = await db
            .select()
            .from(inventoryLots)
            .where(and(eq(inventoryLots.id, line.lotId), eq(inventoryLots.userUid, uid)));

          if (lotsFound.length > 0) {
            const lot = lotsFound[0];
            const newRem = Math.max(0, Number((lot.quantityRemainingGrams - consumedGrams).toFixed(3)));
            await db
              .update(inventoryLots)
              .set({ quantityRemainingGrams: newRem, updatedAt: new Date() })
              .where(and(eq(inventoryLots.id, lot.id), eq(inventoryLots.userUid, uid)));

            await db.insert(inventoryMovements).values({
              userUid: uid,
              lotId: lot.id,
              batchId: batchRecord.id,
              movementType: 'Consumed',
              deltaGrams: -consumedGrams,
              theoreticalGrams: line.targetWeightGrams,
              actualGrams: consumedGrams,
              notes: `Posted from batch ${batchPayload.batchCode} (${line.ingredientName})`,
            });
          }
        }
      }
    }

    return batchRecord;
  } catch (error) {
    console.error('Database query failed in saveBatchAndPostInventoryInDb:', error);
    throw new Error('Failed to update production batch.', { cause: error });
  }
}

export async function addExperimentEntryInDb(
  uid: string,
  payload: Omit<ExperimentEntry, 'id'>
) {
  try {
    await assertFormulaOwnedByUser(uid, payload.formulaId);

    const ins = await db
      .insert(experiments)
      .values({
        userUid: uid,
        formulaId: payload.formulaId,
        formulaVersionLabel: payload.formulaVersionLabel,
        batchCode: payload.batchCode,
        stageLabel: payload.stageLabel,
        observation: payload.observation,
        recordedAt: payload.recordedAt,
      })
      .returning();
    return ins[0];
  } catch (error) {
    console.error('Database query failed in addExperimentEntryInDb:', error);
    throw new Error('Failed to save experiment observation.', { cause: error });
  }
}

export async function addEvaluationInDb(
  uid: string,
  payload: Omit<SensoryEvaluation, 'id' | 'createdAt'>
) {
  try {
    await assertFormulaOwnedByUser(uid, payload.formulaId);

    const ins = await db
      .insert(evaluations)
      .values({
        userUid: uid,
        formulaId: payload.formulaId,
        formulaVersionLabel: payload.formulaVersionLabel,
        batchCode: payload.batchCode,
        checkpoint: payload.checkpoint,
        overallScore: payload.overallScore,
        scoresJson: JSON.stringify(payload.scores),
        evaluatedFacetsJson: JSON.stringify(payload.evaluatedFacets),
        openingNotes: payload.openingNotes,
        heartNotes: payload.heartNotes,
        drydownNotes: payload.drydownNotes,
        voiceTranscript: payload.voiceTranscript,
        voiceDurationSeconds: payload.voiceDurationSeconds,
      })
      .returning();
    return ins[0];
  } catch (error) {
    console.error('Database query failed in addEvaluationInDb:', error);
    throw new Error('Failed to save sensory evaluation.', { cause: error });
  }
}

export async function upsertScentMemoryInDb(
  uid: string,
  payload: Omit<ScentMemoryRecord, 'id' | 'lastReviewedAt'>
) {
  try {
    await assertMaterialOwnedByUser(uid, payload.materialId);

    const existing = await db
      .select()
      .from(scentMemories)
      .where(
        and(
          eq(scentMemories.userUid, uid),
          eq(scentMemories.materialId, payload.materialId)
        )
      );

    if (existing.length > 0) {
      const upd = await db
        .update(scentMemories)
        .set({
          myPerception: payload.myPerception.join('|'),
          associatedMemories: payload.associatedMemories.join('|'),
          emotions: payload.emotions.join('|'),
          mentalImages: payload.mentalImages,
          places: payload.places,
          colors: payload.colors,
          textures: payload.textures,
          temperature: payload.temperature,
          strengthScore: payload.strengthScore,
          familiarityScore: payload.familiarityScore,
          blindConfidenceScore: payload.blindConfidenceScore,
          recognitionTrials: payload.recognitionTrials,
          recognitionCorrect: payload.recognitionCorrect,
          lastReviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(scentMemories.id, existing[0].id),
            eq(scentMemories.userUid, uid)
          )
        )
        .returning();
      return upd[0];
    } else {
      const ins = await db
        .insert(scentMemories)
        .values({
          userUid: uid,
          materialId: payload.materialId,
          myPerception: payload.myPerception.join('|'),
          associatedMemories: payload.associatedMemories.join('|'),
          emotions: payload.emotions.join('|'),
          mentalImages: payload.mentalImages,
          places: payload.places,
          colors: payload.colors,
          textures: payload.textures,
          temperature: payload.temperature,
          strengthScore: payload.strengthScore,
          familiarityScore: payload.familiarityScore,
          blindConfidenceScore: payload.blindConfidenceScore,
          recognitionTrials: payload.recognitionTrials,
          recognitionCorrect: payload.recognitionCorrect,
        })
        .returning();
      return ins[0];
    }
  } catch (error) {
    console.error('Database query failed in upsertScentMemoryInDb:', error);
    throw new Error('Failed to update scent memory.', { cause: error });
  }
}

export async function createAccordInDb(
  uid: string,
  payload: Omit<AccordDefinition, 'id'>
) {
  try {
    const ins = await db
      .insert(accords)
      .values({
        userUid: uid,
        name: payload.name,
        category: payload.category,
        description: payload.description,
        objective: payload.objective,
        usageSuggestions: payload.usageSuggestions,
        notes: payload.notes,
        isEducational: payload.isEducational,
        itemsJson: JSON.stringify(payload.items),
        olfactoryProfileJson: JSON.stringify(payload.olfactoryProfile),
      })
      .returning();
    return ins[0];
  } catch (error) {
    console.error('Database query failed in createAccordInDb:', error);
    throw new Error('Failed to save accord.', { cause: error });
  }
}

export async function updateUserSettingsInDb(
  uid: string,
  settings: {
    displayName?: string;
    experienceLevel?: string;
    preferredUnit?: string;
    educationalPrompts?: boolean;
    safetyEnabled?: boolean;
    theme?: string;
    onboardingCompleted?: boolean;
  }
) {
  try {
    const upd = await db
      .update(users)
      .set({
        ...settings,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();
    return upd[0];
  } catch (error) {
    console.error('Database query failed in updateUserSettingsInDb:', error);
    throw new Error('Failed to update user settings.', { cause: error });
  }
}

export async function deleteAccountDataInDb(uid: string) {
  try {
    // Delete all 15 user-scoped tables to guarantee zero orphaned PII or formulation records
    await db.delete(materialUsageReviews).where(eq(materialUsageReviews.userUid, uid));
    await db.delete(evaluations).where(eq(evaluations.userUid, uid));
    await db.delete(experiments).where(eq(experiments.userUid, uid));
    await db.delete(batches).where(eq(batches.userUid, uid));
    await db.delete(formulaVersions).where(eq(formulaVersions.userUid, uid));
    await db.delete(formulas).where(eq(formulas.userUid, uid));
    await db.delete(projects).where(eq(projects.userUid, uid));
    await db.delete(accords).where(eq(accords.userUid, uid));
    await db.delete(inventoryMovements).where(eq(inventoryMovements.userUid, uid));
    await db.delete(inventoryLots).where(eq(inventoryLots.userUid, uid));
    await db.delete(scentMemories).where(eq(scentMemories.userUid, uid));
    await db.delete(materialRegulatoryLimits).where(eq(materialRegulatoryLimits.userUid, uid));
    await db.delete(materials).where(eq(materials.userUid, uid));
    await db.delete(auditLogs).where(eq(auditLogs.userUid, uid));
    await db.delete(users).where(eq(users.uid, uid));
    return { deleted: true };
  } catch (error) {
    console.error('Database query failed in deleteAccountDataInDb:', error);
    throw new Error('Failed to delete account data.', { cause: error });
  }
}
