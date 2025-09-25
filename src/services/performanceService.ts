import { TechPack, BOMItem, POMSpecification, ConstructionDetail, CareInstruction } from '../types';

export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  strategy: 'lru' | 'fifo' | 'lfu';
}

export interface LazyLoadConfig {
  enabled: boolean;
  threshold: number; // Number of items before lazy loading kicks in
  batchSize: number; // Number of items to load per batch
  delay: number; // Delay between batches in milliseconds
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  networkRequests: number;
  dataSize: number;
}

class PerformanceService {
  private cache = new Map<string, { data: any; timestamp: number; accessCount: number }>();
  private cacheConfig: CacheConfig = {
    maxSize: 1000,
    ttl: 5 * 60 * 1000, // 5 minutes
    strategy: 'lru'
  };
  
  private lazyLoadConfig: LazyLoadConfig = {
    enabled: true,
    threshold: 50,
    batchSize: 20,
    delay: 100
  };

  private metrics: PerformanceMetrics = {
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    networkRequests: 0,
    dataSize: 0
  };

  private networkRequestCount = 0;
  private cacheHitCount = 0;
  private cacheMissCount = 0;

  // Cache Management
  public setCacheConfig(config: Partial<CacheConfig>) {
    this.cacheConfig = { ...this.cacheConfig, ...config };
  }

  public getCacheConfig(): CacheConfig {
    return this.cacheConfig;
  }

  public setLazyLoadConfig(config: Partial<LazyLoadConfig>) {
    this.lazyLoadConfig = { ...this.lazyLoadConfig, ...config };
  }

  public getLazyLoadConfig(): LazyLoadConfig {
    return this.lazyLoadConfig;
  }

