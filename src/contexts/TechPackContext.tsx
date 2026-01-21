import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useI18n } from '../lib/i18n';
import { ApiTechPack, CreateTechPackInput, TechPackListResponse, TechPackFormState, MeasurementPoint, HowToMeasure, BomItem, Colorway, ColorwayPart, MeasurementSampleRound, MeasurementSampleEntry, MeasurementSampleValueMap, MeasurementRequestedSource, SIZE_RANGES, DEFAULT_MEASUREMENT_UNIT, MeasurementUnit } from '../types/techpack';
import { normalizeMeasurementBaseSizes } from '../utils/measurements';
import { api } from '../lib/api';
import { showPromise, showError, showSuccess } from '../lib/toast';
import { DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR, DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR } from '../constants/measurementDisplay';
import { useDebouncedCallback } from '../hooks/useDebounce';

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
  addTechPackToList: (techPack: ApiTechPack) => void; // Optimistic update: add techpack to list immediately
  updateTechPack: (id: string, data: Partial<ApiTechPack>) => Promise<ApiTechPack | undefined>;
  deleteTechPack: (id: string) => Promise<void>;
  getTechPack: (id: string) => Promise<ApiTechPack | undefined>;
  loadRevisions: (techPackId: string, params?: any) => Promise<void>;
  revertToRevision: (techPackId: string, revisionId: string) => Promise<string | undefined>;
  setCurrentTab: (tab: number) => void;
  updateFormState: (updates: Partial<ApiTechPack>) => void;
  resetFormState: () => void;
  saveTechPack: (techpackOverride?: TechPackFormState['techpack']) => Promise<void>;
  exportToPDF: () => Promise<void>;
  addMeasurement: (measurement: MeasurementPoint) => void;
  insertMeasurementAt: (index: number, measurement: MeasurementPoint) => void;
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
  updateMeasurementDisplaySettings: (settings: { baseHighlightColor?: string; rowStripeColor?: string; unit?: MeasurementUnit }) => void;
}

const TechPackContext = createContext<TechPackContextType | undefined>(undefined);

const TECHPACK_DRAFT_STORAGE_PREFIX = 'techpack:draft:';
const TECHPACK_DRAFT_VERSION = 1;
const TECHPACK_LIST_CACHE_KEY = 'techpack:list:cache';
const TECHPACK_LIST_PAGINATION_CACHE_KEY = 'techpack:list:pagination';

type PartialColorway = Partial<Colorway> & { parts?: Array<Partial<ColorwayPart>> };

const getDraftStorageKey = (techpackId?: string) => `${TECHPACK_DRAFT_STORAGE_PREFIX}${techpackId && techpackId.trim() ? techpackId : 'new'}`;

const safeString = (value?: string | null): string => (typeof value === 'string' ? value.trim() : '');

// Normalize any possible id value (string/ObjectId/object) into a trimmed string
// Supports MongoDB ObjectId-like objects that may appear in some API responses.
const normalizeId = (value: any): string => {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);

  if (typeof value === 'object') {
    // MongoDB ObjectId-like objects
    const bsontype = (value as any)?._bsontype;
    const ctorName = (value as any)?.constructor?.name;
    if (bsontype === 'ObjectID' || bsontype === 'ObjectId' || ctorName === 'ObjectID' || ctorName === 'ObjectId') {
      if (typeof (value as any).toHexString === 'function') {
        const hex = (value as any).toHexString();
        return typeof hex === 'string' ? hex.trim() : '';
      }
      if (typeof (value as any).toString === 'function') {
        const str = (value as any).toString();
        return typeof str === 'string' ? str.trim() : '';
      }
      return '';
    }

    // Plain objects containing id/_id
    if ((value as any)._id) return normalizeId((value as any)._id);
    if ((value as any).id) return normalizeId((value as any).id);

    if (typeof (value as any).toString === 'function') {
      const str = (value as any).toString();
      return typeof str === 'string' ? str.trim() : '';
    }
  }

  return '';
};

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
      normalizeId((item as any)?.id),
      normalizeId((item as any)?._id),
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

  const normalizedId = normalizeId(bomItemId);
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
    normalizeId(part?.bomItemId) ||
    normalizeId((part as any)?.bomItemId) ||
    normalizeId((linkedBom as any)?._id) ||
    normalizeId((linkedBom as any)?.id);

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
    id: normalizeId((part as any)?.id) || normalizeId((part as any)?._id) || `part_${colorwayIndex}_${partIndex}`,
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
      // Ưu tiên giá trị MỚI từ bảng chính (measurement.sizes) thay vì giá trị cũ từ round trước
      // Điều này đảm bảo khi user edit bảng chính, round mới sẽ phản ánh giá trị mới
      if (measurement?.sizes && measurement.sizes[size] !== undefined) {
        merged[size] = String(measurement.sizes[size]);
      } else if (fallback[size] !== undefined) {
        // Chỉ dùng fallback nếu size không còn tồn tại trong bảng chính
        merged[size] = fallback[size];
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
  // ✅ FIXED: Preserve reviewer from updates, fallback to reviewerName from API, then empty string
  // This ensures reviewer is not lost when updating
  const reviewer = round.reviewer !== undefined && round.reviewer !== null 
    ? String(round.reviewer) 
    : ((round as any).reviewerName !== undefined && (round as any).reviewerName !== null 
        ? String((round as any).reviewerName) 
        : '');
  
  // Cho phép tên rỗng hoặc không có tên - không force tên mặc định
  // Chỉ dùng tên mặc định khi round hoàn toàn mới và không có tên nào được cung cấp
  const roundName = round.name !== undefined && round.name !== null 
    ? String(round.name).trim() 
    : '';
  
  return {
    id: roundId,
    name: roundName, // Cho phép tên rỗng, không force DEFAULT_SAMPLE_ROUND_NAME
    date: typeof roundDate === 'string' ? roundDate : new Date(roundDate).toISOString(),
    reviewer: reviewer, // ✅ FIXED: Always preserve reviewer value
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
  measurements: MeasurementPoint[],
  autoCreateFirstRound: boolean = false // Thêm flag để kiểm soát việc tự động tạo round đầu tiên
): MeasurementSampleRound[] => {
  const normalizedRounds = Array.isArray(rounds) && rounds.length > 0
    ? rounds.map(round => normalizeSampleRound(round))
    : [];

  // Chỉ tự động tạo round đầu tiên khi autoCreateFirstRound = true (ví dụ khi load từ server lần đầu)
  // Không tự động tạo khi user xóa tất cả rounds
  const baseRounds =
    normalizedRounds.length > 0
      ? normalizedRounds
      : (autoCreateFirstRound && measurements.length > 0)
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

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const resolveObjectId = (value: any) =>
  typeof value === 'string' && objectIdPattern.test(value) ? value : undefined;

const buildMeasurementPayloads = (techpackData: TechPackFormState['techpack']) => {
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

    // Preserve tolerance values, default to 1.0 if not provided (not 0, as 0 would cause issues)
    const resolvedMinus = toleranceMinus !== undefined && toleranceMinus !== null
      ? toleranceMinus
      : (minusTolerance !== undefined && minusTolerance !== null
        ? minusTolerance
        : 1.0);
    const resolvedPlus = tolerancePlus !== undefined && tolerancePlus !== null
      ? tolerancePlus
      : (plusTolerance !== undefined && plusTolerance !== null
        ? plusTolerance
        : 1.0);
    const resolvedUnit = (measurement?.unit as MeasurementUnit) || DEFAULT_MEASUREMENT_UNIT;

    return {
      ...rest,
      unit: resolvedUnit,
      toleranceMinus: resolvedMinus,
      tolerancePlus: resolvedPlus,
    };
  });

  const measurementNameMap = new Map(
    measurementsWithBase.map((measurement: any) => [
      measurement?.pomCode,
      measurement?.pomName || '',
    ])
  );

  const sampleMeasurementRoundsPayload = (techpackData.sampleMeasurementRounds || []).map((round, index) => {
    const measurementDate = round.date ? new Date(round.date) : undefined;
    const normalizedDate =
      measurementDate && !Number.isNaN(measurementDate.getTime()) ? measurementDate.toISOString() : undefined;

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
      reviewer: round.reviewer !== undefined && round.reviewer !== null ? String(round.reviewer) : '', // ✅ FIXED: Always send reviewer (even if empty string) to preserve it
      overallComments: round.overallComments || '',
      requestedSource: round.requestedSource || 'original',
      measurements: mappedEntries,
    };
  });

  return {
    measurementsWithBase,
    measurementsPayload,
    sampleMeasurementRoundsPayload,
    measurementNameMap,
  };
};

