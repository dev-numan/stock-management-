import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';

const mapPrismaError = (err) => {
  switch (err.code) {
    case 'P2002':
      return new ApiError(409, 'A record with this value already exists');
    case 'P2025':
      return new ApiError(404, 'Record not found');
    case 'P2003':
      return new ApiError(400, 'Related record not found');
    case 'P2024':
      return new ApiError(503, 'Database is busy, please try again');
    case 'P2028':
      return new ApiError(503, 'Database is busy, please try again');
    case 'P1001':
    case 'P1008':
    case 'P1017':
      return new ApiError(503, 'Database connection lost, please try again');
    default:
      return null;
  }
};

export const errorHandler = (err, req, res, _next) => {
  let error = err;

  if (err.name === 'PrismaClientKnownRequestError') {
    const mapped = mapPrismaError(err);
    if (mapped) error = mapped;
  }

  if (err.name === 'PrismaClientInitializationError') {
    error = new ApiError(503, 'Database unavailable, please try again');
  }

  if (
    err.name === 'PrismaClientKnownRequestError' &&
    String(err.message || '').includes('connection pool')
  ) {
    error = new ApiError(503, 'Database is busy, please try again');
  }

  if (err.name === 'JsonWebTokenError') {
    error = new ApiError(401, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new ApiError(401, 'Token expired');
  }

  const statusCode = error.statusCode || 500;
  const rawMessage = error.message || 'Internal Server Error';
  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again.'
      : rawMessage;

  if (statusCode === 500) {
    logger.error(`${req.method} ${req.path} - ${message}`, { stack: err.stack });
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    data: error.data ?? null,
  });
};
