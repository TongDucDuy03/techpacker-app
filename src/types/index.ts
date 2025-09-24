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
}

export interface Measurement {
  id: string;
  point: string;
  tolerance: string;
  sizes: { [key: string]: string };
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