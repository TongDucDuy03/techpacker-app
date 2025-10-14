import { Response } from 'express';
import { ValidationError } from 'express-validator';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Operation completed successfully',
  statusCode = 200,
  pagination?: Pagination
): void => {
  const response: any = { success: true, message, data };
  if (pagination) {
    response.pagination = pagination;
  }
  res.status(statusCode).json(response);
};

export interface ErrorDetail {
  field?: string;
  message: string;
}

export const sendError = (
  res: Response,
  message = 'An error occurred',
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  errors?: ErrorDetail[]
): void => {
  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details: errors,
    },
  });
};

// Utility function để convert ValidationError[] thành ErrorDetail[]
export const formatValidationErrors = (validationErrors: ValidationError[]): ErrorDetail[] => {
  return validationErrors.map((error) => {
    const errorDetail: ErrorDetail = {
      message: error.msg || 'Validation error'
    };

    // Chỉ thêm field nếu nó tồn tại và là field error
    if (error.type === 'field' && error.path) {
      errorDetail.field = error.path;
    }

    return errorDetail;
  });
};

