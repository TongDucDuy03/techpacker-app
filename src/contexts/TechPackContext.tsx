import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { ApiTechPack, CreateTechPackInput, TechPackListResponse, TechPackFormState, MeasurementPoint, HowToMeasure, BomItem, Colorway, ColorwayPart, MeasurementSampleRound, MeasurementSampleEntry, MeasurementSampleValueMap, MeasurementRequestedSource, SIZE_RANGES } from '../types/techpack';
import { normalizeMeasurementBaseSizes } from '../utils/measurements';
import { api } from '../lib/api';
import { showPromise, showError } from '../lib/toast';
import { exportTechPackToPDF as clientExportToPDF } from '../utils/pdfExport';
import { DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR, DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR } from '../constants/measurementDisplay';

interface TechPackContextType {
  techPacks: ApiTechPack[];
  loading: boolean;
  pagination: Omit<TechPackListResponse, 'data'>;
  state: TechPackFormState;
  revisions: any[];
  revisionsLoading: boolean;
  revisionPagination: any;
  loadTechPacks: (params?: { page?: number; limit?: number; q?: string; status?: string }) => Promise<void>;
  createTechPack: (data: CreateTechPackInput) => Promise<ApiTechPack | undefined>;
  updateTechPack: (id: string, data: Partial<ApiTechPack>) => Promise<ApiTechPack | undefined>;
  deleteTechPack: (id: string) => Promise<void>;
  getTechPack: (id: string) => Promise<ApiTechPack | undefined>;
  loadRevisions: (techPackId: string, params?: any) => Promise<void>;
  revertToRevision: (techPackId: string, revisionId: string) => Promise<string | undefined>;
  setCurrentTab: (tab: number) => void;
  updateFormState: (updates: Partial<ApiTechPack>) => void;
  resetFormState: () => void;
  saveTechPack: () => Promise<void>;
  exportToPDF: () => void;
  addMeasurement: (measurement: MeasurementPoint) => void;
  updateMeasurement: (index: number, measurement: MeasurementPoint) => void;
  deleteMeasurement: (index: number) => void;
  addSampleMeasurementRound: (round?: Partial<MeasurementSampleRound>) => void;
  updateSampleMeasurementRound: (roundId: string, updates: Partial<MeasurementSampleRound>) => void;
  deleteSampleMeasurementRound: (roundId: string) => void;
  updateSampleMeasurementEntry: (roundId: string, entryId: string, updates: Partial<MeasurementSampleEntry>) => void;
  addHowToMeasure: (howToMeasure: HowToMeasure) => void;
  updateHowToMeasure: (index: number, howToMeasure: HowToMeasure) => void;
  updateHowToMeasureById: (id: string, howToMeasure: HowToMeasure) => void;
  deleteHowToMeasure: (index: number) => void;
  deleteHowToMeasureById: (id: string) => void;
  insertHowToMeasureAt: (index: number, howToMeasure: HowToMeasure) => void;
  addBomItem: (bomItem: BomItem) => void;
  updateBomItem: (index: number, bomItem: BomItem) => void;
  updateBomItemById: (id: string, bomItem: BomItem) => void;
  deleteBomItem: (index: number) => void;
  deleteBomItemById: (id: string) => void;
  insertBomItemAt: (index: number, bomItem: BomItem) => void;
  addColorway: (colorway: Colorway) => void;
  updateColorway: (index: number, colorway: Colorway) => void;
  updateColorwayById: (id: string, colorway: Colorway) => void;
  deleteColorway: (index: number) => void;
  deleteColorwayById: (id: string) => void;
  assignColorwayToBomItem: (colorwayId: string, bomItemId: string, data?: Partial<ColorwayPart>) => void;
  removeColorwayAssignment: (colorwayId: string, bomItemId: string) => void;
  updateMeasurementSizeRange: (sizes: string[]) => void;
  updateMeasurementBaseSize: (baseSize: string) => void;
  updateMeasurementDisplaySettings: (settings: { baseHighlightColor?: string; rowStripeColor?: string }) => void;
}

const TechPackContext = createContext<TechPackContextType | undefined>(undefined);

const TECHPACK_DRAFT_STORAGE_PREFIX = 'techpack:draft:';
const TECHPACK_DRAFT_VERSION = 1;
const TECHPACK_LIST_CACHE_KEY = 'techpack:list:cache';
const TECHPACK_LIST_PAGINATION_CACHE_KEY = 'techpack:list:pagination';

type PartialColorway = Partial<Colorway> & { parts?: Array<Partial<ColorwayPart>> };

const getDraftStorageKey = (techpackId?: string) => `${TECHPACK_DRAFT_STORAGE_PREFIX}${techpackId && techpackId.trim() ? techpackId : 'new'}`;

const safeString = (value?: string | null): string => (typeof value === 'string' ? value.trim() : '');

const normalizeHexColor = (value?: string | null): string => {
  const raw = safeString(value);
  if (!raw) return '';
  const normalized = raw.startsWith('#')
    ? raw.toUpperCase()
    : `#${raw.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6).toUpperCase()}`;
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : '';
};

const hexToRgb = (hex: string | undefined) => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return undefined;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return { r, g, b };
};

const resolveMeasurementBaseSize = (
  candidate: string | undefined,
  sizeRange: string[],
  measurements: MeasurementPoint[]
): string => {
  if (candidate && sizeRange.includes(candidate)) {
    return candidate;
  }
  const measurementBase = measurements.find(
    measurement => measurement.baseSize && sizeRange.includes(measurement.baseSize)
  )?.baseSize;
  if (measurementBase) {
    return measurementBase;
  }
  return sizeRange[0] || '';
};

const resolveMeasurementColor = (value: string | undefined, fallback: string): string => {
  const normalized = normalizeHexColor(value);
  return normalized || fallback;
};

const allowedColorTypes: ColorwayPart['colorType'][] = ['Solid', 'Print', 'Embroidery', 'Applique'];

type BomLookup = {
  byId: Map<string, BomItem>;
  byPartName: Map<string, BomItem[]>;
};

const buildBomLookup = (bomItems?: BomItem[]): BomLookup => {
  const byId = new Map<string, BomItem>();
  const byPartName = new Map<string, BomItem[]>();

  (bomItems || []).forEach(item => {
    const rawIds = [
      safeString((item as any)?.id),
      safeString((item as any)?._id),
    ].filter(Boolean) as string[];

    rawIds.forEach(id => {
      byId.set(id, item);
      byId.set(id.toLowerCase(), item);
    });

    const partKey = safeString(item.part).toLowerCase();
    if (partKey) {
      if (!byPartName.has(partKey)) {
        byPartName.set(partKey, []);
      }
      byPartName.get(partKey)!.push(item);
    }
  });

  return { byId, byPartName };
};

const resolveBomItem = (lookup: BomLookup | undefined, bomItemId?: string, partName?: string): BomItem | undefined => {
  if (!lookup) return undefined;

  const normalizedId = safeString(bomItemId);
  if (normalizedId) {
    const directMatch = lookup.byId.get(normalizedId) || lookup.byId.get(normalizedId.toLowerCase());
    if (directMatch) {
      return directMatch;
    }
  }

  const normalizedPart = safeString(partName).toLowerCase();
  if (normalizedPart) {
    const partMatches = lookup.byPartName.get(normalizedPart);
    if (partMatches && partMatches.length > 0) {
      return partMatches[0];
    }
  }

  return undefined;
};

const sanitizeColorwayPart = (
  part: Partial<ColorwayPart> | undefined,
  colorwayIndex: number,
  partIndex: number,
  fallbackColorName: string,
  fallbackHex: string,
  bomLookup?: BomLookup
): ColorwayPart => {
  const resolvedHex = normalizeHexColor(part?.hexCode) || fallbackHex || '#000000';
  const resolvedColorType = allowedColorTypes.includes((part?.colorType as any))
    ? (part?.colorType as ColorwayPart['colorType'])
    : 'Solid';

  const linkedBom = resolveBomItem(bomLookup, (part as any)?.bomItemId || part?.bomItemId, part?.partName);
  const resolvedBomItemId =
    safeString(part?.bomItemId) ||
    safeString((part as any)?.bomItemId) ||
    safeString((linkedBom as any)?._id) ||
    safeString((linkedBom as any)?.id);

  const resolvedPartName =
    safeString(part?.partName) ||
    linkedBom?.part ||
    `Part ${partIndex + 1}`;

  const resolvedColorName =
    safeString(part?.colorName) ||
    fallbackColorName ||
    linkedBom?.materialName ||
    `Color ${partIndex + 1}`;

  return {
    id: safeString((part as any)?.id) || safeString((part as any)?._id) || `part_${colorwayIndex}_${partIndex}`,
    bomItemId: resolvedBomItemId || undefined,
    partName: resolvedPartName,
    colorName: resolvedColorName,
    pantoneCode: safeString(part?.pantoneCode) || linkedBom?.pantoneCode || undefined,
    hexCode: resolvedHex,
    rgbCode: safeString(part?.rgbCode) || undefined,
    imageUrl: safeString((part as any)?.imageUrl) || undefined,
    supplier: safeString(part?.supplier) || linkedBom?.supplier || undefined,
    colorType: resolvedColorType,
  } as ColorwayPart;
};

