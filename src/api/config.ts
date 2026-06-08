export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
  timeoutMs: 15000,
  version: process.env.EXPO_PUBLIC_API_VERSION ?? "v1"
};

export function hasApiBaseUrl(): boolean {
  return apiConfig.baseUrl.trim().length > 0;
}

export function buildApiUrl(path: string): string {
  const normalizedBaseUrl = apiConfig.baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}
