import type { ForgeConfig } from "../types.js";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}

export async function apiRequest<T>(config: ForgeConfig, opts: RequestOptions): Promise<T> {
  const url = new URL(opts.path, config.api_url);

  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    ...opts.headers,
  };

  if (config.license_key) {
    headers["x-license-key"] = config.license_key;
  }
  if (config.machine_id) {
    headers["x-machine-id"] = config.machine_id;
  }

  let body: string | undefined;
  if (opts.body) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const response = await fetch(url.toString(), {
    method: opts.method,
    headers,
    body,
  });

  const data = (await response.json()) as T & { error?: string; message?: string };

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error ?? "UNKNOWN_ERROR",
      data.message ?? `API error ${response.status}`,
    );
  }

  return data;
}

/** Download a file from a URL to a buffer. */
export async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
