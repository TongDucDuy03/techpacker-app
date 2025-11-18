export interface TechPack {
  id: string;
  name: string;
  category: string;
  status: 'draft' | 'review' | 'approved' | 'production';
  dateCreated: Date;
  lastModified: Date;
  season: string;
  brand: string;
  designer: string;
  images: string[];
  materials: Material[];
  measurements: Measurement[];
  constructionDetails: string[];
  colorways: Colorway[];
}

export interface Material {
  id: string;
  name: string;
  composition: string;
  supplier: string;
  color: string;
  consumption: string;
  // Advanced BOM fields
  specifications?: string;
  position?: string;
  quantity?: number;
  unit?: string;
  technicalNotes?: string;
  subMaterials?: Array<{
    id: string;
    specifications: string;
    quantity?: number;
    unit?: string;
  }>;
}

export interface Measurement {
  id: string;
  point: string;
  tolerance: string;
  sizes: { [key: string]: string };
}

export type MeasurementRequestedSource = 'original' | 'previous';

export interface MeasurementSampleValueMap {
  [size: string]: string;
}

export interface MeasurementSampleEntry {
  id: string;
  measurementId?: string;
  pomCode?: string;
  point: string;
  requested: MeasurementSampleValueMap;
  measured: MeasurementSampleValueMap;
  diff: MeasurementSampleValueMap;
  revised: MeasurementSampleValueMap;
  comments: MeasurementSampleValueMap;
}

export interface MeasurementSampleRound {
  id: string;
  name: string;
  date: string;
  reviewer: string;
  requestedSource: MeasurementRequestedSource;
  measurements: MeasurementSampleEntry[];
  overallComments?: string;
}

export interface Colorway {
  id: string;
  name: string;
  colors: { part: string; color: string; pantone?: string }[];
}

export interface Activity {
  id: string;
  action: string;
  item: string;
  time: string;
  user: string;
}

export interface RevisionComment {
  id: string;
  user: string;
  message: string;
  createdAt: string;
}

export interface TechPackRevision {
  id: string;
  techpackId: string;
  version: number;
  createdAt: string;
  user: string;
  status: 'pending' | 'approved' | 'rejected';
  changes: any; // minimal diff payload
  comments: RevisionComment[];
}

export type SampleRequestedSource = 'original' | 'previous';

export interface SampleMeasurementValueMap {
  [size: string]: string;
}

export interface SampleMeasurementEntryLite {
  id: string;
  point: string;
  requested: SampleMeasurementValueMap;
  measured: SampleMeasurementValueMap;
  diff: SampleMeasurementValueMap;
  revised: SampleMeasurementValueMap;
  comments: SampleMeasurementValueMap;
}

export interface SampleMeasurementRoundLite {
  id: string;
  name: string;
  date: string;
  reviewer: string;
  requestedSource: SampleRequestedSource;
  measurements: SampleMeasurementEntryLite[];
  overallComments?: string;
}