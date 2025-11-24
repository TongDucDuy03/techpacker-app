import { Types } from 'mongoose';
import dayjs from 'dayjs';
import { getImageData } from '../utils/pdf-image.util';
import sharp from 'sharp';

interface RenderModelOptions {
  printedBy: string;
  generatedAt: Date;
  includeSections?: string[];
}

interface TechPackDocumentLean {
  _id: Types.ObjectId | string;
  productName: string;
  articleCode: string;
  version: string;
  season?: string;
  status?: string;
  supplier?: string;
  technicalDesignerId?: any;
  fabricDescription?: string;
  category?: string;
  gender?: string;
  brand?: string;
  collectionName?: string;
  description?: string;
  notes?: string;
  retailPrice?: number;
  currency?: string;
  createdAt?: Date;
  updatedAt?: Date;
  designSketchUrl?: string;
  bom?: any[];
  measurements?: any[];
  howToMeasure?: any[];
  comments?: any[];
  care?: any[];
  sharedWith?: any[];
  lastExportedAt?: Date;
  colorways?: any[];
  sampleMeasurementRounds?: any[];
  revisions?: any[];
}

const DEFAULT_STRINGS = {
  bomTitle: 'Bill of Materials',
  bomImageSheetTitle: 'BOM Image Sheet',
  emptyBom: 'No materials defined for this TechPack.',
  emptyBomImages: 'No BOM images available.',
  summaryMaterials: 'Materials Overview',
  summarySuppliers: 'Supplier Overview',
  measurementTitle: 'Measurement / Point of Measure',
  measurementSummary: 'Measurement Summary',
  measurementSizes: 'Size Coverage',
  emptyMeasurements: 'No measurements defined for this TechPack.',
  howToMeasureTitle: 'How To Measure',
  howToMeasureSteps: 'Step-by-step instructions',
  howToMeasureTips: 'Tips',
  howToMeasureWarnings: 'Common mistakes',
  howToMeasureRelated: 'Related POM:',
  emptyHowToMeasure: 'No how-to-measure instructions provided.',
  notesTitle: 'Notes & Remarks',
  emptyNotes: 'No additional notes recorded.',
  careSymbolsTitle: 'Care Symbols',
  emptyCareSymbols: 'Care instructions not provided.',
  colorwaysTitle: 'Colorways',
  emptyColorways: 'No colorways defined for this TechPack.',
  sampleRoundsTitle: 'Sample Measurement Rounds',
  emptySampleRounds: 'No sample rounds recorded.',
  sampleRoundsMultiTableTitle: 'Sample Measurement Rounds - Multi-Round Table',
  sampleRoundsRequested: 'Requested (Spec)',
  sampleRoundsMeasured: 'Measured',
  sampleRoundsDiff: 'Diff',
  sampleRoundsRevised: 'Revised',
  sampleRoundsComments: 'Comments',
  sampleRoundsOverallComments: 'Overall Comments',
  revisionsTitle: 'Revision History',
  emptyRevisions: 'No revision history available.',
};

function formatDate(date?: Date, format = 'MMM D, YYYY HH:mm') {
  if (!date) return undefined;
  return dayjs(date).format(format);
}

