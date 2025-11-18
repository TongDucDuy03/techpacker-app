import { MeasurementPoint } from './techpack';

export interface SampleMeasurementRow {
  key: string;
  measurement?: MeasurementPoint;
  pomCode?: string;
  pomName?: string;
  fallbackEntryId?: string;
}

