export type ApiErrorCode =
  | "API_URL_MISSING"
  | "NETWORK_ERROR"
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

export class ApiError extends Error {
  constructor(
    message: string,
    public code: ApiErrorCode,
    public status = 0
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError("请求超时，请稍后再试。", "TIMEOUT", 0);
  }

  if (error instanceof Error) {
    return new ApiError(error.message || "网络请求失败。", "NETWORK_ERROR", 0);
  }

  return new ApiError("网络请求失败。", "UNKNOWN", 0);
}