const sanitizeColorway = (rawColorway: PartialColorway, index: number, bomLookup?: BomLookup): Colorway => {
  const rawName = safeString(rawColorway.name) || safeString((rawColorway as any).colorwayName);
  const rawCode = safeString(rawColorway.code) || safeString((rawColorway as any).colorwayCode);
  const sanitizedName = rawName || rawCode || `Colorway ${index + 1}`;
  const sanitizedCode = rawCode
    || sanitizedName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase()
    || `CW-${String(index + 1).padStart(2, '0')}`;

  const normalizedHex = normalizeHexColor(rawColorway.hexColor);
  const rawId = safeString(rawColorway.id as string) || safeString((rawColorway as any)._id);

  const rawApproval = safeString(rawColorway.approvalStatus as string).replace(/\s+/g, ' ');
  const normalizedApproval = ['Pending', 'Approved', 'Rejected'].includes(rawApproval)
    ? (rawApproval as Colorway['approvalStatus'])
    : undefined;
  const approvedFlag = (rawColorway as any).approved;
  const resolvedApprovalStatus: Colorway['approvalStatus'] = normalizedApproval
    || (approvedFlag === true ? 'Approved' : 'Pending');

  const rawProduction = safeString(rawColorway.productionStatus as string);
  const resolvedProductionStatus: Colorway['productionStatus'] = ['Lab Dip', 'Bulk Fabric', 'Finished'].includes(rawProduction)
    ? (rawProduction as Colorway['productionStatus'])
    : 'Lab Dip';

  const sanitizedParts: ColorwayPart[] = Array.isArray(rawColorway.parts)
    ? rawColorway.parts.map((part, partIndex) =>
        sanitizeColorwayPart(part, index, partIndex, sanitizedName, normalizedHex, bomLookup)
      )
    : [];

  const primaryPart = sanitizedParts[0];
  const sanitizedPlacement = safeString(rawColorway.placement) || primaryPart?.partName || 'Main Body';
  const materialFromPart = primaryPart?.colorType && primaryPart.colorType !== 'Solid'
    ? primaryPart.colorType
    : undefined;
  const sanitizedMaterialType = safeString(rawColorway.materialType) || materialFromPart || 'General';
  const resolvedHex = normalizedHex || primaryPart?.hexCode || '#000000';
  const sanitizedPantone = safeString(rawColorway.pantoneCode) || primaryPart?.pantoneCode || '';

  return {
    id: rawId || `colorway_${Date.now()}_${index}`,
    _id: typeof rawColorway._id === 'string' ? rawColorway._id : undefined,
    name: sanitizedName,
    code: sanitizedCode,
    placement: sanitizedPlacement,
    materialType: sanitizedMaterialType,
    season: safeString(rawColorway.season) || safeString((rawColorway as any).season) || undefined,
    isDefault: !!rawColorway.isDefault,
    approvalStatus: resolvedApprovalStatus,
    productionStatus: resolvedProductionStatus,
    pantoneCode: sanitizedPantone || undefined,
    hexColor: resolvedHex,
    rgbColor: hexToRgb(resolvedHex),
    supplier: safeString(rawColorway.supplier) || safeString((rawColorway as any).supplier) || undefined,
    notes: safeString(rawColorway.notes) || safeString((rawColorway as any).notes) || undefined,
    collectionName: safeString(rawColorway.collectionName) || safeString((rawColorway as any).collectionName) || undefined,
    imageUrl: (() => {
      const url = safeString(rawColorway.imageUrl) || safeString((rawColorway as any).imageUrl);
      return url || undefined;
    })(),
    parts: sanitizedParts,
  };
};

const sanitizeColorwayList = (
  colorways?: Array<PartialColorway | Colorway>,
  bomItems?: BomItem[],
  options: { bestEffort?: boolean } = {}
): Colorway[] => {
  if (!Array.isArray(colorways)) return [];
  const lookup = buildBomLookup(bomItems);
  return colorways.map((colorway, index) => {
    try {
      return sanitizeColorway(colorway, index, lookup);
    } catch (error) {
      console.warn('Failed to sanitize colorway', colorway, error);
      if (options.bestEffort) {
        return {
          id: `colorway_${Date.now()}_${index}`,
          name: safeString((colorway as any)?.name) || `Colorway ${index + 1}`,
          code: safeString((colorway as any)?.code) || `CW-${index + 1}`,
          placement: safeString((colorway as any)?.placement) || 'Main Body',
          materialType: safeString((colorway as any)?.materialType) || 'General',
          parts: [],
          approvalStatus: 'Pending',
          productionStatus: 'Lab Dip',
          isDefault: false,
        } as Colorway;
      }
      throw error;
    }
  });
};

const generateClientId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const DEFAULT_SAMPLE_ROUND_NAME = '1st Proto';

const buildPointLabel = (entry: Partial<MeasurementSampleEntry>, measurement?: MeasurementPoint): string => {
  const code = measurement?.pomCode || entry.pomCode || '';
  const name = measurement?.pomName || entry.pomName || '';
  if (code && name) return `${code} - ${name}`;
  return name || code || entry.point || 'Measurement Point';
};

type SampleEntryFieldValue = MeasurementSampleValueMap | Record<string, any> | string | number | null | undefined;

const isPlainRecord = (value: any): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Map);

const convertMapToRecord = (value: SampleEntryFieldValue): Record<string, any> | undefined => {
  if (!value) return undefined;

  if (value instanceof Map) {
    const obj: Record<string, any> = {};
    value.forEach((mapValue, key) => {
      obj[String(key)] = mapValue;
    });
    return obj;
  }

  if (isPlainRecord(value)) {
    return value;
  }

  return undefined;
};

const coerceToSampleString = (value: any): string =>
  value === null || value === undefined ? '' : String(value);

const collectKeysFromValue = (value?: SampleEntryFieldValue): string[] => {
  if (!isPlainRecord(value)) return [];
  return Object.keys(value);
};

const collectEntrySizeKeys = (entry?: Partial<MeasurementSampleEntry>): string[] => {
  if (!entry) return [];
  const keySet = new Set<string>();
  const addFromValue = (value?: SampleEntryFieldValue) => {
    collectKeysFromValue(value).forEach(key => keySet.add(key));
  };

  addFromValue(entry.requested);
  addFromValue(entry.measured);
  addFromValue(entry.diff);
  addFromValue(entry.revised);
  addFromValue(entry.comments);

  return Array.from(keySet);
};

const resolveSizeKeys = (measurement?: MeasurementPoint, entry?: Partial<MeasurementSampleEntry>): string[] => {
  const keys: string[] = [];
  const push = (key?: string) => {
    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  };

  if (measurement?.sizes) {
    Object.keys(measurement.sizes).forEach(push);
  }

  collectEntrySizeKeys(entry).forEach(push);

  return keys;
};

const normalizeValueMap = (
  sizeKeys: string[],
  source?: SampleEntryFieldValue,
  defaults: MeasurementSampleValueMap = {}
): MeasurementSampleValueMap => {
  const normalized: MeasurementSampleValueMap = { ...defaults };

  sizeKeys.forEach(size => {
    if (!(size in normalized)) {
      normalized[size] = '';
    }
  });

  const sourceRecord = convertMapToRecord(source);
  if (sourceRecord) {
    Object.entries(sourceRecord).forEach(([size, value]) => {
      normalized[size] = coerceToSampleString(value);
    });
  } else if (source !== null && source !== undefined && source !== '') {
    const fallbackKey = sizeKeys[0] || 'ALL';
    normalized[fallbackKey] = coerceToSampleString(source);
  }

  return normalized;
};

const buildRequestedValueMap = (
  measurement?: MeasurementPoint,
  sizeKeys: string[] = [],
  fallback?: SampleEntryFieldValue
): MeasurementSampleValueMap => {
  const measurementValues =
    measurement?.sizes && Object.keys(measurement.sizes).length > 0
      ? Object.entries(measurement.sizes).reduce<MeasurementSampleValueMap>((acc, [size, value]) => {
          acc[size] = value === null || value === undefined ? '' : String(value);
          return acc;
        }, {})
      : undefined;

  const fallbackValues = convertMapToRecord(fallback);
  const combinedKeys = Array.from(
    new Set([
      ...sizeKeys,
      ...(measurementValues ? Object.keys(measurementValues) : []),
      ...(fallbackValues ? Object.keys(fallbackValues) : []),
    ])
  );

  // Nếu có fallback values (từ round trước), merge với measurement values (original spec)
  // Các size có trong fallback sẽ dùng giá trị từ fallback, các size không có sẽ dùng từ measurement
  // Điều này đảm bảo các giá trị không thay đổi giữ nguyên giá trị ban đầu
  if (fallbackValues && Object.keys(fallbackValues).length > 0) {
    // Check if fallback has any non-empty values
    const hasNonEmptyValues = Object.values(fallbackValues).some(v => v && String(v).trim() !== '');
    if (hasNonEmptyValues) {
      // Merge: fallback values (ưu tiên) + measurement values (cho các size không có trong fallback)
      return normalizeValueMap(combinedKeys.length ? combinedKeys : Object.keys(fallbackValues), fallbackValues, measurementValues ?? {});
    }
  }

  // Luôn ưu tiên measurement values (original spec) khi có
  if (measurementValues) {
    return normalizeValueMap(combinedKeys.length ? combinedKeys : Object.keys(measurementValues), undefined, measurementValues);
  }

  return normalizeValueMap(sizeKeys, fallback);
};

