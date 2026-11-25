import {
  AggregationType,
  ChartResponse,
  Dataset,
  RecordsResponse,
  SampleDatasetInfo
} from "../types/dataset";

// Configurable API base URL: respects VITE_API_URL or VITE_BACKEND_URL.
// Defaults to the deployed Render backend in production and "/api" proxy in local dev.
const PRODUCTION_API_URL = "https://datainsight-dataset-analyzer.onrender.com";

const envUrl = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  ""
)
  .trim()
  .replace(/\/+$/, "");

const rawApiUrl = envUrl || (import.meta.env.PROD ? PRODUCTION_API_URL : "");

export const API_BASE_URL = rawApiUrl
  ? rawApiUrl.endsWith("/api")
    ? rawApiUrl
    : `${rawApiUrl}/api`
  : "/api";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchDatasets(): Promise<Dataset[]> {
  const list = await requestJson<Dataset[]>("/datasets");
  if (!Array.isArray(list)) {
    throw new Error("Invalid dataset response format.");
  }
  return list;
}

export function fetchDatasetDetail(id: number): Promise<Dataset> {
  return requestJson<Dataset>(`/datasets/${id}`);
}

export interface RecordsQueryParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  signal?: AbortSignal;
}

export function fetchDatasetRecords(
  id: number,
  params: RecordsQueryParams
): Promise<RecordsResponse> {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.set("search", params.search.trim());
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortDir) qs.set("sortDir", params.sortDir);
  return requestJson<RecordsResponse>(`/datasets/${id}/records?${qs.toString()}`, {
    signal: params.signal
  });
}

export interface ChartQueryParams {
  xAxis: string;
  yAxis: string;
  aggregation: AggregationType;
  limit?: number;
  signal?: AbortSignal;
}

export function fetchDatasetChart(
  id: number,
  params: ChartQueryParams
): Promise<ChartResponse> {
  const qs = new URLSearchParams();
  if (params.xAxis) qs.set("xAxis", params.xAxis);
  if (params.yAxis) qs.set("yAxis", params.yAxis);
  if (params.aggregation) qs.set("aggregation", params.aggregation);
  if (params.limit) qs.set("limit", String(params.limit));
  return requestJson<ChartResponse>(`/datasets/${id}/chart?${qs.toString()}`, {
    signal: params.signal
  });
}

export function uploadDatasetCsv(file: File): Promise<Dataset> {
  const body = new FormData();
  body.append("file", file);
  return requestJson<Dataset>("/datasets", {
    method: "POST",
    body
  });
}

export async function deleteDatasetById(id: number): Promise<void> {
  await requestJson<{ ok: boolean }>(`/datasets/${id}`, {
    method: "DELETE"
  });
}

export function getExportUrl(id: number, search?: string): string {
  const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return `${API_BASE_URL}/datasets/${id}/export${qs}`;
}

export function fetchSampleDatasets(): Promise<SampleDatasetInfo[]> {
  return requestJson<SampleDatasetInfo[]>("/samples");
}

export function loadSampleDataset(id: string): Promise<Dataset> {
  return requestJson<Dataset>(`/samples/${encodeURIComponent(id)}/load`, {
    method: "POST"
  });
}

export function getSampleDownloadUrl(id: string): string {
  return `${API_BASE_URL}/samples/${encodeURIComponent(id)}/download`;
}
