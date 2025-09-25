import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { store } from '../../store';

// Mock store for testing
const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: store.getState,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: any;
}

const AllTheProviders = ({ children, store: testStore }: { children: React.ReactNode; store?: any }) => {
  const storeToUse = testStore || store;
  
  return (
    <Provider store={storeToUse}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </Provider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { preloadedState, store: testStore, ...renderOptions } = options;
  
  const storeToUse = testStore || (preloadedState ? createMockStore(preloadedState) : store);
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders store={storeToUse}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Mock data generators
export const mockTechPack = (overrides = {}) => ({
  id: 'tp_1',
  name: 'Test TechPack',
  category: 'apparel',
  status: 'draft' as const,
  dateCreated: new Date('2024-01-01'),
  lastModified: new Date('2024-01-01'),
  season: 'SS24',
  brand: 'Test Brand',
  designer: 'Test Designer',
  images: [],
  materials: [],
  measurements: [],
  constructionDetails: [],
  colorways: [],
  ...overrides,
});

export const mockBOMItem = (overrides = {}) => ({
  id: 'bom_1',
  techpackId: 'tp_1',
  part: 'Fabric' as const,
  materialCode: 'MAT_001',
  placement: 'Body' as const,
  sizeSpec: 'All',
  quantity: 1,
  uom: 'Yards' as const,
  supplier: 'Test Supplier',
  comments: [],
  images: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const mockPOMSpecification = (overrides = {}) => ({
  id: 'pom_1',
  techpackId: 'tp_1',
  pomCode: 'POM_001',
  pomName: 'Chest',
  tolerances: {
    minusTol: 0.25,
    plusTol: 0.25,
    unit: 'inches' as const,
  },
  measurements: { S: 10, M: 12, L: 14 },
  howToMeasure: 'Measure from...',
  category: 'Body',
  unit: 'inches' as const,
  gradeRules: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const mockConstructionDetail = (overrides = {}) => ({
  id: 'cd_1',
  techpackId: 'tp_1',
  category: 'Seams' as const,
  name: 'Side Seam',
  description: 'Side seam construction',
  specifications: [],
  sequence: 1,
  qualityCheckpoints: [],
  specialInstructions: [],
  materials: ['Fabric'],
  tools: ['Sewing Machine'],
  estimatedTime: 30,
  difficulty: 'Easy' as const,
  diagram: null,
  photos: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'user_1',
  tags: [],
  ...overrides,
});

export const mockCareInstruction = (overrides = {}) => ({
  id: 'care_1',
  techpackId: 'tp_1',
  language: 'en' as const,
  symbols: ['wash_30'],
  textInstructions: ['Machine wash at 30°C'],
  specialInstructions: [],
  warnings: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

// Mock API responses
export const mockApiResponse = <T>(data: T, success = true) => ({
  success,
  data,
  message: success ? 'Success' : 'Error',
});

// Mock fetch responses
export const mockFetch = (response: any, status = 200) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
  });
};

// Mock WebSocket
export const mockWebSocket = () => {
  const mockWs = {
    close: vi.fn(),
    send: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: WebSocket.OPEN,
  };
  
  global.WebSocket = vi.fn(() => mockWs) as any;
  return mockWs;
};

// Test helpers
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createMockUser = (overrides = {}) => ({
  id: 'user_1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'designer',
  permissions: ['read', 'write'],
  ...overrides,
});

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