const cloneValueMap = (values?: MeasurementSampleValueMap): MeasurementSampleValueMap | undefined => {
  if (!values) return undefined;
  const sourceRecord = convertMapToRecord(values) ?? values;

  const entries = Object.entries(sourceRecord).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) return undefined;
  return entries.reduce<MeasurementSampleValueMap>((acc, [size, value]) => {
    acc[size] = typeof value === 'string' ? value : String(value);
    return acc;
  }, {});
};

const pickRequestedFromPreviousEntry = (entry?: MeasurementSampleEntry): MeasurementSampleValueMap | undefined => {
  if (!entry) return undefined;
  // Ưu tiên lấy từ revised của round trước
  // Nếu không có revised, không lấy từ measured (sẽ dùng original spec)
  // Điều này đảm bảo: nếu có revised thì dùng revised, nếu không thì dùng original spec
  return cloneValueMap(entry.revised);
};

const findEntryMatchingMeasurement = (
  round: MeasurementSampleRound | undefined,
  measurement: MeasurementPoint | undefined
): MeasurementSampleEntry | undefined => {
  if (!round || !measurement) return undefined;
  if (measurement.id) {
    const byId = round.measurements.find(entry => entry.measurementId === measurement.id);
    if (byId) return byId;
  }
  if (measurement.pomCode) {
    const byCode = round.measurements.find(entry => entry.pomCode === measurement.pomCode);
    if (byCode) return byCode;
  }
  return undefined;
};

const generateEntriesForRequestedSource = (
  measurements: MeasurementPoint[],
  requestedSource: MeasurementRequestedSource,
  previousRound?: MeasurementSampleRound
): MeasurementSampleEntry[] => {
  if (!Array.isArray(measurements) || measurements.length === 0) return [];

  const buildRequestedOverrides = (measurement: MeasurementPoint, fallback?: MeasurementSampleValueMap): MeasurementSampleValueMap | undefined => {
    if (!fallback || Object.keys(fallback).length === 0) {
      return undefined;
    }

    const merged: MeasurementSampleValueMap = {};
    const sizeSet = new Set<string>();

    Object.keys(measurement?.sizes || {}).forEach(size => sizeSet.add(size));
    Object.keys(fallback).forEach(size => sizeSet.add(size));

    sizeSet.forEach(size => {
      if (fallback[size] !== undefined) {
        merged[size] = fallback[size];
      } else if (measurement?.sizes && measurement.sizes[size] !== undefined) {
        merged[size] = String(measurement.sizes[size]);
      } else {
        merged[size] = '';
      }
    });

    return merged;
  };

  return measurements.map(measurement => {
    const fallbackRequested =
      requestedSource === 'previous'
        ? pickRequestedFromPreviousEntry(findEntryMatchingMeasurement(previousRound, measurement))
        : undefined;
    const requested = buildRequestedOverrides(measurement, fallbackRequested);

    return createSampleEntryFromMeasurement(measurement, {
      requested,
      measured: {},
      diff: {},
      revised: {},
      comments: {},
    });
  });
};

const normalizeSampleEntry = (
  entry: Partial<MeasurementSampleEntry>,
  measurement?: MeasurementPoint
): MeasurementSampleEntry => {
  const sizeKeys = resolveSizeKeys(measurement, entry);
  const requested = buildRequestedValueMap(measurement, sizeKeys, entry.requested);
  const measured = normalizeValueMap(sizeKeys, entry.measured);
  const diff = normalizeValueMap(sizeKeys, entry.diff);
  const revised = normalizeValueMap(sizeKeys, entry.revised);
  const comments = normalizeValueMap(sizeKeys, entry.comments);

  return {
    id: entry.id || generateClientId('sample-entry'),
    measurementId: entry.measurementId || measurement?.id,
    point: entry.point || buildPointLabel(entry, measurement),
    requested,
    measured,
    diff,
    revised,
    comments,
    pomCode: measurement?.pomCode || entry.pomCode,
    pomName: measurement?.pomName || entry.pomName,
  };
};

const createSampleEntryFromMeasurement = (
  measurement: MeasurementPoint,
  overrides?: Partial<MeasurementSampleEntry>
): MeasurementSampleEntry =>
  normalizeSampleEntry(
    {
      measurementId: measurement.id,
      pomCode: measurement.pomCode,
      pomName: measurement.pomName,
      ...overrides,
    },
    measurement
  );

const normalizeSampleRound = (round: Partial<MeasurementSampleRound>): MeasurementSampleRound => {
  // Khi load từ server, có thể có _id thay vì id
  const roundId = round.id || (round as any)._id?.toString() || generateClientId('sample-round');
  // Khi load từ server, date có thể là measurementDate
  const roundDate = round.date || (round as any).measurementDate || new Date().toISOString();
  // Đảm bảo reviewer được map đúng từ API response
  const reviewer = round.reviewer || (round as any).reviewerName || '';
  
  return {
    id: roundId,
    name: round.name || DEFAULT_SAMPLE_ROUND_NAME,
    date: typeof roundDate === 'string' ? roundDate : new Date(roundDate).toISOString(),
    reviewer: reviewer,
    requestedSource: round.requestedSource || 'original',
    overallComments: round.overallComments ?? '',
    measurements: Array.isArray(round.measurements)
      ? round.measurements.map(entry => normalizeSampleEntry(entry))
      : [],
  };
};

const syncRoundWithMeasurements = (
  round: MeasurementSampleRound,
  measurements: MeasurementPoint[]
): MeasurementSampleRound => {
  if (!measurements || measurements.length === 0) {
    return {
      ...round,
      measurements: round.measurements.map(entry => normalizeSampleEntry(entry)),
    };
  }

  const measurementMap = new Map(measurements.map(measurement => [measurement.id, measurement]));

  const filteredEntries = round.measurements
    .filter(entry => !entry.measurementId || measurementMap.has(entry.measurementId))
    .map(entry => {
      const measurement = entry.measurementId ? measurementMap.get(entry.measurementId) : undefined;
      return normalizeSampleEntry(entry, measurement);
    });

  measurementMap.forEach(measurement => {
    const hasEntry = filteredEntries.some(entry => entry.measurementId === measurement.id);
    if (!hasEntry) {
      filteredEntries.push(createSampleEntryFromMeasurement(measurement));
    }
  });

  return {
    ...round,
    measurements: filteredEntries,
  };
};

const normalizeSampleRounds = (
  rounds: MeasurementSampleRound[] | undefined,
  measurements: MeasurementPoint[]
): MeasurementSampleRound[] => {
  const normalizedRounds = Array.isArray(rounds) && rounds.length > 0
    ? rounds.map(round => normalizeSampleRound(round))
    : [];

  const baseRounds =
    normalizedRounds.length > 0
      ? normalizedRounds
      : measurements.length > 0
        ? [
            normalizeSampleRound({
              name: DEFAULT_SAMPLE_ROUND_NAME,
              measurements: measurements.map(measurement => createSampleEntryFromMeasurement(measurement)),
            }),
          ]
        : [];

  return baseRounds.map(round => syncRoundWithMeasurements(round, measurements));
};

const parseNumericValue = (value: string | number | null | undefined): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const prepareValueMapForSave = (
  values?: MeasurementSampleValueMap,
  options: { keepEmpty?: boolean; preserveWhitespace?: boolean } = {}
): Record<string, string> | undefined => {
  if (!values) {
    return options.keepEmpty ? {} : undefined;
  }

  const result: Record<string, string> = {};

  Object.entries(values).forEach(([size, value]) => {
    const raw = value === null || value === undefined ? '' : String(value);
    const normalized = options.preserveWhitespace ? raw : raw.trim();
    if (normalized || options.keepEmpty) {
      result[size] = normalized;
    }
  });

  if (Object.keys(result).length === 0) {
    return options.keepEmpty ? {} : undefined;
  }

  return result;
};

