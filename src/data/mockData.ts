import { TechPack } from '../types';

export const mockTechPacks: TechPack[] = [
  {
    id: '1',
    name: 'Classic Button Down Shirt',
    category: 'Shirts',
    status: 'approved',
    dateCreated: new Date('2024-01-15'),
    lastModified: new Date('2024-01-20'),
    season: 'Spring 2024',
    brand: 'Modern Basics',
    designer: 'Sarah Johnson',
    images: ['https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg'],
    materials: [
      {
        id: 'm1',
        name: 'Cotton Poplin',
        composition: '100% Cotton',
        supplier: 'Premium Textiles Co.',
        color: 'White',
        consumption: '1.2 yards'
      }
    ],
    measurements: [
      {
        id: 'meas1',
        point: 'Chest Width',
        tolerance: '±0.5cm',
        sizes: { XS: '48cm', S: '51cm', M: '54cm', L: '57cm', XL: '60cm' }
      }
    ],
    constructionDetails: [
      'Single needle topstitching on collar',
      'French seams on sides',
      'Mother of pearl buttons'
    ],
    colorways: [
      {
        id: 'cw1',
        name: 'Classic White',
        colors: [{ part: 'Body', color: 'White', pantone: 'White' }]
      }
    ]
  },
  {
    id: '2',
    name: 'Denim Jacket',
    category: 'Outerwear',
    status: 'review',
    dateCreated: new Date('2024-01-10'),
    lastModified: new Date('2024-01-18'),
    season: 'Fall 2024',
    brand: 'Urban Edge',
    designer: 'Mike Chen',
    images: ['https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg'],
    materials: [
      {
        id: 'm2',
        name: '12oz Denim',
        composition: '98% Cotton, 2% Elastane',
        supplier: 'Denim Masters Ltd.',
        color: 'Indigo',
        consumption: '1.8 yards'
      }
    ],
    measurements: [
      {
        id: 'meas2',
        point: 'Chest Width',
        tolerance: '±0.7cm',
        sizes: { XS: '50cm', S: '53cm', M: '56cm', L: '59cm', XL: '62cm' }
      }
    ],
    constructionDetails: [
      'Contrast stitching throughout',
      'Metal rivets at stress points',
      'YKK zipper closure'
    ],
    colorways: [
      {
        id: 'cw2',
        name: 'Classic Indigo',
        colors: [{ part: 'Body', color: 'Indigo', pantone: '19-4052 TPX' }]
      }
    ]
  }
];