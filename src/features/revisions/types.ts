// Revision Types for Frontend

export type ChangeType = 'auto' | 'manual' | 'approval' | 'rollback';

export interface RevisionComment {
  _id?: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: string | Date;
}

export interface RevisionChange {
  summary: string;
  details: Record<string, { added?: number; modified?: number; removed?: number }>;
  diff?: Record<string, { old: any; new: any }>;
}

export interface Revision {
  _id: string;
  id?: string;
  techPackId: string;
  version: string;
  changes: RevisionChange;
  createdBy: string;
  createdByName: string;
  description?: string;
  changeType: ChangeType;
  statusAtChange: string;
  createdAt: string | Date;
  snapshot?: any;
  revertedFrom?: string;
  revertedFromId?: string;
  comments?: RevisionComment[];
}

export interface RevisionListResponse {
  revisions: Revision[];
  pagination: {
    page?: number;
    currentPage?: number;
    limit?: number;
    itemsPerPage?: number;
    total?: number;
    totalItems?: number;
    pages?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

export interface CompareResponse {
  fromRevision: {
    _id: string;
    version: string;
    createdAt: string | Date;
    createdByName: string;
  };
  toRevision: {
    _id: string;
    version: string;
    createdAt: string | Date;
    createdByName: string;
  };
  comparison: {
    summary: string;
    diffData: Record<string, { old: any; new: any }>;
    hasMore: boolean;
  };
}

export interface RevertResponse {
  techpack: any;
  newRevision: {
    _id: string;
    version: string;
    changeType: ChangeType;
    createdAt: string | Date;
    revertedFrom: string;
    revertedFromId?: string;
  };
  revertedFrom: string;
}

export interface RevisionFilters {
  changeType?: ChangeType;
  createdBy?: string;
  page?: number;
  limit?: number;
  includeSnapshot?: boolean;
}