/**
 * Map API TechPack response to form state format
 * This ensures form state is synchronized with backend data after save
 * Uses the same mapping logic as TechPackTabs.tsx
 */
const mapApiTechPackToFormState = (apiTechPack: ApiTechPack): Partial<ApiTechPack> => {
  const resolvedGender = ((apiTechPack as any).gender || 'Unisex') as 'Men' | 'Women' | 'Unisex' | 'Kids';
  const resolvedProductClass = (apiTechPack as any).category || (apiTechPack as any).productClass || '';
  const resolvedBaseSize = (apiTechPack as any).measurementBaseSize || 
    ((apiTechPack as any).measurementSizeRange && (apiTechPack as any).measurementSizeRange[0]) || 
    SIZE_RANGES[resolvedGender]?.[0] || 'M';
  const normalizedSizeRange = Array.isArray((apiTechPack as any).measurementSizeRange) && 
    (apiTechPack as any).measurementSizeRange.length > 0
    ? (apiTechPack as any).measurementSizeRange
    : SIZE_RANGES[resolvedGender] || SIZE_RANGES['Unisex'];
  const resolvedBaseHighlight = (apiTechPack as any).measurementBaseHighlightColor || DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR;
  const resolvedRowStripe = (apiTechPack as any).measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR;

  // Map colorways (same logic as TechPackTabs.tsx)
  const rawColorways = (apiTechPack as any).colorways || [];
  const mappedColorways = rawColorways.map((colorway: any, index: number) => {
    const parts = Array.isArray(colorway?.parts)
      ? colorway.parts.map((part: any, partIndex: number) => ({
          id: part?.id || part?._id || `part_${index}_${partIndex}`,
          _id: part?._id,
          // 🔗 CRITICAL: preserve bomItemId so each color assignment stays tied to its own BOM row
          // ✅ Normalize bomItemId to a stable string so refresh/F5 can match reliably
          bomItemId: normalizeId(part?.bomItemId) || undefined,
          partName: part?.partName || part?.name || '',
          colorName: part?.colorName || part?.color || '',
          pantoneCode: part?.pantoneCode || part?.pantone || '',
          hexCode: part?.hexCode || part?.hex || '',
          rgbCode: part?.rgbCode || '',
          imageUrl: part?.imageUrl,
          supplier: part?.supplier,
          colorType: (part?.colorType || 'Solid') as any,
        }))
      : [];

    const fallbackPart = parts[0];
    const rawHex = (colorway?.hexColor || fallbackPart?.hexCode || '').trim();
    const normalizedHex = rawHex
      ? rawHex.startsWith('#')
        ? rawHex
        : `#${rawHex}`
      : '';

    return {
      id: colorway?.id || colorway?._id || `colorway_${index}`,
      _id: typeof colorway?._id === 'string' ? colorway._id : undefined,
      name: (colorway?.name || colorway?.colorwayName || '').trim(),
      code: (colorway?.code || colorway?.colorwayCode || '').trim(),
      placement: (colorway?.placement || fallbackPart?.partName || '').trim(),
      materialType: (colorway?.materialType || '').trim(),
      season: (colorway?.season || '').trim(),
      isDefault: !!colorway?.isDefault,
      approvalStatus: (colorway?.approvalStatus || (colorway?.approved ? 'Approved' : 'Pending')) as Colorway['approvalStatus'],
      productionStatus: (colorway?.productionStatus || 'Lab Dip') as Colorway['productionStatus'],
      pantoneCode: (colorway?.pantoneCode || fallbackPart?.pantoneCode || '').trim(),
      hexColor: normalizedHex,
      supplier: (colorway?.supplier || '').trim(),
      notes: (colorway?.notes || '').trim(),
      collectionName: (colorway?.collectionName || '').trim(),
      imageUrl: (colorway?.imageUrl || '').trim(),
      parts,
    };
  });

  // Map howToMeasures (same logic as TechPackTabs.tsx)
  const rawHowToMeasures = ((apiTechPack as any).howToMeasure || []).map((item: any, index: number) => ({
    id: item._id ? String(item._id) : (item.id || `howto_${index}`),
    pomCode: item.pomCode || '',
    pomName: item.pomName || '',
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    stepNumber: typeof item.stepNumber === 'number' ? item.stepNumber : index + 1,
    steps: Array.isArray(item.steps) && item.steps.length > 0 ? item.steps : (item.instructions || []),
    instructions: Array.isArray(item.steps) && item.steps.length > 0 ? item.steps : (item.instructions || []),
    tips: item.tips || [],
    commonMistakes: item.commonMistakes || [],
    relatedMeasurements: item.relatedMeasurements || [],
    videoUrl: item.videoUrl || '',
    note: item.note || '',
    language: item.language || 'en-US',
  }));

  return {
    id: (apiTechPack as any)._id || apiTechPack.id || '',
    articleInfo: {
      articleCode: (apiTechPack as any).articleCode || '',
      articleName: (apiTechPack as any).articleName || (apiTechPack as any).productName || (apiTechPack as any).name || '',
      sampleType: (apiTechPack as any).sampleType || (apiTechPack as any).version?.toString() || '', // ✅ FIXED: Add required sampleType field
      version: (() => {
        const v = (apiTechPack as any).version || (apiTechPack as any).sampleType;
        if (!v) return 1;
        const digits = String(v).replace(/[^0-9]/g, '');
        const parsed = parseInt(digits, 10);
        return Number.isNaN(parsed) ? 1 : parsed;
      })(),
      gender: resolvedGender,
      productClass: resolvedProductClass,
      fitType: ((apiTechPack as any).fitType || (apiTechPack as any).articleInfo?.fitType || 'Regular') as 'Regular' | 'Slim' | 'Loose' | 'Relaxed' | 'Oversized',
      supplier: (apiTechPack as any).supplier || '',
      technicalDesignerId: typeof (apiTechPack as any).technicalDesignerId === 'object'
        ? (apiTechPack as any).technicalDesignerId?._id || ''
        : (apiTechPack as any).technicalDesignerId || '',
      fabricDescription: (apiTechPack as any).fabricDescription || '',
      productDescription: (apiTechPack as any).productDescription || '',
      designSketchUrl: (apiTechPack as any).designSketchUrl || '',
      companyLogoUrl: (apiTechPack as any).companyLogoUrl || '',
      season: ((apiTechPack as any).season || 'SS25') as any,
      brand: (apiTechPack as any).brand || '',
      collection: (apiTechPack as any).collectionName || (apiTechPack as any).collection || '',
      targetMarket: (apiTechPack as any).targetMarket || '',
      pricePoint: (apiTechPack as any).pricePoint || undefined,
      notes: (apiTechPack as any).notes || (apiTechPack as any).description || '',
      lifecycleStage: (apiTechPack as any).lifecycleStage || undefined,
      status: (apiTechPack as any).status || (apiTechPack as any).articleInfo?.status || 'Draft',
      category: resolvedProductClass,
      currency: (apiTechPack as any).currency || 'USD',
      retailPrice: (apiTechPack as any).retailPrice || undefined,
      createdDate: (apiTechPack as any).createdAt,
      lastModified: (apiTechPack as any).updatedAt,
      createdAt: (apiTechPack as any).createdAt,
      updatedAt: (apiTechPack as any).updatedAt,
      createdBy: typeof (apiTechPack as any).createdBy === 'object'
        ? (apiTechPack as any).createdBy?._id || ''
        : (apiTechPack as any).createdBy || '',
      createdByName: typeof (apiTechPack as any).createdBy === 'object'
        ? `${(apiTechPack as any).createdBy?.firstName || ''} ${(apiTechPack as any).createdBy?.lastName || ''}`.trim()
        : (apiTechPack as any).createdByName || '',
      updatedBy: typeof (apiTechPack as any).updatedBy === 'object'
        ? (apiTechPack as any).updatedBy?._id || ''
        : (apiTechPack as any).updatedBy || '',
      updatedByName: typeof (apiTechPack as any).updatedBy === 'object'
        ? `${(apiTechPack as any).updatedBy?.firstName || ''} ${(apiTechPack as any).updatedBy?.lastName || ''}`.trim()
        : (apiTechPack as any).updatedByName || '',
      // Preserve sharedWith for permission checking
      sharedWith: Array.isArray((apiTechPack as any).sharedWith) 
        ? (apiTechPack as any).sharedWith 
        : [],
    },
    bom: Array.isArray((apiTechPack as any).bom) 
      ? ((apiTechPack as any).bom || []).map((item: any, index: number) => ({
          id: item._id ? String(item._id) : (item.id || `bom_${index}`),
          part: item.part || '',
          materialName: item.materialName || '',
          placement: item.placement || '', // ✅ FIXED: Preserve placement (can be empty)
          size: item.size || '',
          quantity: item.quantity !== undefined && item.quantity !== null ? item.quantity : undefined, // ✅ FIXED: Preserve undefined if not set (don't default to 0)
          uom: item.uom || 'm',
          supplier: item.supplier || '',
          comments: item.comments || '',
          materialComposition: item.materialComposition || '',
          colorCode: item.colorCode || '',
          supplierCode: item.supplierCode || '',
          weight: item.weight || '',
          width: item.width || '',
          shrinkage: item.shrinkage || '',
          careInstructions: item.careInstructions || '',
          testingRequirements: item.testingRequirements || '',
          imageUrl: item.imageUrl || '',
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        }))
      : [],
    measurements: Array.isArray((apiTechPack as any).measurements)
      ? ((apiTechPack as any).measurements || []).map((measurement: any) => {
          // Map toleranceMinus/tolerancePlus back to minusTolerance/plusTolerance
          const {
            toleranceMinus,
            tolerancePlus,
            minusTolerance,
            plusTolerance,
            ...rest
          } = measurement || {};
          
          // Resolve tolerance: prefer toleranceMinus/tolerancePlus (from API) over minusTolerance/plusTolerance
          // Default to 1.0 if not provided (not 0, as 0 would be falsy and cause issues)
          const resolvedMinus = toleranceMinus !== undefined && toleranceMinus !== null 
            ? (typeof toleranceMinus === 'string' ? parseFloat(toleranceMinus) : toleranceMinus)
            : (minusTolerance !== undefined && minusTolerance !== null
              ? (typeof minusTolerance === 'string' ? parseFloat(minusTolerance) : minusTolerance)
              : 1.0);
          const resolvedPlus = tolerancePlus !== undefined && tolerancePlus !== null
            ? (typeof tolerancePlus === 'string' ? parseFloat(tolerancePlus) : tolerancePlus)
            : (plusTolerance !== undefined && plusTolerance !== null
              ? (typeof plusTolerance === 'string' ? parseFloat(plusTolerance) : plusTolerance)
              : 1.0);
          
          return {
            ...rest,
            minusTolerance: resolvedMinus,
            plusTolerance: resolvedPlus,
          };
        })
      : [],
    sampleMeasurementRounds: Array.isArray((apiTechPack as any).sampleMeasurementRounds)
      ? ((apiTechPack as any).sampleMeasurementRounds || []).map((round: any) => normalizeSampleRound(round)) // ✅ FIXED: Normalize sample rounds to ensure date and reviewer are mapped correctly
      : [],
    measurementSizeRange: normalizedSizeRange,
    measurementBaseSize: resolvedBaseSize,
    measurementUnit: (apiTechPack as any).measurementUnit || DEFAULT_MEASUREMENT_UNIT,
    measurementBaseHighlightColor: resolvedBaseHighlight,
    measurementRowStripeColor: resolvedRowStripe,
    howToMeasures: rawHowToMeasures,
    colorways: mappedColorways,
    revisionHistory: (apiTechPack as any).revisions || [],
    status: (apiTechPack as any).status,
    packingNotes: (apiTechPack as any).packingNotes || '',
    completeness: {
      isComplete: false,
      missingItems: [],
      completionPercentage: 0,
    },
    createdBy: (apiTechPack as any).createdBy || (apiTechPack as any).ownerId || '',
    updatedBy: (apiTechPack as any).updatedBy || (apiTechPack as any).ownerId || '',
    createdAt: (apiTechPack as any).createdAt,
    updatedAt: (apiTechPack as any).updatedAt,
  };
};

