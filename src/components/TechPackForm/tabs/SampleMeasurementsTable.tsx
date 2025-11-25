import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import {
  MeasurementSampleEntry,
  MeasurementSampleRound,
  MeasurementSampleValueMap,
  MeasurementRequestedSource,
} from '../../../types/techpack';
import { SampleMeasurementRow } from '../../../types/measurements';
import { parseTolerance, formatTolerance } from './measurementHelpers';

type EditableSampleField = 'measured' | 'diff' | 'revised' | 'comments';

interface SampleMeasurementsTableProps {
  measurementRows: SampleMeasurementRow[];
  sampleRounds: MeasurementSampleRound[];
  availableSizes: string[];
  getEntryForRound: (
    round: MeasurementSampleRound,
    row: SampleMeasurementRow
  ) => MeasurementSampleEntry | undefined;
  onEntrySizeValueChange: (
    roundId: string,
    entryId: string,
    field: EditableSampleField,
    sizeKey: string,
    value: string,
    measurementId?: string,
    pomCode?: string
  ) => void;
  onDeleteRound: (roundId: string) => void;
  requestedSourceLabels?: Record<MeasurementRequestedSource, string>;
}

const FIELD_SEQUENCE: Array<keyof MeasurementSampleEntry> = [
  'requested',
  'measured',
  'diff',
  'revised',
  'comments',
];

const FIELD_LABELS: Record<keyof MeasurementSampleEntry, string> = {
  requested: 'Requested',
  measured: 'Measured',
  diff: 'Diff',
  revised: 'Revised',
  comments: 'Comments',
  id: 'ID',
  point: 'Point',
  pomCode: 'POM Code',
  pomName: 'POM Name',
  measurementId: 'Measurement ID',
};

const formatRoundDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getSizeKeysForRow = (
  row: SampleMeasurementRow,
  sampleRounds: MeasurementSampleRound[],
  availableSizes: string[],
  getEntryForRound: SampleMeasurementsTableProps['getEntryForRound']
): string[] => {
  const sizeSet = new Set<string>();

  if (row.measurement?.sizes) {
    Object.keys(row.measurement.sizes).forEach(size => sizeSet.add(size));
  }

  sampleRounds.forEach(round => {
    const entry = getEntryForRound(round, row);
    if (entry) {
      FIELD_SEQUENCE.forEach(fieldKey => {
        const fieldValue = entry[fieldKey];
        if (fieldValue && typeof fieldValue === 'object') {
          Object.keys(fieldValue as MeasurementSampleValueMap).forEach(size => sizeSet.add(size));
        }
      });
    }
  });

  if (sizeSet.size === 0 && availableSizes.length > 0) {
    availableSizes.forEach(size => sizeSet.add(size));
  }

  if (sizeSet.size === 0) {
    sizeSet.add('ALL');
  }

  const combined = Array.from(sizeSet);
  const ordered: string[] = [];

  const referenceOrder = availableSizes.length > 0 ? availableSizes : combined;
  referenceOrder.forEach(size => {
    if (sizeSet.has(size)) {
      ordered.push(size);
      sizeSet.delete(size);
    }
  });

  sizeSet.forEach(size => ordered.push(size));

  return ordered;
};

const getToleranceDisplay = (row: SampleMeasurementRow): { label: string; minus?: number; plus?: number } => {
  if (!row.measurement) {
    return { label: '—' };
  }

  const minus = parseTolerance(row.measurement.minusTolerance);
  const plus = parseTolerance(row.measurement.plusTolerance);

  if (minus === plus) {
    return {
      label: formatTolerance(minus),
      minus,
      plus,
    };
  }

  return {
    label: `-${minus.toFixed(1)} / +${plus.toFixed(1)} cm`,
    minus,
    plus,
  };
};

const resolveValue = (
  map: MeasurementSampleValueMap | undefined,
  size: string
): string => {
  if (!map) return '';
  const value = map[size];
  return value === undefined || value === null ? '' : String(value);
};

const SAMPLE_BOUND_SIZE = 'M';

const getVisibleSampleSizes = (_sizeKeys: string[]): string[] => {
  return [SAMPLE_BOUND_SIZE];
};

