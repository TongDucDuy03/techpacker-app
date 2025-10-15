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
  // Ensure we don't send a response if headers are already sent
  if (res.headersSent) {
    console.error('Attempted to send success response after headers were sent:', { message, statusCode });
    return;
  }

  // Set proper headers for JSON response
  res.setHeader('Content-Type', 'application/json');

  const response: any = { success: true, message, data };
  if (pagination) {
    response.pagination = pagination;
  }

  console.log('Sending success response:', { statusCode, message });
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
  // Ensure we don't send a response if headers are already sent
  if (res.headersSent) {
    console.error('Attempted to send error response after headers were sent:', { message, statusCode, code });
    return;
  }

  // Set proper headers for JSON response
  res.setHeader('Content-Type', 'application/json');

  const response = {
    success: false,
    message,
    error: {
      code,
      details: errors,
    },
  };

  console.log('Sending error response:', { statusCode, message, code });
  res.status(statusCode).json(response);
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

