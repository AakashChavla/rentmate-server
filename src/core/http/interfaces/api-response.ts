export interface PageInfo {
  limit: number;
  hasNext: boolean;
  nextCursor: string | null;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  page?: PageInfo;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ErrorBody {
  code: string;
  message: string;
  details: unknown;
}

export interface ErrorResponse {
  success: false;
  error: ErrorBody;
  meta: {
    requestId: string;
  };
}
