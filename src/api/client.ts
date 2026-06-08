import { apiConfig, buildApiUrl, hasApiBaseUrl } from "@/api/config";
import { ApiError, toApiError } from "@/api/errors";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  timeoutMs?: number;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!hasApiBaseUrl()) {
    throw new ApiError("API 地址尚未配置。", "API_URL_MISSING", 0);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? apiConfig.timeoutMs);

  try {
    const response = await fetch(buildApiUrl(path), {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const payload = await parseResponse<T | { message?: string; code?: string }>(response);

    if (!response.ok) {
      const message =
        typeof payload === "object" && payload && "message" in payload
          ? payload.message
          : `请求失败：${response.status}`;
      throw new ApiError(message ?? `请求失败：${response.status}`, "HTTP_ERROR", response.status);
    }

    return payload as T;
  } catch (error) {
    throw toApiError(error);
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" })
};
