import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

// Lazy load các tab components để cải thiện performance
export const ArticleInfoTab = lazy(() => import('./tabs/ArticleInfoTab'));
export const BomTab = lazy(() => import('./tabs/BomTab'));
export const ColorwayTab = lazy(() => import('./tabs/ColorwayTab'));
export const HowToMeasureTab = lazy(() => import('./tabs/HowToMeasureTab'));
export const MeasurementTab = lazy(() => import('./tabs/MeasurementTab'));
export const RevisionTab = lazy(() => import('./tabs/RevisionTab'));
export const SharingTab = lazy(() => import('./tabs/SharingTab'));

// Loading component cho lazy tabs
const TabLoadingFallback = () => (
  <div className="flex justify-center items-center py-8">
    <Spin size="large" />
  </div>
);

// Wrapper component với Suspense
interface LazyTabWrapperProps {
  children: React.ReactNode;
}

export const LazyTabWrapper: React.FC<LazyTabWrapperProps> = ({ children }) => (
  <Suspense fallback={<TabLoadingFallback />}>
    {children}
  </Suspense>
);

export default {
  ArticleInfoTab,
  BomTab,
  ColorwayTab,
  HowToMeasureTab,
  MeasurementTab,
  RevisionTab,
  SharingTab,
  LazyTabWrapper
};