const createEmptyTechpack = (): TechPackFormState['techpack'] => ({
  id: '',
  articleInfo: {
    articleCode: '',
    productName: '',
    version: 1,
    gender: 'Unisex',
    productClass: '',
    fitType: 'Regular',
    supplier: '',
    technicalDesignerId: '',
    fabricDescription: '',
    productDescription: '',
    designSketchUrl: '',
    companyLogoUrl: '',
    season: 'SS25',
    lifecycleStage: 'Concept',
    createdDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
  },
  bom: [],
  measurements: [],
  sampleMeasurementRounds: [],
  howToMeasures: [],
  colorways: [],
  revisionHistory: [],
  status: 'Draft',
  measurementSizeRange: [...SIZE_RANGES['Unisex']],
  measurementBaseSize: SIZE_RANGES['Unisex'][0],
  measurementBaseHighlightColor: DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR,
  measurementRowStripeColor: DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR,
  packingNotes: '',
  completeness: {
    isComplete: false,
    missingItems: [],
    completionPercentage: 0,
  },
  createdBy: '',
  updatedBy: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createInitialFormState = (): TechPackFormState => ({
  techpack: createEmptyTechpack(),
  currentTab: 0,
  tabStates: {},
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
});

const loadDraftFromStorage = (techpackId?: string): Partial<TechPackFormState> | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getDraftStorageKey(techpackId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TechPackFormState> & { version?: number };
    if (parsed.version !== undefined && parsed.version !== TECHPACK_DRAFT_VERSION) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to read tech pack draft from storage', error);
    return null;
  }
};

const mergeDraftWithState = (base: TechPackFormState, draft?: Partial<TechPackFormState> | null): TechPackFormState => {
  if (!draft || !draft.techpack) return base;

  const mergedBom = (draft.techpack as any)?.bom ?? base.techpack.bom;

  const mergedTechpack = {
    ...base.techpack,
    ...draft.techpack,
    articleInfo: {
      ...base.techpack.articleInfo,
      ...(draft.techpack as any).articleInfo,
    },
    bom: mergedBom,
    measurements: (draft.techpack as any).measurements ?? base.techpack.measurements,
    sampleMeasurementRounds: (draft.techpack as any).sampleMeasurementRounds ?? base.techpack.sampleMeasurementRounds,
    howToMeasures: (draft.techpack as any).howToMeasures ?? base.techpack.howToMeasures,
    colorways: sanitizeColorwayList((draft.techpack as any).colorways ?? [], mergedBom, { bestEffort: true }),
    measurementSizeRange:
      (draft.techpack as any).measurementSizeRange ??
      base.techpack.measurementSizeRange ??
      [...SIZE_RANGES['Unisex']],
    packingNotes:
      (draft.techpack as any).packingNotes ??
      base.techpack.packingNotes ??
      '',
  } as TechPackFormState['techpack'];

  const normalizedSizeRange =
    mergedTechpack.measurementSizeRange && mergedTechpack.measurementSizeRange.length > 0
      ? mergedTechpack.measurementSizeRange
      : [...SIZE_RANGES['Unisex']];
  const normalizedBaseSize = resolveMeasurementBaseSize(
    mergedTechpack.measurementBaseSize,
    normalizedSizeRange,
    mergedTechpack.measurements
  );
  const normalizedBaseHighlight = resolveMeasurementColor(
    mergedTechpack.measurementBaseHighlightColor,
    DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR
  );
  const normalizedRowStripe = resolveMeasurementColor(
    mergedTechpack.measurementRowStripeColor,
    DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR
  );

  mergedTechpack.measurementSizeRange = normalizedSizeRange;
  mergedTechpack.measurementBaseSize = normalizedBaseSize;
  mergedTechpack.measurementBaseHighlightColor = normalizedBaseHighlight;
  mergedTechpack.measurementRowStripeColor = normalizedRowStripe;

  return {
    ...base,
    ...draft,
    techpack: mergedTechpack,
    isLoading: false,
    isSaving: false,
  };
};

const clearDraftFromStorage = (techpackId?: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getDraftStorageKey(techpackId));
  } catch (error) {
    // Failed to clear draft from storage
  }
};

const loadCachedTechPacks = (): ApiTechPack[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TECHPACK_LIST_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load cached techpacks from storage', error);
    return [];
  }
};

const loadCachedPagination = (): Omit<TechPackListResponse, 'data'> => {
  if (typeof window === 'undefined') return { total: 0, page: 1, totalPages: 1 };
  try {
    const raw = localStorage.getItem(TECHPACK_LIST_PAGINATION_CACHE_KEY);
    if (!raw) return { total: 0, page: 1, totalPages: 1 };
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      const { total = 0, page = 1, totalPages = 1 } = parsed as any;
      return { total, page, totalPages };
    }
    return { total: 0, page: 1, totalPages: 1 };
  } catch (error) {
    console.warn('Failed to load cached pagination from storage', error);
    return { total: 0, page: 1, totalPages: 1 };
  }
};