function currencyFormat(value?: number, currency = 'USD') {
  if (value === undefined || value === null || Number.isNaN(value)) return undefined;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function summarizeNotes(techpack: TechPackDocumentLean) {
  const notes = [];

  if (techpack.description) {
    notes.push({
      title: 'Description',
      body: techpack.description,
      updatedAt: formatDate(techpack.updatedAt),
    });
  }

  if (techpack.notes) {
    notes.push({
      title: 'General Notes',
      body: techpack.notes,
      updatedAt: formatDate(techpack.updatedAt),
    });
  }

  if (techpack.comments && Array.isArray(techpack.comments)) {
    techpack.comments.forEach((comment: any, idx: number) => {
      if (!comment || !comment.text) return;
      notes.push({
        title: comment.title || `Remark ${idx + 1}`,
        body: comment.text,
        updatedAt: comment.updatedAt ? formatDate(comment.updatedAt) : undefined,
      });
    });
  }

  return notes;
}

async function buildBomSection(techpack: TechPackDocumentLean) {
  const materials = Array.isArray(techpack.bom) ? techpack.bom : [];
  const rows = await Promise.all(
    materials.map(async (material: any, index: number) => {
      const thumbnailSource =
        material.thumbnail ||
        material.imageUrl ||
        material.image ||
        material.assetUrl ||
        null;

      const thumbnail = thumbnailSource
        ? await getImageData(thumbnailSource, { width: 60, height: 60 })
        : null;

      const statusBadge = material.approved
        ? { label: 'APPROVED', background: '#dcfce7', color: '#166534' }
        : material.approved === false
          ? { label: 'PENDING', background: '#fef3c7', color: '#92400e' }
          : null;

      // Extract color information - support both backend and frontend field names
      const colorValue = material.color || material.colorCode || '';
      const pantoneValue = material.pantoneCode || '';
      const hexCode = material.hexCode || (colorValue && colorValue.startsWith('#') ? colorValue : null);
      const rgbCode = material.rgbCode || '';

      // Determine material type based on part/category
      const getMaterialType = (part: string, category: string): string => {
        if (!part) return category || 'Other';
        const partLower = part.toLowerCase();
        if (partLower.includes('fabric') || partLower.includes('main fabric') || partLower.includes('lining') || partLower.includes('interfacing')) {
          return 'Fabric';
        }
        if (partLower.includes('label') || partLower.includes('tag') || partLower.includes('hang tag')) {
          return 'Label';
        }
        if (partLower.includes('button') || partLower.includes('zipper') || partLower.includes('snap') || 
            partLower.includes('rivet') || partLower.includes('eyelet') || partLower.includes('buckle') ||
            partLower.includes('d-ring') || partLower.includes('grommet') || partLower.includes('stud') ||
            partLower.includes('hook') || partLower.includes('loop') || partLower.includes('velcro')) {
          return 'Hardware';
        }
        if (partLower.includes('thread') || partLower.includes('elastic') || partLower.includes('drawstring') ||
            partLower.includes('binding') || partLower.includes('piping') || partLower.includes('trim') ||
            partLower.includes('ribbon') || partLower.includes('cord')) {
          return 'Trim';
        }
        if (partLower.includes('embroidery') || partLower.includes('print')) {
          return 'Decoration';
        }
        return category || 'Other';
      };

      return {
        lineNumber: material.lineNumber || index + 1,
        part: material.part,
        materialName: material.materialName || 'Unnamed material',
        materialCode: material.materialCode,
        materialComposition: material.materialComposition || '',
        placement: material.placement,
        size: material.size,
        quantity: material.quantity ? Number(material.quantity).toString() : undefined,
        uom: material.uom,
        supplier: material.supplier,
        supplierCode: material.supplierCode,
        comments: material.comments,
        color: colorValue,
        colorCode: material.colorCode || colorValue,
        pantone: pantoneValue,
        hexCode: hexCode,
        rgbCode: rgbCode,
        leadTime: material.leadTime,
        moq: material.minimumOrder,
        weight: material.weight || '',
        width: material.width || '',
        shrinkage: material.shrinkage || '',
        careInstructions: material.careInstructions || '',
        testingRequirements: material.testingRequirements || '',
        unitPrice: material.unitPrice ? currencyFormat(material.unitPrice, techpack.currency) : undefined,
        totalPrice: material.totalPrice ? currencyFormat(material.totalPrice, techpack.currency) : undefined,
        updatedAt: material.updatedAt ? formatDate(material.updatedAt) : undefined,
        thumbnail,
        category: material.category,
        materialType: getMaterialType(material.part || '', material.category || ''),
        statusBadge,
      };
    })
  );

  const uniqueSuppliers = new Set<string>();
  let withImages = 0;
  let leadTimeSum = 0;
  let leadTimeCount = 0;
  let moqSum = 0;
  let moqCount = 0;

  rows.forEach((row) => {
    if (row.supplier) uniqueSuppliers.add(row.supplier);
    if (row.thumbnail) withImages += 1;
    if (row.leadTime) {
      leadTimeSum += Number(row.leadTime);
      leadTimeCount += 1;
    }
    if (row.moq) {
      moqSum += Number(row.moq);
      moqCount += 1;
    }
  });

  const avgLead =
    leadTimeCount > 0 ? `${Math.round(leadTimeSum / leadTimeCount)} days` : '—';
  const avgMoq = moqCount > 0 ? `${Math.round(moqSum / moqCount)}` : '—';

  return {
    rows,
    stats: {
      uniqueSuppliers: uniqueSuppliers.size,
      withImages,
      categories: new Set(rows.map((row) => row.category || 'Unassigned')).size,
      avgLeadTime: avgLead,
      avgMoq,
    },
  };
}

function buildBomImageSheet(bomRows: any[]) {
  const gridItems: any[] = [];
  bomRows.forEach((row) => {
    gridItems.push({
      image: row.thumbnail,
      name: row.materialName,
      supplier: row.supplier,
      placement: row.placement,
      part: row.part,
    });
  });
  return gridItems;
}

function collectSizeColumns(measurements: any[]) {
  const sizes = new Set<string>();
  measurements.forEach((measurement: any) => {
    const entrySizes = measurement?.sizes;
    if (!entrySizes) return;
    Object.keys(entrySizes).forEach((sizeKey) => {
      if (entrySizes[sizeKey] !== null && entrySizes[sizeKey] !== undefined) {
        sizes.add(sizeKey);
      }
    });
  });

  const ORDER = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL', '6XL'];
  return Array.from(sizes).sort((a, b) => {
    const upperA = a.toUpperCase();
    const upperB = b.toUpperCase();
    const indexA = ORDER.indexOf(upperA);
    const indexB = ORDER.indexOf(upperB);
    if (indexA === -1 && indexB === -1) return upperA.localeCompare(upperB);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

function buildMeasurementRows(techpack: TechPackDocumentLean, sizes: string[]) {
  const rows: any[] = [];
  const measurements = Array.isArray(techpack.measurements) ? techpack.measurements : [];
  let groups = 0;
  let critical = 0;
  let completeRows = 0;

  let currentGroup: string | null = null;

  measurements.forEach((measurement: any) => {
    const groupLabel = measurement.category || measurement.group || measurement.measurementType;
    if (groupLabel && groupLabel !== currentGroup) {
      rows.push({
        isGroup: true,
        label: groupLabel,
      });
      currentGroup = groupLabel;
      groups += 1;
    }

    const sizeValues: Record<string, string> = {};
    let filled = 0;
    sizes.forEach((size) => {
      const raw = measurement.sizes ? measurement.sizes[size] : undefined;
      if (raw === null || raw === undefined || raw === '') {
        sizeValues[size] = '—';
      } else {
        sizeValues[size] = `${raw}`;
        filled += 1;
      }
    });

    if (filled === sizes.length && sizes.length > 0) {
      completeRows += 1;
    }

    if (measurement.critical) critical += 1;

    rows.push({
      isGroup: false,
      pomCode: measurement.pomCode,
      pomName: measurement.pomName,
      toleranceMinus: measurement.toleranceMinus ?? '—',
      tolerancePlus: measurement.tolerancePlus ?? '—',
      sizes: sizeValues,
      notes: measurement.notes,
      type: measurement.measurementType,
      category: measurement.category,
      critical: Boolean(measurement.critical),
      updatedAt: measurement.updatedAt ? formatDate(measurement.updatedAt) : undefined,
    });
  });

  return {
    columns: { sizes },
    rows,
    stats: {
      total: measurements.length,
      critical,
      groups,
      sizeRange: sizes.length ? `${sizes[0]} – ${sizes[sizes.length - 1]}` : 'N/A',
      completeRows,
    },
  };
}

async function buildHowToMeasureSection(techpack: TechPackDocumentLean) {
  const items = Array.isArray(techpack.howToMeasure) ? techpack.howToMeasure : [];

  const sorted = items.sort((a: any, b: any) => {
    const stepA = a.stepNumber ?? 999;
    const stepB = b.stepNumber ?? 999;
    return stepA - stepB;
  });

  return Promise.all(
    sorted.map(async (item: any, index: number) => {
      const image = item.imageUrl
        ? await getImageData(item.imageUrl, { width: 360 })
        : null;

      return {
        title: item.title || `${item.pomCode || 'Step'} ${item.stepNumber || index + 1}`,
        description: item.description || '',
        image,
        steps: item.instructions || [],
        tips: item.tips || [],
        mistakes: item.commonMistakes || [],
        related: item.relatedMeasurements || [],
      };
    })
  );
}

async function buildCareSymbols(techpack: TechPackDocumentLean) {
  const care = Array.isArray((techpack as any).careSymbols)
    ? (techpack as any).careSymbols
    : Array.isArray((techpack as any).care)
      ? (techpack as any).care
      : [];

  return Promise.all(
    care.map(async (item: any) => {
      const image = item.imageUrl
        ? await getImageData(item.imageUrl, { width: 64, height: 64, fit: (sharp as any).fit.contain })
        : null;
      return {
        label: item.label || item.name || 'Care',
        description: item.description,
        image,
      };
    })
  );
}

async function buildColorwaysSection(techpack: TechPackDocumentLean) {
  const colorways = Array.isArray(techpack.colorways) ? techpack.colorways : [];

  return Promise.all(
    colorways.map(async (colorway: any) => {
      const parts = Array.isArray(colorway.parts) ? colorway.parts : [];
      
      const partsData = await Promise.all(
        parts.map(async (part: any) => {
          const partImage = part.imageUrl
            ? await getImageData(part.imageUrl, { width: 80, height: 80 })
            : null;

          return {
            partName: part.partName || '—',
            colorName: part.colorName || '—',
            pantoneCode: part.pantoneCode || '—',
            hexCode: part.hexCode || '#000000',
            rgbCode: part.rgbCode || '—',
            colorType: part.colorType || 'Solid',
            supplier: part.supplier || '—',
            bomItemId: part.bomItemId || '—',
            image: partImage,
          };
        })
      );

      return {
        name: colorway.name || 'Unnamed Colorway',
        code: colorway.code || '—',
        isDefault: Boolean(colorway.isDefault),
        approvalStatus: colorway.approvalStatus || (colorway.approved ? 'Approved' : 'Pending'),
        productionStatus: colorway.productionStatus || 'Lab Dip',
        placement: colorway.placement || '—',
        materialType: colorway.materialType || '—',
        supplier: colorway.supplier || '—',
        pantoneCode: colorway.pantoneCode || '—',
        hexColor: colorway.hexColor || '#000000',
        rgbColor: colorway.rgbColor || null,
        season: colorway.season || '—',
        collectionName: colorway.collectionName || '—',
        notes: colorway.notes || '—',
        parts: partsData,
      };
    })
  );
}

async function buildSampleMeasurementRoundsSection(techpack: TechPackDocumentLean) {
  const rounds = Array.isArray(techpack.sampleMeasurementRounds) ? techpack.sampleMeasurementRounds : [];
  const measurements = Array.isArray(techpack.measurements) ? techpack.measurements : [];

  // Build measurement map for quick lookup
  const measurementMap = new Map<string, any>();
  measurements.forEach((m: any) => {
    const pomCode = m.pomCode || m.point;
    if (pomCode) {
      measurementMap.set(pomCode, m);
      if (m._id) measurementMap.set(m._id.toString(), m);
      if (m.id) measurementMap.set(m.id.toString(), m);
    }
  });

  // Collect all sizes from measurements
  const allSizes = new Set<string>();
  measurements.forEach((m: any) => {
    if (m.sizes) {
      Object.keys(m.sizes).forEach((size) => allSizes.add(size));
    }
  });

  // Also collect from sample rounds
  rounds.forEach((round: any) => {
    if (round.measurements) {
      round.measurements.forEach((entry: any) => {
        ['requested', 'measured', 'diff', 'revised'].forEach((field) => {
          if (entry[field] && typeof entry[field] === 'object') {
            Object.keys(entry[field]).forEach((size) => allSizes.add(size));
          }
        });
      });
    }
  });

  const ORDER = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL', '6XL'];
  const sortedSizes = Array.from(allSizes).sort((a, b) => {
    const upperA = a.toUpperCase();
    const upperB = b.toUpperCase();
    const indexA = ORDER.indexOf(upperA);
    const indexB = ORDER.indexOf(upperB);
    if (indexA === -1 && indexB === -1) return upperA.localeCompare(upperB);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Helper function to calculate diff if not present
  const calculateDiff = (requested: any, measured: any): string | undefined => {
    if (!requested || !measured) return undefined;
    const reqNum = parseFloat(String(requested).replace(',', '.'));
    const measNum = parseFloat(String(measured).replace(',', '.'));
    if (Number.isNaN(reqNum) || Number.isNaN(measNum)) return undefined;
    return (measNum - reqNum).toFixed(1);
  };

  // Helper function to get requested value based on requestedSource
  const getRequestedValue = (entry: any, round: any, previousRound: any, size: string, point?: any): string => {
    // If entry already has requested value, use it
    if (entry && entry.requested && entry.requested[size] && entry.requested[size] !== '—' && entry.requested[size] !== '') {
      return String(entry.requested[size]);
    }

    // If requestedSource is 'previous', get from previous round's revised
    if (round && round.requestedSource === 'previous' && previousRound && previousRound.entries) {
      const pomCode = entry?.pomCode || point?.pomCode;
      const measurementId = entry?.measurementId || point?.measurementId;
      
      const prevEntry = previousRound.entries.find((e: any) => 
        (pomCode && e.pomCode === pomCode) || 
        (measurementId && e.measurementId === measurementId)
      );
      
      if (prevEntry && prevEntry.sizes && prevEntry.sizes[size]) {
        const revised = prevEntry.sizes[size].revised;
        if (revised && revised !== '—' && revised !== '') {
          return String(revised);
        }
      }
    }

    // Otherwise, get from original measurement spec
    const pomCode = entry?.pomCode || point?.pomCode;
    const measurementId = entry?.measurementId || point?.measurementId;
    
    let measurement = null;
    if (measurementId) {
      measurement = measurementMap.get(String(measurementId));
    }
    if (!measurement && pomCode) {
      measurement = measurementMap.get(pomCode);
    }
    
    if (measurement && measurement.sizes && measurement.sizes[size] !== undefined && measurement.sizes[size] !== null) {
      return String(measurement.sizes[size]);
    }

    return '—';
  };

  // Get all unique measurement points - prioritize from original measurements, then from rounds
  const allMeasurementPoints = new Map<string, { pomCode: string; pomName: string; measurementId?: string }>();
  
  // First, add all points from original measurements (this is the source of truth)
  measurements.forEach((m: any) => {
    const pomCode = m.pomCode || '—';
    const pomName = m.pomName || '—';
    if (pomCode !== '—') {
      allMeasurementPoints.set(pomCode, {
        pomCode,
        pomName,
        measurementId: m._id?.toString() || m.id,
      });
    }
  });

  // Then, add any additional points from rounds that might not be in measurements
  rounds.forEach((round: any) => {
    if (round.measurements) {
      round.measurements.forEach((entry: any) => {
        const pomCode = entry.pomCode || entry.point || '—';
        const pomName = entry.pomName || entry.point || '—';
        if (pomCode !== '—' && !allMeasurementPoints.has(pomCode)) {
          allMeasurementPoints.set(pomCode, {
            pomCode,
            pomName,
            measurementId: entry.measurementId,
          });
        }
      });
    }
  });

  // Build entry map for each round for quick lookup
  const buildEntryMap = (entries: any[]) => {
    const map = new Map<string, any>();
    entries.forEach((entry: any) => {
      const key = entry.pomCode || entry.point || '';
      if (key) {
        map.set(key, entry);
        // Also map by measurementId if available
        if (entry.measurementId) {
          map.set(entry.measurementId.toString(), entry);
        }
      }
    });
    return map;
  };

  const roundsData: any[] = [];
  
  rounds.forEach((round: any, roundIndex: number) => {
    const entries = Array.isArray(round.measurements) ? round.measurements : [];
    const previousRound = roundIndex > 0 ? roundsData[roundIndex - 1] : null;
    const entryMap = buildEntryMap(entries);
    
    // Build entries for all measurement points (not just those in this round)
    const entriesData = Array.from(allMeasurementPoints.values()).map((point) => {
      // Find entry for this point in this round
      const entry = entryMap.get(point.pomCode) || 
                    (point.measurementId ? entryMap.get(point.measurementId) : null) ||
                    null;

      const measured = entry?.measured || {};
      const diff = entry?.diff || {};
      const revised = entry?.revised || {};
      const comments = entry?.comments || {};

      const sizeData: Record<string, any> = {};
      sortedSizes.forEach((size) => {
        // Get requested value based on requestedSource
        const requestedValue = getRequestedValue(entry, round, previousRound, size, point);
        const measuredValue = measured[size] || '—';
        
        // Calculate diff if not present
        let diffValue = diff[size];
        if ((!diffValue || diffValue === '—') && requestedValue !== '—' && measuredValue !== '—') {
          diffValue = calculateDiff(requestedValue, measuredValue);
        }
        if (!diffValue || diffValue === '—') diffValue = '—';

        // Determine diff color class
        let diffClass = 'diff-neutral';
        if (diffValue !== '—') {
          const diffNum = parseFloat(String(diffValue).replace(',', '.'));
          if (!Number.isNaN(diffNum)) {
            if (diffNum === 0) {
              diffClass = 'diff-perfect'; // Perfect match - green
            } else if (diffNum > 0) {
              diffClass = 'diff-over'; // Over spec - red
            } else {
              diffClass = 'diff-under'; // Under spec - orange/yellow
            }
          }
        }

        sizeData[size] = {
          requested: requestedValue,
          measured: measuredValue,
          diff: diffValue,
          diffClass,
          revised: revised[size] || '—',
          comments: comments[size] || '—',
        };
      });

      return {
        pomCode: point.pomCode,
        pomName: point.pomName,
        measurementId: point.measurementId || '—',
        sizes: sizeData,
      };
    });

    roundsData.push({
      name: round.name || `Round ${roundIndex + 1}`,
      date: round.measurementDate ? formatDate(new Date(round.measurementDate)) : (round.date ? formatDate(new Date(round.date)) : '—'),
      reviewer: round.reviewer || '—',
      overallComments: round.overallComments || '—',
      requestedSource: round.requestedSource || 'original',
      order: round.order || roundIndex + 1,
      entries: entriesData,
    });
  });

  // Build unified measurement points list (all unique POMs across all rounds)
  const unifiedMeasurementPoints = Array.from(allMeasurementPoints.values()).sort((a, b) => {
    return a.pomCode.localeCompare(b.pomCode);
  });

  return {
    rounds: roundsData,
    sizes: sortedSizes,
    measurementPoints: unifiedMeasurementPoints, // ✅ Added: unified list of all measurement points
    stats: {
      totalRounds: roundsData.length,
      totalEntries: roundsData.reduce((sum, r) => sum + r.entries.length, 0),
      totalMeasurementPoints: unifiedMeasurementPoints.length,
    },
  };
}

function buildRevisionSection(techpack: TechPackDocumentLean) {
  const revisions = Array.isArray(techpack.revisions) ? techpack.revisions : [];

  return revisions.map((rev: any, index: number) => {
    return {
      revisionNumber: rev.revisionNumber || index + 1,
      version: rev.version || '—',
      createdAt: rev.createdAt ? formatDate(new Date(rev.createdAt)) : '—',
      createdBy: rev.createdBy || '—',
      createdByName: rev.createdByName || '—',
      description: rev.description || rev.changeDescription || '—',
      changes: rev.changes || [],
      status: rev.status || '—',
    };
  });
}

export async function buildRenderModel(
  techpack: any,
  options: RenderModelOptions
) {
  const generatedAt = options.generatedAt || new Date();
  const designer =
    techpack.technicalDesignerId && typeof techpack.technicalDesignerId === 'object'
      ? `${techpack.technicalDesignerId.firstName || ''} ${techpack.technicalDesignerId.lastName || ''}`.trim()
      : techpack.technicalDesignerId || '—';

  const currency = techpack.currency || 'USD';
  const bom = await buildBomSection(techpack);
  const bomImages = buildBomImageSheet(bom.rows).slice(0, 48);

  const measurementSizes = collectSizeColumns(techpack.measurements || []);
  const measurements = buildMeasurementRows(techpack, measurementSizes);
  const howToMeasure = await buildHowToMeasureSection(techpack);
  const notes = summarizeNotes(techpack);
  const careSymbols = await buildCareSymbols(techpack);
  const colorways = await buildColorwaysSection(techpack);
  const sampleRounds = await buildSampleMeasurementRoundsSection(techpack);
  const revisions = buildRevisionSection(techpack);

  const summary = {
    bomCount: bom.rows.length,
    uniqueSuppliers: bom.stats.uniqueSuppliers,
    approvedMaterials: bom.rows.filter((row) => row.statusBadge?.label === 'APPROVED').length,
    measurementCount: measurements.stats.total,
    criticalMeasurements: measurements.stats.critical,
    sizeRange: measurements.stats.sizeRange,
    howToMeasureCount: howToMeasure.length,
    howToMeasureWithImage: howToMeasure.filter((item) => item.image).length,
    howToMeasureTips: howToMeasure.reduce((acc, item) => acc + (item.tips?.length || 0), 0),
    notesCount: notes.length,
    careSymbolCount: careSymbols.length,
    colorwaysCount: colorways.length,
    sampleRoundsCount: sampleRounds.rounds.length,
    revisionsCount: revisions.length,
    lastExport: formatDate(techpack.lastExportedAt),
  };

  const coverImage =
    techpack.designSketchUrl
      ? await getImageData(techpack.designSketchUrl, { width: 800, height: 600, fit: (sharp as any).fit.cover })
      : null;

  const companyLogo =
    techpack.companyLogoUrl
      ? await getImageData(techpack.companyLogoUrl, {
          width: 600,
          height: 220,
          fit: (sharp as any).fit.contain,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
      : null;

  const meta = {
    productName: techpack.productName,
    articleCode: techpack.articleCode,
    version: techpack.version,
    season: techpack.season,
    lifecycleStage: techpack.status,
    supplier: techpack.supplier,
    designer: designer || '—',
    category: techpack.category,
    gender: techpack.gender,
    brand: techpack.brand,
    collectionName: techpack.collectionName,
    fabricDescription: techpack.fabricDescription,
    description: techpack.description,
    notes: techpack.notes,
    currency,
    retailPrice: currencyFormat(techpack.retailPrice, currency),
    createdAt: techpack.createdAt,
    updatedAt: techpack.updatedAt,
    createdAtFormatted: formatDate(techpack.createdAt),
    updatedAtFormatted: formatDate(techpack.updatedAt),
    companyLogo,
    companyLogoUrl: techpack.companyLogoUrl,
  };

  return {
    pageTitle: `${techpack.productName} — TechPack`,
    meta,
    summary,
    bom,
    bomImages,
    measurements,
    howToMeasure,
    notes,
    careSymbols,
    colorways,
    sampleRounds,
    revisions,
    images: {
      coverImage,
      companyLogo,
    },
    strings: DEFAULT_STRINGS,
    printedBy: options.printedBy,
    generatedAt: formatDate(generatedAt),
  };
}

