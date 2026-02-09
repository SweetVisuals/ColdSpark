export class ApiError extends Error {
  constructor(
    message: string,
    public details?: any,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: any): never {
  if (error?.message === 'Failed to fetch') {
    throw new ApiError(
      'Unable to connect to the server. Please check your internet connection.',
      error
    );
  }
  
  throw new ApiError(
    error?.message || 'An unexpected error occurred',
    error
  );
}