export const TechPackProvider = ({ children }: { children: ReactNode }) => {
  // Access auth state to decide when to load protected data
  const auth = useAuth();
  const [techPacks, setTechPacks] = useState<ApiTechPack[]>(() => loadCachedTechPacks());
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<Omit<TechPackListResponse, 'data'>>(() => loadCachedPagination());
  const [revisions, setRevisions] = useState<any[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState<boolean>(false);
  const [revisionPagination, setRevisionPagination] = useState<any>({ total: 0, page: 1, totalPages: 1 });

  // Initialize default TechPack state (including draft recovery)
  const [state, setState] = useState<TechPackFormState>(() => {
    const baseState = createInitialFormState();
    const storedDraft = loadDraftFromStorage();
    return mergeDraftWithState(baseState, storedDraft);
  });
  const draftKeyRef = useRef(getDraftStorageKey(state.techpack.id));
  const lastPersistedDraftRef = useRef<string>('');

  // Exit warning system - prevent accidental data loss
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa được lưu. Bạn có muốn lưu trước khi thoát không?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.hasUnsavedChanges]);

  useEffect(() => {
    draftKeyRef.current = getDraftStorageKey(state.techpack.id);
  }, [state.techpack.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const payload = {
      version: TECHPACK_DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      techpack: state.techpack,
      currentTab: state.currentTab,
      tabStates: state.tabStates,
      hasUnsavedChanges: state.hasUnsavedChanges,
      lastSaved: state.lastSaved,
    };

    const serialized = JSON.stringify(payload);
    if (serialized === lastPersistedDraftRef.current) {
      return;
    }

    lastPersistedDraftRef.current = serialized;

    try {
      localStorage.setItem(draftKeyRef.current, serialized);
    } catch (error) {
      // Failed to persist draft
    }
  }, [state.techpack, state.currentTab, state.tabStates, state.hasUnsavedChanges, state.lastSaved]);


  const loadTechPacks = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await api.listTechPacks(params);
      // Ensure response.data is always an array
      const techPacksData = Array.isArray(response.data) ? response.data : [];
      setTechPacks(techPacksData);
      setPagination({ total: response.total, page: response.page, totalPages: response.totalPages });
    } catch (error: any) {
      showError(error.message || 'Failed to load tech packs');
      // On error, fallback to cached data (if available) without clearing current state
      if (techPacks.length === 0) {
        setTechPacks(loadCachedTechPacks());
        setPagination(loadCachedPagination());
      }
    } finally {
      setLoading(false);
    }
  }, [techPacks.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TECHPACK_LIST_CACHE_KEY, JSON.stringify(techPacks));
    } catch (error) {
      console.warn('Failed to cache techpacks list', error);
    }
  }, [techPacks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TECHPACK_LIST_PAGINATION_CACHE_KEY, JSON.stringify(pagination));
    } catch (error) {
      console.warn('Failed to cache techpack pagination', error);
    }
  }, [pagination]);

  useEffect(() => {
    // Only attempt to load tech packs after auth initialization.
    // If user is not authenticated we skip loading to avoid triggering protected API calls
    // that return "Access denied. No token provided." on first render.
    if (auth && !auth.isLoading && auth.isAuthenticated) {
      loadTechPacks();
    }
  }, [loadTechPacks, auth.isLoading, auth.isAuthenticated]);

  const createTechPack = async (data: CreateTechPackInput) => {
    try {
      const newTechPack = await showPromise(
        api.createTechPack(data),
        {
          loading: 'Creating tech pack...',
          success: 'Tech pack created successfully!',
          error: (err) => err.message || 'Failed to create tech pack',
        }
      );
      await loadTechPacks();
      return newTechPack;
    } catch (error) {
      // Error is already handled by showPromise
    }
  };

  const updateTechPack = async (id: string, data: Partial<ApiTechPack>) => {
    try {
      const updatedTechPack = await showPromise(
        api.updateTechPack(id, data), // Sử dụng PUT thay vì PATCH để đảm bảo tạo revision
        {
          loading: 'Updating tech pack...',
          success: 'Tech pack updated successfully!',
          error: (err) => err.message || 'Failed to update tech pack',
        }
      );
      // Optimistically update the local state instead of refetching the whole list
      setTechPacks(prev =>
        prev.map(tp => (tp._id === id ? { ...tp, ...updatedTechPack } : tp))
      );
      return updatedTechPack;
    } catch (error) {
      // Error is already handled by showPromise
    }
  };

  const deleteTechPack = async (id: string) => {
    try {
      await showPromise(
        api.deleteTechPack(id),
        {
          loading: 'Deleting tech pack...',
          success: 'Tech pack archived successfully!',
          error: (err) => err.message || 'Failed to delete tech pack',
        }
      );
      // Update local state to remove the deleted tech pack immediately
      setTechPacks(prev => prev.filter(tp => tp._id !== id));
      // Update pagination count
      setPagination(prev => ({ ...prev, total: prev.total - 1 }));
    } catch (error) {
      // Error is already handled by showPromise
    }
  };

  const getTechPack = async (id: string) => {
    setLoading(true);
    try {
      return await api.getTechPack(id);
    } catch (error: any) {
      showError(error.message || 'Failed to fetch tech pack');
    } finally {
      setLoading(false);
    }
  };

  // Form-specific methods
  const setCurrentTab = (tab: number) => {
    setState(prev => ({ ...prev, currentTab: tab }));
  };

  const updateFormState = useCallback((updates: Partial<ApiTechPack>, skipUnsavedFlag = false) => {
    setState(prev => {
      // Xử lý colorways đặc biệt
      // Xử lý các mảng khác: chỉ ghi đè nếu updates có giá trị (không phải undefined)
      // Nếu updates có field (kể cả mảng rỗng []), thì dùng giá trị đó
      // Nếu updates không có field (undefined), thì giữ giá trị cũ
      const incomingBom = (updates as any).bom;
      const nextBom = incomingBom !== undefined ? (Array.isArray(incomingBom) ? incomingBom : []) : prev.techpack.bom;

      const incomingMeasurements = (updates as any).measurements;
      const nextMeasurements = incomingMeasurements !== undefined 
        ? (Array.isArray(incomingMeasurements) ? incomingMeasurements : [])
        : prev.techpack.measurements;

      const incomingSampleRounds = (updates as any).sampleMeasurementRounds;
      const nextSampleRoundsRaw = incomingSampleRounds !== undefined
        ? (Array.isArray(incomingSampleRounds) ? incomingSampleRounds : [])
        : prev.techpack.sampleMeasurementRounds;

      const normalizedSampleRounds = normalizeSampleRounds(nextSampleRoundsRaw, nextMeasurements);

      const incomingHowToMeasures = (updates as any).howToMeasures;
      const nextHowToMeasures = incomingHowToMeasures !== undefined 
        ? (Array.isArray(incomingHowToMeasures) ? incomingHowToMeasures : [])
        : prev.techpack.howToMeasures;

      const incomingColorways = (updates as any).colorways;
      let nextColorways = prev.techpack.colorways;
      if (incomingColorways !== undefined) {
        nextColorways = sanitizeColorwayList(incomingColorways as Array<PartialColorway>, nextBom);
      } else if (incomingBom !== undefined) {
        nextColorways = sanitizeColorwayList(prev.techpack.colorways, nextBom);
      }

      // Tách riêng các field cần xử lý đặc biệt để tránh bị ghi đè
      const {
        bom: _bom,
        measurements: _measurements,
        sampleMeasurementRounds: _sampleRounds,
        howToMeasures: _howToMeasures,
        colorways: _colorways,
        articleInfo: _articleInfo,
        ...restUpdates
      } = updates as any;

      const newState = {
        ...prev,
        techpack: {
          ...prev.techpack,
          ...restUpdates, // Spread các field khác (không phải mảng)
          // Đảm bảo các mảng được merge đúng cách - đặt sau để không bị ghi đè
          bom: nextBom,
          measurements: nextMeasurements,
          sampleMeasurementRounds: normalizedSampleRounds,
          howToMeasures: nextHowToMeasures,
          colorways: nextColorways,
          articleInfo: {
            ...(prev.techpack as any).articleInfo,
            ...(_articleInfo || {}),
          }
        },
        // Nếu skipUnsavedFlag = true (load từ server), set hasUnsavedChanges = false
        // Nếu skipUnsavedFlag = false (user edit), set hasUnsavedChanges = true
        hasUnsavedChanges: skipUnsavedFlag ? false : true
      };

      const normalizedSizeRange =
        newState.techpack.measurementSizeRange && newState.techpack.measurementSizeRange.length > 0
          ? newState.techpack.measurementSizeRange
          : [...SIZE_RANGES['Unisex']];
      const normalizedBaseSize = resolveMeasurementBaseSize(
        newState.techpack.measurementBaseSize,
        normalizedSizeRange,
        newState.techpack.measurements
      );
      const normalizedBaseHighlight = resolveMeasurementColor(
        newState.techpack.measurementBaseHighlightColor,
        DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR
      );
      const normalizedRowStripe = resolveMeasurementColor(
        newState.techpack.measurementRowStripeColor,
        DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR
      );

      newState.techpack = {
        ...newState.techpack,
        measurementSizeRange: normalizedSizeRange,
        measurementBaseSize: normalizedBaseSize,
        measurementBaseHighlightColor: normalizedBaseHighlight,
        measurementRowStripeColor: normalizedRowStripe,
      };

      return newState;
    });
  }, []);

  const resetFormState = useCallback(() => {
    clearDraftFromStorage(state.techpack.id);
    clearDraftFromStorage();
    setState(prev => ({
      ...prev,
      techpack: createEmptyTechpack(),
      currentTab: 0,
      hasUnsavedChanges: false,
      lastSaved: undefined,
    }));
  }, [state.techpack.id]);

  const saveTechPack = async () => {
    setState(prev => ({ ...prev, isSaving: true }));
    try {
      const techpackData = state.techpack;
      const { normalized: measurementsWithBase } = normalizeMeasurementBaseSizes(
        techpackData.measurements || [],
        techpackData.measurementBaseSize
      );

      const measurementsPayload = measurementsWithBase.map((measurement: any) => {
        const {
          minusTolerance,
          plusTolerance,
          toleranceMinus,
          tolerancePlus,
          ...rest
        } = measurement || {};

        const resolvedMinus = toleranceMinus ?? minusTolerance ?? 0;
        const resolvedPlus = tolerancePlus ?? plusTolerance ?? 0;

        return {
          ...rest,
          toleranceMinus: resolvedMinus,
          tolerancePlus: resolvedPlus,
        };
      });

      const measurementNameMap = new Map(measurementsWithBase.map((measurement: any) => [
        measurement?.pomCode,
        measurement?.pomName || '',
      ]));

      const objectIdPattern = /^[0-9a-fA-F]{24}$/;
      const resolveObjectId = (value: any) => (typeof value === 'string' && objectIdPattern.test(value) ? value : undefined);

      const sampleMeasurementRoundsPayload = (techpackData.sampleMeasurementRounds || []).map((round, index) => {
        const measurementDate = round.date ? new Date(round.date) : undefined;
        const normalizedDate = measurementDate && !Number.isNaN(measurementDate.getTime()) ? measurementDate.toISOString() : undefined;

        const mappedEntries = (round.measurements || []).map(entry => {
          const requestedValues = prepareValueMapForSave(entry.requested, { keepEmpty: true }) ?? {};
          const measuredValues = prepareValueMapForSave(entry.measured);
          const diffValues = prepareValueMapForSave(entry.diff);
          const revisedValues = prepareValueMapForSave(entry.revised);
          const commentValues = prepareValueMapForSave(entry.comments, { preserveWhitespace: true });

          const mappedEntry: any = {
            ...(resolveObjectId((entry as any)._id) ? { _id: resolveObjectId((entry as any)._id) } : {}),
            measurementId: resolveObjectId((entry as any).measurementId || entry.measurementId),
            pomCode: entry.pomCode || '',
            pomName: entry.pomName || '',
            requested: requestedValues,
          };

          if (measuredValues) mappedEntry.measured = measuredValues;
          if (diffValues) mappedEntry.diff = diffValues;
          if (revisedValues) mappedEntry.revised = revisedValues;
          if (commentValues) mappedEntry.comments = commentValues;

          return mappedEntry;
        });

        return {
          ...(resolveObjectId((round as any)._id) ? { _id: resolveObjectId((round as any)._id) } : {}),
          name: round.name?.trim() || `Sample Round ${index + 1}`,
          order: index + 1,
          measurementDate: normalizedDate,
          reviewer: round.reviewer || '',
          overallComments: round.overallComments || '',
          requestedSource: round.requestedSource || 'original',
          measurements: mappedEntries,
        };
      });

      const howToMeasuresPayload = (techpackData.howToMeasures || []).map((howToMeasure: any, index: number) => {
        const steps = Array.isArray(howToMeasure?.steps) && howToMeasure.steps.length > 0
          ? howToMeasure.steps
          : (howToMeasure?.instructions || []);

        const mapped: any = {
          pomCode: howToMeasure?.pomCode || '',
          pomName: howToMeasure?.pomName || measurementNameMap.get(howToMeasure?.pomCode) || '',
          description: howToMeasure?.description || '',
          imageUrl: howToMeasure?.imageUrl || '',
          stepNumber: typeof howToMeasure?.stepNumber === 'number' ? howToMeasure.stepNumber : index + 1,
          instructions: steps,
          tips: howToMeasure?.tips || [],
          commonMistakes: howToMeasure?.commonMistakes || [],
          relatedMeasurements: howToMeasure?.relatedMeasurements || [],
          language: howToMeasure?.language || 'en-US',
          videoUrl: howToMeasure?.videoUrl || '',
        };

        const existingId = (howToMeasure as any)._id || howToMeasure?.id;
        if (existingId && typeof existingId === 'string' && objectIdPattern.test(existingId)) {
          mapped._id = existingId;
        }

        return mapped;
      });

      const colorwaysForSave = sanitizeColorwayList(techpackData.colorways as Array<PartialColorway>, techpackData.bom);

      if (JSON.stringify(colorwaysForSave) !== JSON.stringify(techpackData.colorways)) {
        setState(prev => ({
          ...prev,
          techpack: {
            ...prev.techpack,
            colorways: colorwaysForSave,
          },
        }));
      }

      const colorwaysPayload = colorwaysForSave.map(colorway => {
        const partsPayload = (colorway.parts || []).map(part => {
          const normalizedHex = part.hexCode?.trim();
          const payload: any = {
            partName: part.partName.trim(),
            colorName: part.colorName.trim(),
            colorType: part.colorType,
          };

          const partObjectId =
            (part as any)?._id && typeof (part as any)._id === 'string' && objectIdPattern.test((part as any)._id)
              ? (part as any)._id
              : undefined;
          const partIdIsObjectId = typeof part.id === 'string' && objectIdPattern.test(part.id);

          if (partIdIsObjectId) {
            payload._id = part.id;
          } else if (partObjectId) {
            payload._id = partObjectId;
          }

          if (part.bomItemId) payload.bomItemId = part.bomItemId;
          if (part.pantoneCode) payload.pantoneCode = part.pantoneCode.trim();
          if (normalizedHex) payload.hexCode = normalizedHex;
          if (part.rgbCode) payload.rgbCode = part.rgbCode.trim();
          if (part.supplier) payload.supplier = part.supplier.trim();
          if (part.imageUrl) payload.imageUrl = part.imageUrl.trim();

          return payload;
        });

        return {
          ...(colorway?._id && typeof colorway._id === 'string' && objectIdPattern.test(colorway._id) ? { _id: colorway._id } : {}),
          name: colorway.name.trim(),
          code: colorway.code.trim(),
          placement: colorway.placement.trim(),
          materialType: colorway.materialType.trim(),
          pantoneCode: colorway.pantoneCode?.trim() || undefined,
          hexColor: colorway.hexColor?.trim() || undefined,
          rgbColor: hexToRgb(colorway.hexColor),
          supplier: colorway.supplier?.trim() || undefined,
          notes: colorway.notes?.trim() || undefined,
          season: colorway.season?.trim() || undefined,
          collectionName: colorway.collectionName?.trim() || undefined,
          imageUrl: colorway.imageUrl?.trim() || undefined,
          approved: colorway.approvalStatus === 'Approved',
          isDefault: !!colorway.isDefault,
          parts: partsPayload,
        };
      });

      const incompleteColorway = colorwaysPayload.find(cw => !cw.name || !cw.code || !cw.placement || !cw.materialType);
      if (incompleteColorway) {
        setState(prev => ({ ...prev, isSaving: false }));
        showError('Please complete all required colorway fields (name, code, placement, material type).');
        return;
      }

      // If techpack has an ID, update existing; otherwise create new
      if (techpackData.id && techpackData.id !== '') {
        // For updates, use PATCH with flat fields expected by backend patch handler
        const updatePayload = {
          productName: techpackData.articleInfo.productName,
          articleCode: techpackData.articleInfo.articleCode,
          version: techpackData.articleInfo.version.toString(),
          supplier: techpackData.articleInfo.supplier || '',
          season: techpackData.articleInfo.season,
          fabricDescription: techpackData.articleInfo.fabricDescription || '',
          productDescription: (techpackData.articleInfo as any).productDescription || '',
          designSketchUrl: (techpackData.articleInfo as any).designSketchUrl || '',
          companyLogoUrl: (techpackData.articleInfo as any).companyLogoUrl || '',
          status: techpackData.status,
          category: techpackData.articleInfo.productClass,
          gender: techpackData.articleInfo.gender,
          technicalDesignerId: techpackData.articleInfo.technicalDesignerId,
          lifecycleStage: techpackData.articleInfo.lifecycleStage as any,
          collectionName: (techpackData.articleInfo as any).collection,
          targetMarket: (techpackData.articleInfo as any).targetMarket,
          pricePoint: (techpackData.articleInfo as any).pricePoint,
          description: techpackData.articleInfo.notes,
          notes: techpackData.articleInfo.notes,
          brand: techpackData.articleInfo.brand,
          retailPrice: (techpackData as any).retailPrice,
          currency: (techpackData as any).currency,
          bom: techpackData.bom,
          measurements: measurementsPayload,
          colorways: colorwaysPayload,
          howToMeasure: howToMeasuresPayload,
          sampleMeasurementRounds: sampleMeasurementRoundsPayload,
          measurementSizeRange: techpackData.measurementSizeRange || [],
          measurementBaseSize: techpackData.measurementBaseSize || techpackData.measurementSizeRange?.[0] || '',
          measurementBaseHighlightColor: techpackData.measurementBaseHighlightColor || DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR,
          measurementRowStripeColor: techpackData.measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR,
          packingNotes: techpackData.packingNotes || '',
        };
        const updatedTP = await updateTechPack(techpackData.id, updatePayload);

        // After a successful save, reload the revisions
        if (updatedTP) {
          await loadRevisions(techpackData.id);

          // KHÔNG reload lại toàn bộ data từ server sau khi save để tránh mất dữ liệu
          // Chỉ cập nhật trạng thái saved và giữ nguyên dữ liệu hiện tại
          // Dữ liệu đã được lưu lên server, state hiện tại đã đúng
          setState(prev => ({
            ...prev,
            isSaving: false,
            hasUnsavedChanges: false,
            lastSaved: new Date().toISOString(),
          }));
        }
      } else {
        // For create, send nested articleInfo to satisfy route validation
        const createPayload: CreateTechPackInput = {
          articleInfo: {
            productName: techpackData.articleInfo.productName,
            articleCode: techpackData.articleInfo.articleCode,
            version: techpackData.articleInfo.version,
            supplier: techpackData.articleInfo.supplier || '',
            season: techpackData.articleInfo.season,
            fabricDescription: techpackData.articleInfo.fabricDescription || '',
            productDescription: (techpackData.articleInfo as any).productDescription || '',
            designSketchUrl: (techpackData.articleInfo as any).designSketchUrl || '',
          companyLogoUrl: (techpackData.articleInfo as any).companyLogoUrl || '',
            productClass: techpackData.articleInfo.productClass,
            gender: techpackData.articleInfo.gender,
            technicalDesignerId: techpackData.articleInfo.technicalDesignerId,
            lifecycleStage: techpackData.articleInfo.lifecycleStage as any,
            collection: (techpackData.articleInfo as any).collection,
            targetMarket: (techpackData.articleInfo as any).targetMarket,
            pricePoint: (techpackData.articleInfo as any).pricePoint,
            notes: techpackData.articleInfo.notes,
          },
          bom: techpackData.bom,
          measurements: measurementsPayload,
          colorways: colorwaysPayload,
          howToMeasures: howToMeasuresPayload,
          sampleMeasurementRounds: sampleMeasurementRoundsPayload,
          status: techpackData.status as any,
          measurementSizeRange: techpackData.measurementSizeRange || [],
          measurementBaseSize: techpackData.measurementBaseSize || techpackData.measurementSizeRange?.[0],
          measurementBaseHighlightColor: techpackData.measurementBaseHighlightColor || DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR,
          measurementRowStripeColor: techpackData.measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR,
          packingNotes: techpackData.packingNotes || '',
        } as unknown as CreateTechPackInput;

        const newTechPack = await createTechPack(createPayload);

        // Update the state with the new ID
        setState(prev => ({
          ...prev,
          techpack: { ...prev.techpack, id: newTechPack?._id || newTechPack?.id || '' }
        }));

        // After creating a new TechPack, load revisions to show the initial revision
        if (newTechPack) {
          const techPackId = newTechPack._id || newTechPack.id;
          if (techPackId) {
            await loadRevisions(techPackId);
          }
        }
      }

      clearDraftFromStorage(techpackData.id);
      if (!techpackData.id) {
        clearDraftFromStorage();
      }

      setState(prev => ({
        ...prev,
        isSaving: false,
        hasUnsavedChanges: false,
        lastSaved: new Date().toISOString()
      }));
    } catch (error) {
      setState(prev => ({ ...prev, isSaving: false }));
      showError('Failed to save tech pack');
    }
  };

  const exportToPDF = () => {
    // If the techpack has been saved to the server, request server-generated PDF
    const techpackId = state.techpack?.id || state.techpack?.articleInfo?.articleCode;
    // Prefer server PDF when we have an id
    if (techpackId) {
      const useLandscape = true;
      (async () => {
        try {
          // Show loading message
          const loadingToast = showPromise(
            api.get(`/techpacks/${techpackId}/pdf`, { 
              responseType: 'blob', // Use blob for easier handling
              params: { landscape: useLandscape ? 'true' : 'false' },
              timeout: 300000, // 5 minutes timeout for large PDFs
            }),
            {
              loading: 'Generating PDF...',
              success: 'PDF generated successfully! Downloading...',
              error: (err) => err.message || 'Failed to generate PDF',
            }
          );

          const response = await loadingToast;
          
          // Create blob from response
          const blob = response.data instanceof Blob 
            ? response.data 
            : new Blob([response.data], { type: 'application/pdf' });
          
          // Create download link and trigger download
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const filename = `Techpack_${state.techpack.articleInfo.articleCode || 'techpack'}_v${state.techpack.articleInfo.version || 1}.pdf`;
          link.download = filename;
          link.style.display = 'none';
          
          // Append to body, click, then remove
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 100);
          
        } catch (err: any) {
          showError(err?.message || 'Failed to export PDF from server. Falling back to client export.');
          // Fallback to client-side export (HTML print)
          try {
            clientExportToPDF(state.techpack as any);
          } catch (e) {
            showError('Client-side export failed as well.');
          }
        }
      })();
      return;
    }

    // If not saved on server, fall back to client-side HTML export/print
    clientExportToPDF(state.techpack as any);
  };

  const updateMeasurementSizeRange = (sizes: string[]) => {
    setState(prev => {
      const incoming = Array.isArray(sizes) ? sizes : [];
      const seen = new Set<string>();
      const normalizedSizes: string[] = [];
      incoming.forEach(size => {
        if (typeof size !== 'string') return;
        const trimmed = size.trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          normalizedSizes.push(trimmed);
        }
      });

      const fallbackSizes = normalizedSizes.length > 0 ? normalizedSizes : [...SIZE_RANGES['Unisex']];
      const prevBaseSize = prev.techpack.measurementBaseSize;
      const nextBaseSize = prevBaseSize && fallbackSizes.includes(prevBaseSize)
        ? prevBaseSize
        : fallbackSizes[0];

      const nextMeasurements = prev.techpack.measurements.map(measurement => {
        const nextSizes = fallbackSizes.reduce<Record<string, number>>((acc, size) => {
          if (measurement.sizes[size] !== undefined) {
            acc[size] = measurement.sizes[size];
          }
          return acc;
        }, {});

        return {
          ...measurement,
          baseSize: nextBaseSize,
          sizes: nextSizes,
        };
      });

      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements);

      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          measurementSizeRange: fallbackSizes,
          measurementBaseSize: nextBaseSize,
          measurements: nextMeasurements,
          sampleMeasurementRounds: nextSampleRounds,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const updateMeasurementBaseSize = (baseSize: string) => {
    setState(prev => {
      const sizeRange =
        prev.techpack.measurementSizeRange && prev.techpack.measurementSizeRange.length > 0
          ? prev.techpack.measurementSizeRange
          : [...SIZE_RANGES['Unisex']];
      const normalizedBaseSize = sizeRange.includes(baseSize) ? baseSize : sizeRange[0];
      if (!normalizedBaseSize || normalizedBaseSize === prev.techpack.measurementBaseSize) {
        return prev;
      }

      const nextMeasurements = prev.techpack.measurements.map(measurement => ({
        ...measurement,
        baseSize: normalizedBaseSize,
      }));
      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements);

      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          measurementBaseSize: normalizedBaseSize,
          measurements: nextMeasurements,
          sampleMeasurementRounds: nextSampleRounds,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const updateMeasurementDisplaySettings = (settings: { baseHighlightColor?: string; rowStripeColor?: string }) => {
    setState(prev => {
      const currentBaseHighlight = prev.techpack.measurementBaseHighlightColor || DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR;
      const currentRowStripe = prev.techpack.measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR;
      const nextBaseHighlight =
        settings.baseHighlightColor === undefined
          ? currentBaseHighlight
          : resolveMeasurementColor(settings.baseHighlightColor, currentBaseHighlight);
      const nextRowStripe =
        settings.rowStripeColor === undefined
          ? currentRowStripe
          : resolveMeasurementColor(settings.rowStripeColor, currentRowStripe);

      if (nextBaseHighlight === currentBaseHighlight && nextRowStripe === currentRowStripe) {
        return prev;
      }

      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          measurementBaseHighlightColor: nextBaseHighlight,
          measurementRowStripeColor: nextRowStripe,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const addMeasurement = (measurement: MeasurementPoint) => {
    setState(prev => {
      const baseSize =
        prev.techpack.measurementBaseSize ||
        (prev.techpack.measurementSizeRange && prev.techpack.measurementSizeRange[0]) ||
        '';
      const normalizedMeasurement =
        baseSize && measurement.baseSize !== baseSize
          ? { ...measurement, baseSize }
          : measurement;
      const nextMeasurements = [...prev.techpack.measurements, normalizedMeasurement];
      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          measurements: nextMeasurements,
          sampleMeasurementRounds: nextSampleRounds,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const updateMeasurement = (index: number, measurement: MeasurementPoint) => {
    setState(prev => {
      const baseSize =
        prev.techpack.measurementBaseSize ||
        (prev.techpack.measurementSizeRange && prev.techpack.measurementSizeRange[0]) ||
        '';
      const normalizedMeasurement =
        baseSize && measurement.baseSize !== baseSize
          ? { ...measurement, baseSize }
          : measurement;
      const nextMeasurements = prev.techpack.measurements.map((m, i) => (i === index ? normalizedMeasurement : m));
      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          measurements: nextMeasurements,
          sampleMeasurementRounds: nextSampleRounds,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const deleteMeasurement = (index: number) => {
    setState(prev => {
      const nextMeasurements = prev.techpack.measurements.filter((_, i) => i !== index);
      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          measurements: nextMeasurements,
          sampleMeasurementRounds: nextSampleRounds,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const addSampleMeasurementRound = (round?: Partial<MeasurementSampleRound>) => {
    setState(prev => {
      const requestedSource = round?.requestedSource || 'original';
      const existingRounds = prev.techpack.sampleMeasurementRounds || [];
      const previousRound = existingRounds[existingRounds.length - 1];
      const shouldGenerateMeasurements = !(round?.measurements && round.measurements.length > 0);

      const draftMeasurements = shouldGenerateMeasurements
        ? generateEntriesForRequestedSource(prev.techpack.measurements, requestedSource, previousRound)
        : (round?.measurements as MeasurementSampleEntry[]);
      const normalizedDraftMeasurements = draftMeasurements && draftMeasurements.length > 0 ? draftMeasurements : [];

      const baseRound = normalizeSampleRound(
        round && Object.keys(round).length > 0
          ? { ...round, measurements: normalizedDraftMeasurements, requestedSource }
          : {
              name: `Sample Round ${existingRounds.length + 1}`,
              reviewer: '',
              requestedSource,
              measurements: normalizedDraftMeasurements,
            }
      );

      const syncedRound = syncRoundWithMeasurements(baseRound, prev.techpack.measurements);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          sampleMeasurementRounds: [...existingRounds, syncedRound],
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const updateSampleMeasurementRound = (roundId: string, updates: Partial<MeasurementSampleRound>) => {
    setState(prev => {
      const nextRounds = (prev.techpack.sampleMeasurementRounds || []).map(round => {
        if (round.id !== roundId) return round;
        const mergedRound = normalizeSampleRound({
          ...round,
          ...updates,
          measurements: (updates as any)?.measurements ?? round.measurements,
        });
        return syncRoundWithMeasurements(mergedRound, prev.techpack.measurements);
      });
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          sampleMeasurementRounds: nextRounds,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const deleteSampleMeasurementRound = (roundId: string) => {
    setState(prev => {
      const filtered = (prev.techpack.sampleMeasurementRounds || []).filter(round => round.id !== roundId);
      const normalized =
        filtered.length > 0
          ? filtered.map(round => syncRoundWithMeasurements(round, prev.techpack.measurements))
          : normalizeSampleRounds(undefined, prev.techpack.measurements);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          sampleMeasurementRounds: normalized,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const updateSampleMeasurementEntry = (roundId: string, entryId: string, updates: Partial<MeasurementSampleEntry>) => {
    setState(prev => {
      const nextRounds = (prev.techpack.sampleMeasurementRounds || []).map(round => {
        if (round.id !== roundId) return round;
        const updatedRound = {
          ...round,
          measurements: round.measurements.map(entry => {
            if (entry.id !== entryId) return entry;
            
            // Merge updates một cách cẩn thận để tránh ghi đè toàn bộ object
            // Lưu ý: Khi updates có value map (measured, diff, revised, comments), dùng trực tiếp
            // vì nó đã được xử lý đúng (đã delete key nếu cần xóa)
            const mergedEntry: MeasurementSampleEntry = {
              ...entry,
              ...updates,
              // Dùng trực tiếp value maps từ updates (đã được xử lý đúng trong handleEntrySizeValueChange)
              // Không merge để đảm bảo việc xóa giá trị hoạt động đúng
              measured: updates.measured !== undefined 
                ? updates.measured
                : entry.measured,
              diff: updates.diff !== undefined
                ? updates.diff
                : entry.diff,
              revised: updates.revised !== undefined
                ? updates.revised
                : entry.revised,
              comments: updates.comments !== undefined
                ? updates.comments
                : entry.comments,
            };
            
            return mergedEntry;
          }),
        };
        // Không gọi syncRoundWithMeasurements sau mỗi lần update để tránh normalize lại và làm mất dữ liệu
        // Chỉ normalize khi thực sự cần (ví dụ: khi thêm measurement mới)
        return updatedRound;
      });
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          sampleMeasurementRounds: nextRounds,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const addHowToMeasure = (howToMeasure: HowToMeasure) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        howToMeasures: [...prev.techpack.howToMeasures, howToMeasure]
      },
      hasUnsavedChanges: true
    }));
  };

  const updateHowToMeasure = (index: number, howToMeasure: HowToMeasure) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        howToMeasures: prev.techpack.howToMeasures.map((htm, i) => i === index ? howToMeasure : htm)
      },
      hasUnsavedChanges: true
    }));
  };

  const updateHowToMeasureById = (id: string, howToMeasure: HowToMeasure) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        howToMeasures: prev.techpack.howToMeasures.map(htm => htm.id === id ? howToMeasure : htm)
      },
      hasUnsavedChanges: true
    }));
  };

  const deleteHowToMeasure = (index: number) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        howToMeasures: prev.techpack.howToMeasures.filter((_, i) => i !== index)
      },
      hasUnsavedChanges: true
    }));
  };

  const deleteHowToMeasureById = (id: string) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        howToMeasures: prev.techpack.howToMeasures.filter(htm => htm.id !== id)
      },
      hasUnsavedChanges: true
    }));
  };

  const insertHowToMeasureAt = (index: number, howToMeasure: HowToMeasure) => {
    setState(prev => {
      const newHowToMeasures = [...prev.techpack.howToMeasures];
      newHowToMeasures.splice(index, 0, howToMeasure);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          howToMeasures: newHowToMeasures
        },
        hasUnsavedChanges: true
      };
    });
  };

  const addBomItem = (bomItem: BomItem) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: [...prev.techpack.bom, bomItem]
      },
      hasUnsavedChanges: true
    }));
  };

  const updateBomItem = (index: number, bomItem: BomItem) => {
    // Legacy: support index-based for backward compatibility
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: prev.techpack.bom.map((item, i) => i === index ? bomItem : item)
      },
      hasUnsavedChanges: true
    }));
  };

  const updateBomItemById = (id: string, bomItem: BomItem) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: prev.techpack.bom.map(item => item.id === id ? bomItem : item)
      },
      hasUnsavedChanges: true
    }));
  };

  const deleteBomItem = (index: number) => {
    // Legacy: support index-based for backward compatibility
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: prev.techpack.bom.filter((_, i) => i !== index)
      },
      hasUnsavedChanges: true
    }));
  };

  const deleteBomItemById = (id: string) => {
    setState(prev => ({
      ...prev,
      techpack: {
        ...prev.techpack,
        bom: prev.techpack.bom.filter(item => item.id !== id)
      },
      hasUnsavedChanges: true
    }));
  };

  const insertBomItemAt = (index: number, bomItem: BomItem) => {
    setState(prev => {
      const newBom = [...prev.techpack.bom];
      newBom.splice(index, 0, bomItem);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          bom: newBom
        },
        hasUnsavedChanges: true
      };
    });
  };

  const addColorway = (colorway: Colorway) => {
    setState(prev => {
      const nextColorways = sanitizeColorwayList([...prev.techpack.colorways, colorway], prev.techpack.bom);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: nextColorways,
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const updateColorway = (index: number, colorway: Colorway) => {
    // Legacy: support index-based for backward compatibility
    setState(prev => {
      const updatedColorways = prev.techpack.colorways.map((item, i) => (i === index ? colorway : item));
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: sanitizeColorwayList(updatedColorways, prev.techpack.bom),
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const updateColorwayById = (id: string, colorway: Colorway) => {
    setState(prev => {
      const updatedColorways = prev.techpack.colorways.map(item => (item.id === id ? colorway : item));
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: sanitizeColorwayList(updatedColorways, prev.techpack.bom),
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const deleteColorway = (index: number) => {
    // Legacy: support index-based for backward compatibility
    setState(prev => {
      const filtered = prev.techpack.colorways.filter((_, i) => i !== index);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: sanitizeColorwayList(filtered, prev.techpack.bom),
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const deleteColorwayById = (id: string) => {
    setState(prev => {
      const filtered = prev.techpack.colorways.filter(item => item.id !== id);
      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: sanitizeColorwayList(filtered, prev.techpack.bom),
        },
        hasUnsavedChanges: true,
      };
    });
  };

  const assignColorwayToBomItem = useCallback((
    colorwayId: string,
    bomItemId: string,
    partData: Partial<ColorwayPart> = {}
  ) => {
    if (!colorwayId || !bomItemId) return;
    setState(prev => {
      const bomLookup = buildBomLookup(prev.techpack.bom);
      const nextColorways = prev.techpack.colorways.map(colorway => {
        if (colorway.id !== colorwayId) return colorway;

        const parts = colorway.parts || [];
        const existingIndex = parts.findIndex(part => part.bomItemId === bomItemId);
        const existingPart = existingIndex >= 0 ? parts[existingIndex] : undefined;
        const linkedBom = resolveBomItem(bomLookup, bomItemId, partData.partName || existingPart?.partName);

        const resolvedPartName =
          partData.partName ||
          existingPart?.partName ||
          linkedBom?.part ||
          `Part ${parts.length + 1}`;

        const resolvedColorName =
          partData.colorName ||
          existingPart?.colorName ||
          linkedBom?.materialName ||
          resolvedPartName;

        const resolvedHex =
          partData.hexCode ||
          existingPart?.hexCode ||
          linkedBom?.colorCode ||
          colorway.hexColor ||
          '#000000';

        const updatedPart: ColorwayPart = {
          ...existingPart,
          ...partData,
          id: existingPart?.id || generateClientId('colorway-part'),
          bomItemId,
          partName: resolvedPartName,
          colorName: resolvedColorName,
          hexCode: resolvedHex,
          colorType: (partData.colorType as ColorwayPart['colorType']) || existingPart?.colorType || 'Solid',
        };

        const nextParts =
          existingIndex >= 0
            ? parts.map((part, idx) => (idx === existingIndex ? updatedPart : part))
            : [...parts, updatedPart];

        return {
          ...colorway,
          parts: nextParts,
        };
      });

      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: sanitizeColorwayList(nextColorways, prev.techpack.bom),
        },
        hasUnsavedChanges: true,
      };
    });
  }, []);

  const removeColorwayAssignment = useCallback((colorwayId: string, bomItemId: string) => {
    if (!colorwayId || !bomItemId) return;
    setState(prev => {
      const nextColorways = prev.techpack.colorways.map(colorway => {
        if (colorway.id !== colorwayId) return colorway;
        return {
          ...colorway,
          parts: (colorway.parts || []).filter(part => part.bomItemId !== bomItemId),
        };
      });

      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          colorways: sanitizeColorwayList(nextColorways, prev.techpack.bom),
        },
        hasUnsavedChanges: true,
      };
    });
  }, []);

  // Revision management functions
  const loadRevisions = useCallback(async (techPackId: string, params = {}) => {
    setRevisionsLoading(true);
    try {
      const response = await api.getRevisions(techPackId, params);
      
      // Handle possible shapes:
      // 1) AxiosResponse<{ success, data: { revisions, pagination } }>
      // 2) { revisions, pagination }
      // 3) { data: { revisions, pagination } }
      // 4) AxiosResponse<{ success, data }> where data is already the payload
      const root = (response as any)?.data ?? response;
      const payload = root?.data ?? root;
      const revisions = payload?.revisions ?? [];
      const pagination = payload?.pagination ?? { total: 0, page: 1, totalPages: 1 };

      setRevisions(Array.isArray(revisions) ? revisions : []);
      setRevisionPagination(pagination);
    } catch (error: any) {
      showError(error.message || 'Failed to load revisions');
    } finally {
      setRevisionsLoading(false);
    }
  }, []);

  const revertToRevision = async (techPackId: string, revisionId: string): Promise<string | undefined> => {
    try {
      const response = await showPromise(
        api.revertToRevision(techPackId, revisionId),
        {
          loading: 'Reverting TechPack...',
          success: 'TechPack reverted successfully!',
          error: (err) => err.message || 'Failed to revert TechPack',
        }
      );

      // Reload the current techpack data after revert - không set hasUnsavedChanges
      const updatedTechPack = await getTechPack(techPackId);
      if (updatedTechPack) {
        updateFormState(updatedTechPack, true);
        // Cập nhật luôn danh sách techpacks để list phản ánh thay đổi ngay lập tức
        setTechPacks(prev =>
          Array.isArray(prev)
            ? prev.map(tp => (tp._id === techPackId ? { ...tp, ...updatedTechPack } as any : tp))
            : prev
        );
      }

      // Reload revisions to show the new rollback revision
      await loadRevisions(techPackId);

      // Return the new revision ID for highlighting
      return response?.data?.newRevision?._id || response?.data?.newRevision?.id;
    } catch (error) {
      // Error is already handled by showPromise
      return undefined;
    }
  };

  const value = useMemo(() => ({
    techPacks,
    loading,
    pagination,
    state,
    revisions,
    revisionsLoading,
    revisionPagination,
    loadTechPacks,
    createTechPack,
    updateTechPack,
    deleteTechPack,
    getTechPack,
    loadRevisions,
    revertToRevision,
    setCurrentTab,
    updateFormState,
    resetFormState,
    saveTechPack,
    exportToPDF,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    addSampleMeasurementRound,
    updateSampleMeasurementRound,
    deleteSampleMeasurementRound,
    updateSampleMeasurementEntry,
    addHowToMeasure,
    updateHowToMeasure,
    updateHowToMeasureById,
    deleteHowToMeasure,
    deleteHowToMeasureById,
    insertHowToMeasureAt,
    addBomItem,
    updateBomItem,
    updateBomItemById,
    deleteBomItem,
    deleteBomItemById,
    insertBomItemAt,
    addColorway,
    updateColorway,
    updateColorwayById,
    deleteColorway,
    deleteColorwayById,
    assignColorwayToBomItem,
    removeColorwayAssignment,
    updateMeasurementSizeRange,
    updateMeasurementBaseSize,
    updateMeasurementDisplaySettings,
  }), [
    techPacks,
    loading,
    pagination,
    state,
    revisions,
    revisionsLoading,
    revisionPagination,
    loadTechPacks,
    createTechPack,
    updateTechPack,
    deleteTechPack,
    getTechPack,
    loadRevisions,
    revertToRevision,
    setCurrentTab,
    updateFormState,
    resetFormState,
    saveTechPack,
    exportToPDF,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    addSampleMeasurementRound,
    updateSampleMeasurementRound,
    deleteSampleMeasurementRound,
    updateSampleMeasurementEntry,
    addHowToMeasure,
    updateHowToMeasure,
    updateHowToMeasureById,
    deleteHowToMeasure,
    deleteHowToMeasureById,
    insertHowToMeasureAt,
    addBomItem,
    updateBomItem,
    updateBomItemById,
    deleteBomItem,
    deleteBomItemById,
    insertBomItemAt,
    addColorway,
    updateColorway,
    updateColorwayById,
    deleteColorway,
    deleteColorwayById,
    assignColorwayToBomItem,
    removeColorwayAssignment,
    updateMeasurementSizeRange,
    updateMeasurementBaseSize,
    updateMeasurementDisplaySettings,
  ]);

  return <TechPackContext.Provider value={value}>{children}</TechPackContext.Provider>;
};

export const useTechPack = () => {
  const context = useContext(TechPackContext);
  if (!context) {
    throw new Error('useTechPack must be used within a TechPackProvider');
  }
  return context;
};