const SampleMeasurementsTable: React.FC<SampleMeasurementsTableProps> = ({
  measurementRows,
  sampleRounds,
  availableSizes,
  getEntryForRound,
  onEntrySizeValueChange,
  onDeleteRound,
  requestedSourceLabels,
}) => {
  const roundHeaderMeta = useMemo(
    () =>
      sampleRounds.map(round => ({
        id: round.id,
        name: round.name || 'Sample Round',
        reviewer: round.reviewer || '—',
        dateLabel: formatRoundDate(round.date),
        requestedSource: round.requestedSource || 'original',
      })),
    [sampleRounds]
  );

const getDiffToneClass = (value: string): string => {
  if (!value) return '';
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) return '';
  if (parsed > 0) return 'text-red-600 font-semibold';
  return 'text-emerald-600 font-semibold';
};

  if (measurementRows.length === 0 || sampleRounds.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-auto max-h-[640px]">
      <table className="min-w-full text-sm text-gray-700 relative">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 sticky top-0 z-30">
          <tr>
            <th
              className="sticky left-0 z-30 bg-gray-50 px-4 py-3 text-left font-semibold min-w-[220px] border-r border-gray-200"
            >
              Measurement Point
            </th>
            <th
              className="sticky left-[220px] z-30 bg-gray-50 px-3 py-3 text-left font-semibold min-w-[70px] border-r border-gray-200"
            >
              Size
            </th>
            <th
              className="sticky left-[290px] z-30 bg-gray-50 px-3 py-3 text-left font-semibold min-w-[100px] border-r border-gray-200"
            >
              Tolerance
            </th>
            {roundHeaderMeta.map(meta => (
              <th
                key={meta.id}
                colSpan={FIELD_SEQUENCE.length}
                className="px-4 py-3 text-center font-semibold border-r border-gray-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-left">
                    <div className="text-gray-900 text-sm">{meta.name}</div>
                    <div className="text-[11px] text-gray-500">Date: {meta.dateLabel}</div>
                    <div className="text-[11px] text-gray-500">Reviewer: {meta.reviewer || '—'}</div>
                    <div className="text-[11px] text-gray-500">
                      {requestedSourceLabels?.[meta.requestedSource] || meta.requestedSource}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteRound(meta.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    aria-label="Remove round"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </th>
            ))}
          </tr>
          <tr>
            <th className="sticky left-0 z-30 bg-gray-50 border-t border-r border-gray-200 px-4 py-2" />
            <th className="sticky left-[220px] z-30 bg-gray-50 border-t border-r border-gray-200 px-3 py-2" />
            <th className="sticky left-[290px] z-30 bg-gray-50 border-t border-r border-gray-200 px-3 py-2" />
            {sampleRounds.flatMap(round =>
              FIELD_SEQUENCE.map(fieldKey => (
                <th
                  key={`${round.id}-${fieldKey}`}
                  className="px-2 py-2 text-center font-semibold text-[11px] text-gray-500 border-t border-r border-gray-200 bg-gray-50"
                >
                  {FIELD_LABELS[fieldKey]}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {measurementRows.map((row, rowIndex) => {
            const rawSizeKeys = getSizeKeysForRow(row, sampleRounds, availableSizes, getEntryForRound);
            const sizeKeys = getVisibleSampleSizes(rawSizeKeys);
            const tolerance = getToleranceDisplay(row);
            const measurementMethod = row.measurement?.measurementMethod;
            const isEvenRow = rowIndex % 2 === 0;
            const rowBgColor = isEvenRow ? '#ffffff' : '#f9fafb';

            return sizeKeys.map((size, index) => {
              const entryCells = sampleRounds.flatMap(round => {
                const entry = getEntryForRound(round, row);
                const entryId = entry?.id || '';

                return FIELD_SEQUENCE.map(fieldKey => {
                  const cellKey = `${round.id}-${row.key}-${size}-${fieldKey}`;
                  
                  // Always get the correct requested value for this specific row
                  const measurementRequestedValue = row.measurement?.sizes?.[size];
                  const entryRequestedValue = entry?.requested?.[size];
                  const requestedValue =
                    entryRequestedValue !== undefined &&
                    entryRequestedValue !== null &&
                    String(entryRequestedValue).trim() !== ''
                      ? String(entryRequestedValue)
                      : measurementRequestedValue !== undefined && measurementRequestedValue !== null
                        ? String(measurementRequestedValue)
                        : '';
                  
                  // For requested field: prioritize entry.requested overrides, then fall back to measurement.sizes
                  if (fieldKey === 'requested') {
                    return (
                      <td
                        key={cellKey}
                        className="border-r border-gray-200 px-2 py-2 align-top text-center text-sm text-gray-900"
                        style={{ backgroundColor: rowBgColor }}
                      >
                        {requestedValue || '—'}
                      </td>
                    );
                  }

                  // Nếu không có entry, vẫn hiển thị input field để user có thể nhập
                  // Entry sẽ được tạo tự động khi user nhập dữ liệu
                  if (!entry) {
                    // Chỉ hiển thị input cho các field có thể edit (measured, revised, comments)
                    // diff sẽ được tính tự động
                    if (fieldKey === 'diff') {
                      return (
                        <td
                          key={cellKey}
                          className="border-r border-gray-200 px-2 py-2 text-center text-xs text-gray-400 bg-gray-50"
                          style={{ backgroundColor: rowBgColor }}
                        >
                          —
                        </td>
                      );
                    }
                    
                    // Hiển thị input field trống để user có thể nhập
                    return (
                      <td
                        key={cellKey}
                        className={`border-r border-gray-200 px-2 py-1 align-top ${
                          fieldKey === 'measured' || fieldKey === 'revised' ? '' : ''
                        }`}
                        style={{ backgroundColor: rowBgColor }}
                      >
                        {fieldKey === 'comments' ? (
                          <textarea
                            rows={2}
                            value=""
                            onChange={event =>
                              onEntrySizeValueChange(
                                round.id,
                                '', // entryId rỗng, sẽ tạo entry mới
                                fieldKey as EditableSampleField,
                                size,
                                event.target.value,
                                row.measurement?.id,
                                row.pomCode
                              )
                            }
                            className="w-full min-w-[140px] border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            placeholder="Notes"
                          />
                        ) : (
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            value=""
                            onChange={event =>
                              onEntrySizeValueChange(
                                round.id,
                                '', // entryId rỗng, sẽ tạo entry mới
                                fieldKey as EditableSampleField,
                                size,
                                event.target.value,
                                row.measurement?.id,
                                row.pomCode
                              )
                            }
                            className="w-full min-w-[90px] border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="—"
                          />
                        )}
                      </td>
                    );
                  }

                  const fieldValue = resolveValue(entry[fieldKey] as MeasurementSampleValueMap, size);

                  if (fieldKey === 'comments') {
                    return (
                      <td
                        key={cellKey}
                        className="border-r border-gray-200 px-2 py-1 align-top"
                        style={{ backgroundColor: rowBgColor }}
                      >
                        <textarea
                          value={fieldValue}
                          onChange={event =>
                            onEntrySizeValueChange(round.id, entryId, 'comments', size, event.target.value, row.measurement?.id, row.pomCode)
                          }
                          rows={2}
                          className="w-full min-w-[140px] border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          placeholder="Notes"
                        />
                      </td>
                    );
                  }

                  const toleranceRange = tolerance.minus !== undefined && tolerance.plus !== undefined
                    ? { minus: tolerance.minus, plus: tolerance.plus }
                    : undefined;

                  // Get the correct requested value for this row (same logic as requested field)
                  // Prioritize measurement.sizes first, then entry.requested as fallback
                  const requestedNumber = requestedValue ? parseFloat(requestedValue) : undefined;
                  const measuredNumber = fieldKey === 'measured' && fieldValue ? parseFloat(fieldValue) : undefined;
                  const diffNumber = fieldKey === 'diff' && fieldValue ? parseFloat(fieldValue) : undefined;

                  let outOfTolerance = false;
                  if (toleranceRange) {
                    const delta =
                      fieldKey === 'diff' && diffNumber !== undefined
                        ? diffNumber
                        : fieldKey === 'measured' && measuredNumber !== undefined && requestedNumber !== undefined
                          ? measuredNumber - requestedNumber
                          : undefined;

                    if (delta !== undefined) {
                      outOfTolerance = delta < -toleranceRange.minus! || delta > toleranceRange.plus!;
                    }
                  }

                  const diffToneClass = fieldKey === 'diff' ? getDiffToneClass(fieldValue) : '';

                  return (
                    <td
                      key={cellKey}
                      className={`border-r border-gray-200 px-2 py-1 align-top ${
                        outOfTolerance ? 'bg-red-50' : ''
                      }`}
                      style={outOfTolerance ? undefined : { backgroundColor: rowBgColor }}
                    >
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={fieldValue}
                        onChange={event =>
                          onEntrySizeValueChange(
                            round.id,
                            entryId,
                            fieldKey as EditableSampleField,
                            size,
                            event.target.value,
                            row.measurement?.id,
                            row.pomCode
                          )
                        }
                        className={`w-full min-w-[90px] border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${diffToneClass}`}
                        placeholder="—"
                      />
                    </td>
                  );
                });
              });

              return (
                <tr 
                  key={`${row.key}-${size}`}
                  style={{ backgroundColor: rowBgColor }}
                >
                  {index === 0 && (
                    <td
                      rowSpan={sizeKeys.length}
                      className="sticky left-0 border-r border-gray-200 px-4 py-3 align-top z-20 shadow-[4px_0_6px_-4px_rgba(0,0,0,0.1)] min-w-[220px]"
                      style={{ backgroundColor: rowBgColor }}
                    >
                      <div className="text-sm font-semibold text-gray-900">
                        {row.pomCode ? `${row.pomCode} - ${row.pomName || row.measurement?.pomName || ''}` : row.pomName || row.measurement?.pomName || 'Measurement'}
                      </div>
                      {measurementMethod && (
                        <div className="text-xs text-gray-500 mt-1">
                          {measurementMethod}
                        </div>
                      )}
                    </td>
                  )}
                  <td 
                    className="sticky left-[220px] border-r border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 z-10 min-w-[70px]"
                    style={{ backgroundColor: rowBgColor }}
                  >
                    {size}
                  </td>
                  <td 
                    className="sticky left-[290px] border-r border-gray-200 px-3 py-2 text-xs text-gray-600 z-10 min-w-[100px]"
                    style={{ backgroundColor: rowBgColor }}
                  >
                    {tolerance.label}
                  </td>
                  {entryCells}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SampleMeasurementsTable;

