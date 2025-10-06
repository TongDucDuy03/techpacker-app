import { config } from '../config/config';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationResult;
}

/**
 * Calculate pagination parameters
 */
export function calculatePagination(
  options: PaginationOptions,
  totalItems: number
): PaginationResult {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(
    config.maxPageSize,
    Math.max(1, options.limit || config.defaultPageSize)
  );
  
  const skip = (page - 1) * limit;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    skip
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  options: PaginationOptions,
  totalItems: number
): PaginatedResponse<T> {
  const pagination = calculatePagination(options, totalItems);
  
  return {
    data,
    pagination
  };
}

/**
 * Build MongoDB sort object
 */
export function buildSortObject(
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): { [key: string]: 1 | -1 } {
  return {
    [sortBy]: sortOrder === 'asc' ? 1 : -1
  };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(options: PaginationOptions): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (options.page !== undefined) {
    if (!Number.isInteger(options.page) || options.page < 1) {
      errors.push('Page must be a positive integer');
    }
  }

  if (options.limit !== undefined) {
    if (!Number.isInteger(options.limit) || options.limit < 1) {
      errors.push('Limit must be a positive integer');
    }
    if (options.limit > config.maxPageSize) {
      errors.push(`Limit cannot exceed ${config.maxPageSize}`);
    }
  }

  if (options.sortOrder !== undefined) {
    if (!['asc', 'desc'].includes(options.sortOrder)) {
      errors.push('Sort order must be "asc" or "desc"');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract pagination options from query parameters
 */
export function extractPaginationFromQuery(query: any): PaginationOptions {
  return {
    page: query.page ? parseInt(query.page, 10) : undefined,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
    sortBy: query.sortBy || undefined,
    sortOrder: query.sortOrder || undefined
  };
}

/**
 * Create pagination metadata for API responses
 */
export function createPaginationMeta(
  pagination: PaginationResult,
  baseUrl: string,
  queryParams: any = {}
): {
  pagination: PaginationResult;
  links: {
    first: string;
    last: string;
    prev?: string;
    next?: string;
  };
} {
  const createUrl = (page: number) => {
    const params = new URLSearchParams({
      ...queryParams,
      page: page.toString(),
      limit: pagination.itemsPerPage.toString()
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const links: any = {
    first: createUrl(1),
    last: createUrl(pagination.totalPages)
  };

  if (pagination.hasPrevPage) {
    links.prev = createUrl(pagination.currentPage - 1);
  }

  if (pagination.hasNextPage) {
    links.next = createUrl(pagination.currentPage + 1);
  }

  return {
    pagination,
    links
  };
}

/**
 * Aggregate pipeline for paginated results with MongoDB
 */
export function createPaginationPipeline(
  options: PaginationOptions,
  matchStage: any = {},
  additionalStages: any[] = []
): any[] {
  const { skip } = calculatePagination(options, 0); // totalItems not needed for pipeline
  const limit = Math.min(
    config.maxPageSize,
    Math.max(1, options.limit || config.defaultPageSize)
  );

  const sortObject = buildSortObject(options.sortBy, options.sortOrder);

  return [
    { $match: matchStage },
    ...additionalStages,
    { $sort: sortObject },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    },
    {
      $project: {
        data: 1,
        totalItems: { $arrayElemAt: ['$totalCount.count', 0] }
      }
    }
  ];
}

/**
 * Performance optimized pagination for large datasets
 */
export class CursorPagination {
  /**
   * Create cursor-based pagination query
   */
  static createCursorQuery(
    cursor?: string,
    sortField: string = '_id',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): any {
    if (!cursor) {
      return {};
    }

    try {
      const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
      const cursorValue = JSON.parse(decodedCursor);

      return {
        [sortField]: sortOrder === 'desc' 
          ? { $lt: cursorValue } 
          : { $gt: cursorValue }
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Create cursor from document
   */
  static createCursor(
    document: any,
    sortField: string = '_id'
  ): string {
    const cursorValue = document[sortField];
    const cursorData = JSON.stringify(cursorValue);
    return Buffer.from(cursorData, 'utf-8').toString('base64');
  }

  /**
   * Create cursor-based paginated response
   */
  static createResponse<T>(
    data: T[],
    limit: number,
    sortField: string = '_id'
  ): {
    data: T[];
    hasNextPage: boolean;
    nextCursor?: string;
  } {
    const hasNextPage = data.length > limit;
    const items = hasNextPage ? data.slice(0, -1) : data;
    
    let nextCursor: string | undefined;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1] as any;
      nextCursor = this.createCursor(lastItem, sortField);
    }

    return {
      data: items,
      hasNextPage,
      nextCursor
    };
  }
}

export default {
  calculatePagination,
  createPaginatedResponse,
  buildSortObject,
  validatePaginationParams,
  extractPaginationFromQuery,
  createPaginationMeta,
  createPaginationPipeline,
  CursorPagination
};
