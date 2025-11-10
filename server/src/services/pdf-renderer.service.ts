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

      return {
        lineNumber: material.lineNumber || index + 1,
        part: material.part,
        materialName: material.materialName || 'Unnamed material',
        materialCode: material.materialCode,
        placement: material.placement,
        size: material.size,
        quantity: material.quantity ? Number(material.quantity).toString() : undefined,
        uom: material.uom,
        supplier: material.supplier,
        comments: material.comments,
        color: material.color,
        pantone: material.pantoneCode,
        leadTime: material.leadTime,
        moq: material.minimumOrder,
        unitPrice: material.unitPrice ? currencyFormat(material.unitPrice, techpack.currency) : undefined,
        totalPrice: material.totalPrice ? currencyFormat(material.totalPrice, techpack.currency) : undefined,
        updatedAt: material.updatedAt ? formatDate(material.updatedAt) : undefined,
        thumbnail,
        category: material.category,
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
    lastExport: formatDate(techpack.lastExportedAt),
  };

  const coverImage =
    techpack.designSketchUrl
      ? await getImageData(techpack.designSketchUrl, { width: 600, height: 400, fit: (sharp as any).fit.cover })
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
    images: {
      coverImage,
    },
    strings: DEFAULT_STRINGS,
    printedBy: options.printedBy,
    generatedAt: formatDate(generatedAt),
  };
}

