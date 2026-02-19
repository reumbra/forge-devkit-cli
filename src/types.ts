export interface ForgeConfig {
  license_key: string | null;
  machine_id: string;
  api_url: string;
  installed_plugins: Record<string, InstalledPlugin>;
}

export interface InstalledPlugin {
  version: string;
  installed_at: string;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface ActivateResponse {
  success: boolean;
  license: {
    plan: string;
    expires_at: string;
    machines_used: number;
    max_machines: number;
  };
}

export interface PluginInfo {
  name: string;
  current_version: string;
  description: string;
}

export interface ListResponse {
  plugins: PluginInfo[];
}

export interface DownloadResponse {
  url: string;
  plugin_name: string;
  version: string;
  expires_in: number;
}

export interface StatusResponse {
  valid: boolean;
  license: {
    plan: string;
    email: string;
    expires_at: string;
    is_active: boolean;
    machines: Array<{
      machine_id: string;
      label: string | null;
      activated_at: string;
    }>;
    allowed_plugins: string[];
  };
}

export interface VersionsResponse {
  plugin_name: string;
  current_version: string;
  versions: Array<{
    version: string;
    changelog: string | null;
    published_at: string;
  }>;
}
