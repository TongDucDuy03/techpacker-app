import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export interface ValidatedRequest<T = any> extends Request {
  validated: T;
}

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      (req as ValidatedRequest).validated = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errorMessages
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error during validation'
      });
    }
  };
};

export const handleValidationError = (error: any, req: Request, res: Response, next: NextFunction) => {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      error: 'Duplicate value',
      details: [{
        field,
        message: `${field} already exists`
      }]
    });
  }
  
  next(error);
};