const createEmptyTechpack = (): TechPackFormState['techpack'] => ({
  id: '',
  articleInfo: {
    articleCode: '',
    articleName: '', // ✅ FIXED: Use articleName instead of productName
    sampleType: '', // Required field
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
  measurementUnit: DEFAULT_MEASUREMENT_UNIT,
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
  const { t, lang } = useI18n();
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

  // ✅ Debounced localStorage write to reduce I/O operations
  const saveDraftToStorage = useDebouncedCallback(() => {
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
  }, 1000, [state.techpack, state.currentTab, state.tabStates, state.hasUnsavedChanges, state.lastSaved]);

  useEffect(() => {
    saveDraftToStorage();
  }, [state.techpack, state.currentTab, state.tabStates, state.hasUnsavedChanges, state.lastSaved, saveDraftToStorage]);


  const loadTechPacks = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      // Add timestamp to bypass cache
      const cacheBypassParams = { ...params, _nocache: Date.now() };
      const response = await api.listTechPacks(cacheBypassParams);
      // Ensure response.data is always an array
      const techPacksData = Array.isArray(response.data) ? response.data : [];
      
      // Replace current list with server data (don't merge to avoid showing techpacks user no longer has access to)
      // This ensures that if a user is revoked from a techpack, it disappears from their list immediately
      setTechPacks(techPacksData);
      
      // Fix pagination: if no data or page is out of range, reset to page 1
      const total = response.total || 0;
      const totalPages = response.totalPages || 1;
      const requestedPage = response.page || 1;
      
      // If no data or requested page is beyond available pages, reset to page 1
      const currentPage = (total === 0 || requestedPage > totalPages) ? 1 : requestedPage;
      
      setPagination({ 
        total, 
        page: currentPage, 
        totalPages: Math.max(1, totalPages) // Ensure at least 1 page
      });
    } catch (error: any) {
      // If access denied, clear localStorage cache to force fresh fetch
      if (error.response?.status === 403 || error.message?.includes('Access denied')) {
        try {
          localStorage.removeItem(TECHPACK_LIST_CACHE_KEY);
          localStorage.removeItem(TECHPACK_LIST_PAGINATION_CACHE_KEY);
        } catch (e) {
          console.warn('Failed to clear localStorage cache', e);
        }
      }
      
      showError(error.message || t('error.loadFailed'));
      // On error, only fallback to cached data if we have no current state
      // This prevents showing techpacks that user no longer has access to
      setTechPacks(prev => {
        if (prev.length === 0) {
          return loadCachedTechPacks();
        }
        // If we have current state but got an error, keep current state but don't add cached data
        // This prevents showing techpacks that were revoked
        return prev;
      });
      setPagination(prev => {
        if (prev.total === 0) {
          return loadCachedPagination();
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Fixed: Removed techPacks.length dependency to prevent unnecessary re-renders

  // Optimistic update: Add techpack to list immediately without waiting for API
  const addTechPackToList = useCallback((techPack: ApiTechPack) => {
    setTechPacks(prev => {
      // Check if techpack already exists (by _id or id)
      const techPackId = (techPack as any)._id || (techPack as any).id;
      const exists = prev.some(tp => {
        const tpId = (tp as any)._id || (tp as any).id;
        return tpId === techPackId;
      });
      
      if (exists) {
        // Update existing techpack
        return prev.map(tp => {
          const tpId = (tp as any)._id || (tp as any).id;
          return tpId === techPackId ? techPack : tp;
        });
      } else {
        // Add new techpack at the beginning of the list
        return [techPack, ...prev];
      }
    });
    
    // Update pagination total
    setPagination(prev => ({
      ...prev,
      total: prev.total + 1
    }));
  }, []);

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
      loadTechPacks({ page: 1, limit: 10 }); // Match frontend pageSize
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
      await loadTechPacks({ page: 1, limit: 10 }); // Match frontend pageSize
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
          success: t('techpack.updateSuccess'),
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

  const getTechPack = async (id: string, skipLoading = false) => {
    if (!skipLoading) {
    setLoading(true);
    }
    try {
      const result = await api.getTechPack(id);
      console.log('📥 getTechPack result:', {
        id,
        hasData: !!result,
        articleName: (result as any)?.articleName || (result as any)?.productName,
        hasBom: Array.isArray((result as any)?.bom) && (result as any)?.bom.length > 0,
        hasMeasurements: Array.isArray((result as any)?.measurements) && (result as any)?.measurements.length > 0,
      });
      return result;
    } catch (error: any) {
      console.error('❌ getTechPack error:', error);
      if (!skipLoading) {
        showError(error.message || t('error.loadFailed'));
      }
      return undefined;
    } finally {
      if (!skipLoading) {
      setLoading(false);
      }
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

      // Khi load từ server hoặc update từ API, tự động tạo round đầu tiên nếu chưa có
      const normalizedSampleRounds = normalizeSampleRounds(nextSampleRoundsRaw, nextMeasurements, true);

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

      // Merge articleInfo carefully - preserve all existing fields, only update fields that are actually present in response
      // CRITICAL: Don't overwrite existing values with undefined, null, or empty strings from response
      // This ensures required fields (supplier, fabricDescription, productDescription, designSketchUrl, technicalDesignerId)
      // are preserved even if backend doesn't return them in the response
      const mergedArticleInfo = { ...(prev.techpack as any).articleInfo };
      if (_articleInfo) {
        Object.keys(_articleInfo).forEach(key => {
          const newValue = (_articleInfo as any)[key];
          const currentValue = mergedArticleInfo[key];
          
          // Only update if new value is explicitly provided (not undefined)
          if (newValue !== undefined) {
            // Special handling for required fields that should never be cleared:
            const requiredFields = ['supplier', 'fabricDescription', 'productDescription', 'designSketchUrl', 'technicalDesignerId'];
            const isRequiredField = requiredFields.includes(key);
            
            if (isRequiredField) {
              // For required fields:
              // - If new value is empty string/null and current value exists, preserve current value
              // - Only update if new value is non-empty
              if ((newValue === '' || newValue === null) && (currentValue !== undefined && currentValue !== '' && currentValue !== null)) {
                // Keep current value, don't overwrite with empty/null
                return;
              }
              // Update with new value (even if empty, but only if current is also empty)
              mergedArticleInfo[key] = newValue;
            } else {
              // For non-required fields:
              // - If new value is empty string and current value exists, preserve current value
              // - Otherwise, update with new value
              if (newValue === '' && (currentValue !== undefined && currentValue !== '')) {
                // Keep current value, don't overwrite with empty string
                return;
              }
              // Update with new value
              mergedArticleInfo[key] = newValue;
            }
          }
          // If newValue is undefined, keep current value (don't overwrite)
        });
      }
      // If _articleInfo is not provided at all, keep all existing articleInfo fields

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
          articleInfo: mergedArticleInfo,
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

  const saveTechPack = async (techpackOverride?: TechPackFormState['techpack']) => {
    setState(prev => ({ ...prev, isSaving: true }));
    
    try {
      const latestState = state;
      const techpackData = techpackOverride ?? latestState.techpack;

      const {
        measurementsWithBase,
        measurementsPayload,
        sampleMeasurementRoundsPayload,
        measurementNameMap,
      } = buildMeasurementPayloads(techpackData);

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
          note: howToMeasure?.note || '',
        };

        const existingId = (howToMeasure as any)._id || howToMeasure?.id;
        if (existingId && typeof existingId === 'string' && objectIdPattern.test(existingId)) {
          mapped._id = existingId;
        }

        return mapped;
      });

      const colorwaysForSave = sanitizeColorwayList(techpackData.colorways as Array<PartialColorway>, techpackData.bom);
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

          // Always send bomItemId as a normalized string (backend may return ObjectId-ish shapes)
          const normalizedBomItemId = normalizeId(part.bomItemId);
          if (normalizedBomItemId) payload.bomItemId = normalizedBomItemId;
          if (part.pantoneCode) payload.pantoneCode = part.pantoneCode.trim();
          if (normalizedHex) payload.hexCode = normalizedHex;
          if (part.rgbCode) payload.rgbCode = part.rgbCode.trim();
          if (part.supplier) payload.supplier = part.supplier.trim();
          if (part.imageUrl) payload.imageUrl = part.imageUrl.trim();

          return payload;
        });

        const normalizedPlacement = colorway.placement?.trim();
        const normalizedMaterialType = colorway.materialType?.trim();
        return {
          ...(colorway?._id && typeof colorway._id === 'string' && objectIdPattern.test(colorway._id) ? { _id: colorway._id } : {}),
          name: colorway.name.trim(),
          code: colorway.code.trim(),
          ...(normalizedPlacement ? { placement: normalizedPlacement } : {}),
          ...(normalizedMaterialType ? { materialType: normalizedMaterialType } : {}),
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

      const incompleteColorway = colorwaysPayload.find(cw => !cw.name || !cw.code);
      if (incompleteColorway) {
        setState(prev => ({ ...prev, isSaving: false }));
        showError(t('form.colorway.requiredFields'));
        return;
      }

      // ===== UPDATE EXISTING TECHPACK =====
      if (techpackData.id && techpackData.id !== '') {
        const currentMeasurementUnit = techpackData.measurementUnit || latestState.techpack.measurementUnit || DEFAULT_MEASUREMENT_UNIT;
        const updatePayload = {
          articleName: techpackData.articleInfo.articleName || (techpackData.articleInfo as any).productName || '',
          articleCode: techpackData.articleInfo.articleCode,
          sampleType: techpackData.articleInfo.sampleType || (techpackData.articleInfo as any).version?.toString() || '',
          supplier: techpackData.articleInfo.supplier || '',
          season: techpackData.articleInfo.season,
          fabricDescription: techpackData.articleInfo.fabricDescription || '',
          productDescription: (techpackData.articleInfo as any).productDescription || '',
          designSketchUrl: (techpackData.articleInfo as any).designSketchUrl || '',
          companyLogoUrl: (techpackData.articleInfo as any).companyLogoUrl || '',
          status: techpackData.status,
          category: techpackData.articleInfo.productClass,
          gender: techpackData.articleInfo.gender,
          fitType: techpackData.articleInfo.fitType as any,
          technicalDesignerId: techpackData.articleInfo.technicalDesignerId,
          lifecycleStage: techpackData.articleInfo.lifecycleStage as any,
          collectionName: (techpackData.articleInfo as any).collection,
          targetMarket: (techpackData.articleInfo as any).targetMarket,
          pricePoint: (techpackData.articleInfo as any).pricePoint,
          description: techpackData.articleInfo.notes,
          notes: techpackData.articleInfo.notes,
          brand: techpackData.articleInfo.brand,
          retailPrice: techpackData.articleInfo.retailPrice || undefined, // ✅ FIXED: Get from articleInfo, not root level
          currency: techpackData.articleInfo.currency || 'USD', // ✅ FIXED: Get from articleInfo, not root level
          bom: (techpackData.bom || []).map((item: any) => {
            const mapped: any = {
              ...item,
              size: item.size || '', // ✅ Ensure size is always present (can be empty string)
              placement: item.placement || '', // ✅ Ensure placement is always present (can be empty string)
            };
            // 🛡️ CRITICAL: preserve server _id so colorway parts keep the same bomItemId after save
            if (item.id && objectIdPattern.test(String(item.id))) {
              mapped._id = String(item.id);
            } else if (item._id && objectIdPattern.test(String(item._id))) {
              mapped._id = String(item._id);
            }
            return mapped;
          }),
          measurements: measurementsPayload,
          colorways: colorwaysPayload,
          howToMeasure: howToMeasuresPayload,
          sampleMeasurementRounds: sampleMeasurementRoundsPayload,
          measurementSizeRange: techpackData.measurementSizeRange || [],
          measurementBaseSize: techpackData.measurementBaseSize || techpackData.measurementSizeRange?.[0] || '',
          measurementUnit: currentMeasurementUnit,
          measurementBaseHighlightColor: techpackData.measurementBaseHighlightColor || DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR,
          measurementRowStripeColor: techpackData.measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR,
          packingNotes: techpackData.packingNotes || '',
        };
        
        const updatedTP = await updateTechPack(techpackData.id, updatePayload);

        if (updatedTP) {
          await loadRevisions(techpackData.id);
          // ✅ FIXED: Skip loading state to avoid UI flicker/reset
          const refreshedTechPack = await getTechPack(techpackData.id, true);
          
          if (refreshedTechPack) {
            // ✅ FIXED: Use the same mapping logic as Edit mode (TechPackTabs.tsx)
            // This ensures form shows data exactly like when entering Edit mode
            const mappedTechPack = mapApiTechPackToFormState(refreshedTechPack) as any;
            
            // CRITICAL FIX: Get current state before updating to preserve required fields
            // This ensures required fields (supplier, fabricDescription, etc.) are preserved
            // even if backend doesn't return them or they're missing from the mapped data
            setState(prev => {
              const currentState = prev.techpack;
              const mergedTechPack = {
                ...mappedTechPack,
                articleInfo: {
                  // Preserve current articleInfo fields that might be missing in response
                  ...currentState.articleInfo,
                  // Override with mapped values only if they exist and are non-empty
                  ...Object.keys(mappedTechPack.articleInfo || {}).reduce((acc, key) => {
                    const mappedValue = (mappedTechPack.articleInfo as any)[key];
                    const currentValue = (currentState.articleInfo as any)?.[key];
                    
                    // For required fields, only update if mapped value is non-empty
                    const requiredFields = ['supplier', 'fabricDescription', 'productDescription', 'designSketchUrl', 'technicalDesignerId'];
                    if (requiredFields.includes(key)) {
                      if (mappedValue !== undefined && mappedValue !== '' && mappedValue !== null) {
                        acc[key] = mappedValue;
                      } else if (currentValue !== undefined && currentValue !== '' && currentValue !== null) {
                        // Preserve current value if mapped value is empty
                        acc[key] = currentValue;
                      } else {
                        // Use mapped value (even if empty) if current is also empty
                        acc[key] = mappedValue;
                      }
                    } else {
                      // For non-required fields, prefer mapped value if it exists
                      if (mappedValue !== undefined) {
                        acc[key] = mappedValue;
                      } else if (currentValue !== undefined) {
                        acc[key] = currentValue;
                      }
                    }
                    return acc;
                  }, {} as any)
                }
              };
              
              console.log('🔄 Reloading TechPack after update:', {
                id: techpackData.id,
                articleName: mergedTechPack.articleInfo?.articleName,
                supplier: mergedTechPack.articleInfo?.supplier,
                fabricDescription: mergedTechPack.articleInfo?.fabricDescription,
                productDescription: mergedTechPack.articleInfo?.productDescription,
                designSketchUrl: mergedTechPack.articleInfo?.designSketchUrl,
                technicalDesignerId: mergedTechPack.articleInfo?.technicalDesignerId,
                hasBom: Array.isArray(mergedTechPack.bom) && mergedTechPack.bom.length > 0,
                hasMeasurements: Array.isArray(mergedTechPack.measurements) && mergedTechPack.measurements.length > 0,
              });
              
              // Use updateFormState logic inline to merge properly
              return {
                ...prev,
                techpack: {
                  ...prev.techpack,
                  ...mergedTechPack,
                  articleInfo: mergedTechPack.articleInfo,
                },
                isSaving: false,
                hasUnsavedChanges: false,
                lastSaved: new Date().toISOString(),
              };
            });
            
            // Clear draft AFTER state update
            clearDraftFromStorage(techpackData.id);
          } else {
            // ✅ FIXED: If reload fails, keep current data and just update flags
            console.warn('⚠️ Failed to reload TechPack after update, keeping current state');
          setState(prev => ({
            ...prev,
            isSaving: false,
            hasUnsavedChanges: false,
            lastSaved: new Date().toISOString(),
          }));
        }
      } else {
          setState(prev => ({
            ...prev,
            isSaving: false,
            hasUnsavedChanges: false,
            lastSaved: new Date().toISOString(),
          }));
        }
        
        return; // Exit early for update
      }
  
      // ===== CREATE NEW TECHPACK =====
      const currentMeasurementUnitForCreate = techpackData.measurementUnit || latestState.techpack.measurementUnit || DEFAULT_MEASUREMENT_UNIT;
        const createPayload: CreateTechPackInput = {
          articleInfo: {
          articleName: techpackData.articleInfo.articleName || '',
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
            fitType: techpackData.articleInfo.fitType as any,
            technicalDesignerId: techpackData.articleInfo.technicalDesignerId,
            lifecycleStage: techpackData.articleInfo.lifecycleStage as any,
            collection: (techpackData.articleInfo as any).collection,
            targetMarket: (techpackData.articleInfo as any).targetMarket,
            pricePoint: (techpackData.articleInfo as any).pricePoint,
            currency: techpackData.articleInfo.currency || 'USD', // ✅ FIXED: Add currency to create payload
            retailPrice: techpackData.articleInfo.retailPrice || undefined, // ✅ FIXED: Add retailPrice to create payload
            notes: techpackData.articleInfo.notes,
          },
          bom: (techpackData.bom || []).map((item: any) => {
            const mapped: any = {
              ...item,
              size: item.size || '', // ✅ Ensure size is always present (can be empty string)
              placement: item.placement || '', // ✅ Ensure placement is always present (can be empty string)
            };
            // Preserve _id when creating based on existing data (clone/copy flows)
            if (item.id && objectIdPattern.test(String(item.id))) {
              mapped._id = String(item.id);
            } else if (item._id && objectIdPattern.test(String(item._id))) {
              mapped._id = String(item._id);
            }
            return mapped;
          }),
          measurements: measurementsPayload,
          colorways: colorwaysPayload,
          howToMeasures: howToMeasuresPayload,
          sampleMeasurementRounds: sampleMeasurementRoundsPayload,
          status: techpackData.status as any,
          measurementSizeRange: techpackData.measurementSizeRange || [],
          measurementBaseSize: techpackData.measurementBaseSize || techpackData.measurementSizeRange?.[0],
        measurementUnit: currentMeasurementUnitForCreate,
          measurementBaseHighlightColor: techpackData.measurementBaseHighlightColor || DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR,
          measurementRowStripeColor: techpackData.measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR,
          packingNotes: techpackData.packingNotes || '',
        } as unknown as CreateTechPackInput;

        const newTechPack = await createTechPack(createPayload);

      if (!newTechPack) {
        // Create failed, keep current state
        setState(prev => ({
          ...prev,
          isSaving: false,
        }));
        return;
      }

      // Get the new TechPack ID
          const techPackId = newTechPack._id || newTechPack.id;
      
      if (!techPackId) {
        // No ID returned, something went wrong
        setState(prev => ({
          ...prev,
          isSaving: false,
        }));
        return;
      }
  
      // === FIX: Load complete data from server BEFORE updating state ===
      try {
        // 1. Load revisions
            await loadRevisions(techPackId);
        
        // 2. Fetch complete TechPack data from server (skip loading to avoid UI flicker)
        const refreshedTechPack = await getTechPack(techPackId, true);
        
        if (!refreshedTechPack) {
          // Fallback: use newTechPack data if fetch fails
          console.warn('⚠️ Failed to reload TechPack after create, using newTechPack data');
          const mappedTechPack = mapApiTechPackToFormState(newTechPack) as any;
          
          // ✅ FIXED: Use updateFormState (same as Edit mode)
          updateFormState(mappedTechPack, true); // skipUnsavedFlag = true
          
          // Update flags separately
          setState(prev => ({
            ...prev,
            isSaving: false,
            hasUnsavedChanges: false,
            lastSaved: new Date().toISOString(),
          }));
        } else {
          // 3. Map server data to form state format
          const mappedTechPack = mapApiTechPackToFormState(refreshedTechPack) as any;
          
          // 4. Update form state with complete server data
          // ✅ FIXED: Use updateFormState (same as Edit mode) to ensure exact same behavior
          console.log('🔄 Reloading TechPack after create:', {
            id: techPackId,
            articleName: mappedTechPack.articleInfo?.articleName,
            hasBom: Array.isArray(mappedTechPack.bom) && mappedTechPack.bom.length > 0,
            hasMeasurements: Array.isArray(mappedTechPack.measurements) && mappedTechPack.measurements.length > 0,
          });
          
          // ✅ FIXED: Use updateFormState with skipUnsavedFlag=true (same as Edit mode)
          // This ensures the form state is updated exactly like when entering Edit mode
          updateFormState(mappedTechPack, true); // skipUnsavedFlag = true
          
          // Update flags separately
          setState(prev => ({
            ...prev,
            isSaving: false,
            hasUnsavedChanges: false,
            lastSaved: new Date().toISOString(),
          }));
        }
        
        // 5. Clear draft storage AFTER successful state update
        clearDraftFromStorage(techPackId);
        clearDraftFromStorage(); // Clear "new" draft
        
      } catch (error) {
        console.error('Failed to refresh TechPack after create:', error);
        
        // Fallback: use newTechPack data
        const mappedTechPack = mapApiTechPackToFormState(newTechPack) as any;
        
        // ✅ FIXED: Use updateFormState (same as Edit mode)
        updateFormState(mappedTechPack, true); // skipUnsavedFlag = true

      setState(prev => ({
        ...prev,
        isSaving: false,
        hasUnsavedChanges: false,
          lastSaved: new Date().toISOString(),
      }));
        
        // Still clear draft even on error
        clearDraftFromStorage(techPackId);
        clearDraftFromStorage();
      }
  
    } catch (error: any) {
      console.error('Save TechPack error:', error);
      setState(prev => ({ ...prev, isSaving: false }));
      showError(error?.message || t('error.saveFailed'));
    }
  };

  const exportToPDF = async () => {
    try {
      if (!state.techpack.id) {
        showError(t('error.exportPdfMissingId'));
        return;
      }

      // Set loading state
      setState(prev => ({ ...prev, isExportingPDF: true }));
      showSuccess(t('form.exportingPDF'), { duration: 2000 });

      // Call PDF export API
      const blob = await api.exportTechPackPDF(state.techpack.id, {
        orientation: 'portrait',
        format: 'A4',
        language: lang === 'vi' ? 'vi' : 'en',
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename from techpack data
      const articleCode = state.techpack.articleInfo?.articleCode || state.techpack.id;
      const version = state.techpack.articleInfo?.sampleType || state.techpack.articleInfo?.version || '';
      const filename = `Techpack_${articleCode}_${version}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess(t('success.exportPDF'));
    } catch (error: any) {
      console.error('PDF export error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || '';
      showError(errorMessage || t('error.exportPDF'));
    } finally {
      setState(prev => ({ ...prev, isExportingPDF: false }));
    }
  };

  const persistMeasurementSettings = async (techpackSnapshot: TechPackFormState['techpack']) => {
    if (!techpackSnapshot?.id) return;
    try {
      const {
        measurementsPayload,
        sampleMeasurementRoundsPayload,
      } = buildMeasurementPayloads(techpackSnapshot);

      await api.patchTechPack(techpackSnapshot.id, {
        measurements: measurementsPayload,
        sampleMeasurementRounds: sampleMeasurementRoundsPayload,
        measurementSizeRange: techpackSnapshot.measurementSizeRange || [],
        measurementBaseSize:
          techpackSnapshot.measurementBaseSize || techpackSnapshot.measurementSizeRange?.[0] || '',
        measurementUnit: (techpackSnapshot as any).measurementUnit || DEFAULT_MEASUREMENT_UNIT,
        measurementBaseHighlightColor:
          techpackSnapshot.measurementBaseHighlightColor || DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR,
        measurementRowStripeColor:
          techpackSnapshot.measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR,
      });
    } catch (error: any) {
      console.error('Failed to persist measurement settings:', error);
      showError(error?.message || t('error.saveMeasurementsSettings'));
    }
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
        // ✅ FIXED: Ensure sizes object exists and is not undefined to prevent "Cannot read properties of undefined" error
        const currentSizes = measurement.sizes || {};
        
        // ✅ FIXED: Preserve all existing size data for sizes in the new range
        // This ensures that when adding new sizes and entering data, the data is preserved
        const nextSizes = fallbackSizes.reduce<Record<string, number>>((acc, size) => {
          // Preserve existing value if it exists (including newly added sizes with data)
          if (currentSizes[size] !== undefined && currentSizes[size] !== null) {
            acc[size] = currentSizes[size];
          }
          return acc;
        }, {});

        return {
          ...measurement,
          baseSize: nextBaseSize,
          sizes: nextSizes,
        };
      });

      // Không tự động tạo round khi user đang làm việc với rounds
      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements, false);

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
    let snapshot: TechPackFormState['techpack'] | null = null;
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
      // Không tự động tạo round khi user đang làm việc với rounds
      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements, false);

      const updatedTechpack = {
        ...prev.techpack,
        measurementBaseSize: normalizedBaseSize,
        measurements: nextMeasurements,
        sampleMeasurementRounds: nextSampleRounds,
      };
      snapshot = updatedTechpack;

      return {
        ...prev,
        techpack: updatedTechpack,
        hasUnsavedChanges: true,
      };
    });

    if (snapshot?.id) {
      persistMeasurementSettings(snapshot);
    }
  };

  const updateMeasurementDisplaySettings = (settings: { baseHighlightColor?: string; rowStripeColor?: string; unit?: MeasurementUnit }) => {
    setState(prev => {
      const currentBaseHighlight = prev.techpack.measurementBaseHighlightColor || DEFAULT_MEASUREMENT_BASE_HIGHLIGHT_COLOR;
      const currentRowStripe = prev.techpack.measurementRowStripeColor || DEFAULT_MEASUREMENT_ROW_STRIPE_COLOR;
      const currentUnit = prev.techpack.measurementUnit || DEFAULT_MEASUREMENT_UNIT;
      const nextBaseHighlight =
        settings.baseHighlightColor === undefined
          ? currentBaseHighlight
          : resolveMeasurementColor(settings.baseHighlightColor, currentBaseHighlight);
      const nextRowStripe =
        settings.rowStripeColor === undefined
          ? currentRowStripe
          : resolveMeasurementColor(settings.rowStripeColor, currentRowStripe);
      const nextUnit = settings.unit !== undefined ? settings.unit : currentUnit;

      if (nextBaseHighlight === currentBaseHighlight && nextRowStripe === currentRowStripe && nextUnit === currentUnit) {
        return prev;
      }

      return {
        ...prev,
        techpack: {
          ...prev.techpack,
          measurementBaseHighlightColor: nextBaseHighlight,
          measurementRowStripeColor: nextRowStripe,
          measurementUnit: nextUnit,
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
      // Chỉ gán baseSize nếu measurement chưa có baseSize;
      // không ép override baseSize đã được user chọn trong UI.
      const normalizedMeasurement =
        baseSize && !measurement.baseSize
          ? { ...measurement, baseSize }
          : measurement;
      const nextMeasurements = [...prev.techpack.measurements, normalizedMeasurement];
      // Không tự động tạo round khi user đang làm việc với rounds
      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements, false);
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

  const insertMeasurementAt = (index: number, measurement: MeasurementPoint) => {
    setState(prev => {
      const baseSize =
        prev.techpack.measurementBaseSize ||
        (prev.techpack.measurementSizeRange && prev.techpack.measurementSizeRange[0]) ||
        '';
      const normalizedMeasurement =
        baseSize && !measurement.baseSize
          ? { ...measurement, baseSize }
          : measurement;
      const nextMeasurements = [...prev.techpack.measurements];
      const insertIndex = Math.min(Math.max(index + 1, 0), nextMeasurements.length);
      nextMeasurements.splice(insertIndex, 0, normalizedMeasurement);
      // Không tự động tạo round khi user đang làm việc với rounds
      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements, false);
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
        baseSize && !measurement.baseSize
          ? { ...measurement, baseSize }
          : measurement;
      const nextMeasurements = prev.techpack.measurements.map((m, i) => (i === index ? normalizedMeasurement : m));
      // Không tự động tạo round khi user đang làm việc với rounds
      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements, false);
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
      // Không tự động tạo round khi user đang làm việc với rounds
      const nextSampleRounds = normalizeSampleRounds(prev.techpack.sampleMeasurementRounds, nextMeasurements, false);
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
        // Preserve name explicitly - nếu updates có name (kể cả empty string), dùng nó; nếu không, giữ nguyên round.name
        const roundName = updates.name !== undefined ? String(updates.name) : round.name;
        const mergedRound = normalizeSampleRound({
          ...round,
          ...updates,
          name: roundName, // Đảm bảo name được preserve đúng cách
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
      // Không tự động tạo lại round khi user xóa - chỉ sync các rounds còn lại
      const normalized =
        filtered.length > 0
          ? filtered.map(round => syncRoundWithMeasurements(round, prev.techpack.measurements))
          : []; // Trả về mảng rỗng thay vì tự động tạo round mới
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
        // ✅ CRITICAL FIX: Only find existing part by bomItemId (not by other fields)
        // This ensures each BOM item gets its own part, even if they share the same colorway
        const existingIndex = parts.findIndex(part => {
          const partBomId = normalizeId(part.bomItemId);
          const targetBomId = normalizeId(bomItemId);
          return partBomId && targetBomId && partBomId === targetBomId;
        });
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

        // ✅ CRITICAL FIX: Always generate new ID if partData explicitly has id: undefined
        // This ensures we create a new part instead of updating an existing one
        const partDataId = (partData as any)?.id;
        const partData_Id = (partData as any)?._id;
        const shouldCreateNew = partDataId === undefined && partData_Id === undefined && !existingPart;
        const newPartId = shouldCreateNew 
          ? generateClientId('colorway-part')
          : (existingPart?.id || generateClientId('colorway-part'));

        const updatedPart: ColorwayPart = {
          ...existingPart,
          ...partData,
          // ✅ CRITICAL: Remove id/_id from partData if they're undefined to avoid overwriting
          id: newPartId,
          bomItemId, // ✅ Always set bomItemId to ensure correct mapping
          partName: resolvedPartName,
          colorName: resolvedColorName,
          hexCode: resolvedHex,
          colorType: (partData.colorType as ColorwayPart['colorType']) || existingPart?.colorType || 'Solid',
        };

        // ✅ CRITICAL FIX: Always append new part if it doesn't exist for this bomItemId
        // This ensures multiple BOM items can share the same colorway without overwriting each other
        const nextParts =
          existingIndex >= 0
            ? parts.map((part, idx) => (idx === existingIndex ? updatedPart : part))
            : [...parts, updatedPart];

        console.log('[assignColorwayToBomItem]', {
          colorwayId,
          bomItemId,
          existingIndex,
          partsBefore: parts.length,
          partsAfter: nextParts.length,
          partBomIds: nextParts.map(p => p.bomItemId),
        });

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
    addTechPackToList,
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
    insertMeasurementAt,
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
    addTechPackToList,
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
    insertMeasurementAt,
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