  // Cache Operations
  public setCache(key: string, data: any): void {
    // Check if cache is full
    if (this.cache.size >= this.cacheConfig.maxSize) {
      this.evictCache();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0
    });
  }

  public getCache(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.cacheMissCount++;
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > this.cacheConfig.ttl) {
      this.cache.delete(key);
      this.cacheMissCount++;
      return null;
    }

    // Update access count and timestamp
    cached.accessCount++;
    cached.timestamp = Date.now();
    this.cacheHitCount++;
    
    return cached.data;
  }

  public clearCache(): void {
    this.cache.clear();
    this.cacheHitCount = 0;
    this.cacheMissCount = 0;
  }

  public clearCacheByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  private evictCache(): void {
    switch (this.cacheConfig.strategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'fifo':
        this.evictFIFO();
        break;
      case 'lfu':
        this.evictLFU();
        break;
    }
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private evictFIFO(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  private evictLFU(): void {
    let leastUsedKey = '';
    let leastUsedCount = Infinity;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.accessCount < leastUsedCount) {
        leastUsedCount = value.accessCount;
        leastUsedKey = key;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  // Lazy Loading
  public async lazyLoadTechPacks(
    page: number = 1,
    limit: number = 20,
    filters: any = {}
  ): Promise<{ data: TechPack[]; hasMore: boolean; total: number }> {
    const startTime = performance.now();
    
    // Check cache first
    const cacheKey = `techpacks_${page}_${limit}_${JSON.stringify(filters)}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Simulate API call
    const result = await this.fetchTechPacksFromAPI(page, limit, filters);
    
    // Cache the result
    this.setCache(cacheKey, result);
    
    // Update metrics
    this.networkRequestCount++;
    this.metrics.loadTime = performance.now() - startTime;
    
    return result;
  }

  public async lazyLoadBOMItems(
    techPackId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: BOMItem[]; hasMore: boolean; total: number }> {
    const startTime = performance.now();
    
    const cacheKey = `bom_${techPackId}_${page}_${limit}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.fetchBOMItemsFromAPI(techPackId, page, limit);
    this.setCache(cacheKey, result);
    
    this.networkRequestCount++;
    this.metrics.loadTime = performance.now() - startTime;
    
    return result;
  }

  public async lazyLoadMeasurements(
    techPackId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ data: POMSpecification[]; hasMore: boolean; total: number }> {
    const startTime = performance.now();
    
    const cacheKey = `measurements_${techPackId}_${page}_${limit}`;
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.fetchMeasurementsFromAPI(techPackId, page, limit);
    this.setCache(cacheKey, result);
    
    this.networkRequestCount++;
    this.metrics.loadTime = performance.now() - startTime;
    
    return result;
  }

  // Image Optimization
  public optimizeImage(
    imageUrl: string,
    width?: number,
    height?: number,
    quality: number = 80
  ): string {
    // In a real implementation, this would use a service like Cloudinary or ImageKit
    // For now, we'll return the original URL with query parameters
    const params = new URLSearchParams();
    
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    params.append('q', quality.toString());
    params.append('f', 'auto'); // Auto format selection
    
    return `${imageUrl}?${params.toString()}`;
  }

  public preloadImages(imageUrls: string[]): Promise<void[]> {
    return Promise.all(
      imageUrls.map(url => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          img.src = url;
        });
      })
    );
  }

  // Data Compression
  public compressData(data: any): string {
    // In a real implementation, this would use compression libraries
    // For now, we'll use JSON.stringify with some basic optimization
    return JSON.stringify(data, null, 0);
  }

  public decompressData(compressedData: string): any {
    return JSON.parse(compressedData);
  }

  // Virtual Scrolling
  public createVirtualScrollConfig(
    itemHeight: number,
    containerHeight: number,
    totalItems: number
  ) {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const bufferSize = Math.ceil(visibleItems * 0.5); // 50% buffer
    
    return {
      itemHeight,
      containerHeight,
      totalItems,
      visibleItems,
      bufferSize,
      getVisibleRange: (scrollTop: number) => {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleItems + bufferSize, totalItems);
        return { startIndex, endIndex };
      }
    };
  }

  // Debouncing and Throttling
  public debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  public throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Memory Management
  public getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  public cleanupMemory(): void {
    // Clear old cache entries
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheConfig.ttl) {
        this.cache.delete(key);
      }
    }
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  // Performance Monitoring
  public startPerformanceMonitoring(): void {
    // Monitor memory usage
    setInterval(() => {
      this.metrics.memoryUsage = this.getMemoryUsage();
    }, 5000);

    // Monitor cache hit rate
    setInterval(() => {
      const totalRequests = this.cacheHitCount + this.cacheMissCount;
      this.metrics.cacheHitRate = totalRequests > 0 
        ? (this.cacheHitCount / totalRequests) * 100 
        : 0;
    }, 10000);
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      networkRequests: 0,
      dataSize: 0
    };
    this.networkRequestCount = 0;
    this.cacheHitCount = 0;
    this.cacheMissCount = 0;
  }

  // Database Query Optimization
  public optimizeQuery(query: string, params: any[]): string {
    // In a real implementation, this would analyze and optimize SQL queries
    // For now, we'll return the original query
    return query;
  }

  public createIndexSuggestions(tableName: string, queryPatterns: string[]): string[] {
    // Analyze query patterns and suggest indexes
    const suggestions: string[] = [];
    
    // This would contain actual index analysis logic
    queryPatterns.forEach(pattern => {
      if (pattern.includes('WHERE')) {
        suggestions.push(`Consider adding an index on the WHERE clause columns for ${tableName}`);
      }
      if (pattern.includes('ORDER BY')) {
        suggestions.push(`Consider adding an index on the ORDER BY columns for ${tableName}`);
      }
      if (pattern.includes('JOIN')) {
        suggestions.push(`Consider adding an index on the JOIN columns for ${tableName}`);
      }
    });
    
    return suggestions;
  }

  // Mock API methods (replace with actual API calls)
  private async fetchTechPacksFromAPI(
    page: number,
    limit: number,
    filters: any
  ): Promise<{ data: TechPack[]; hasMore: boolean; total: number }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock data
    const mockTechPacks: TechPack[] = Array.from({ length: limit }, (_, i) => ({
      id: `tp_${page}_${i}`,
      name: `TechPack ${page}-${i}`,
      category: 'apparel',
      status: 'draft',
      dateCreated: new Date(),
      lastModified: new Date(),
      season: 'SS24',
      brand: 'Brand',
      designer: 'Designer',
      images: [],
      materials: [],
      measurements: [],
      constructionDetails: [],
      colorways: []
    }));
    
    return {
      data: mockTechPacks,
      hasMore: page < 10, // Mock pagination
      total: 200 // Mock total
    };
  }

  private async fetchBOMItemsFromAPI(
    techPackId: string,
    page: number,
    limit: number
  ): Promise<{ data: BOMItem[]; hasMore: boolean; total: number }> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const mockBOMItems: BOMItem[] = Array.from({ length: limit }, (_, i) => ({
      id: `bom_${techPackId}_${page}_${i}`,
      techpackId: techPackId,
      part: 'Fabric',
      materialCode: `MAT_${i}`,
      placement: 'Body',
      sizeSpec: 'All',
      quantity: 1,
      uom: 'Yards',
      supplier: 'Supplier',
      comments: [],
      images: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    return {
      data: mockBOMItems,
      hasMore: page < 5,
      total: 100
    };
  }

  private async fetchMeasurementsFromAPI(
    techPackId: string,
    page: number,
    limit: number
  ): Promise<{ data: POMSpecification[]; hasMore: boolean; total: number }> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const mockMeasurements: POMSpecification[] = Array.from({ length: limit }, (_, i) => ({
      id: `pom_${techPackId}_${page}_${i}`,
      techpackId: techPackId,
      pomCode: `POM_${i}`,
      pomName: `Measurement ${i}`,
      tolerances: { minusTol: 0.25, plusTol: 0.25, unit: 'inches' },
      measurements: { S: 10, M: 12, L: 14 },
      howToMeasure: 'Measure from...',
      category: 'Body',
      unit: 'inches',
      gradeRules: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    return {
      data: mockMeasurements,
      hasMore: page < 3,
      total: 50
    };
  }
}

export const performanceService = new PerformanceService();
export default performanceService;
