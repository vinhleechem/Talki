import { supabase } from "@/integrations/supabase/client";

function normalizeApiBase(raw: string): string {
  const trimmed = (raw || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "/api/v1";
  if (trimmed.endsWith("/api/v1")) return trimmed;
  if (trimmed.endsWith("/api")) return `${trimmed}/v1`;
  return `${trimmed}/api/v1`;
}

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL || "");

function toUserErrorMessage(raw: unknown, fallback: string): string {
  const detail =
    typeof raw === "string"
      ? raw
      : typeof raw === "object" && raw
        ? String(
            (raw as { detail?: unknown; message?: unknown }).detail ??
              (raw as { detail?: unknown; message?: unknown }).message ??
              "",
          )
        : "";

  const text = detail.trim();
  if (!text) return fallback;

  const lowered = text.toLowerCase();
  const looksSensitive =
    lowered.includes("permission_denied") ||
    lowered.includes("api key") ||
    lowered.includes("leaked") ||
    lowered.includes("{'error'") ||
    lowered.includes('{"error"');

  if (looksSensitive) return fallback;

  const payloadMarker = text.indexOf(" ({");
  if (payloadMarker > 0) {
    return text.slice(0, payloadMarker).trim();
  }

  if (text.length > 220) return fallback;
  return text;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}` };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getAuthHeader();
  const defaultHeaders =
    options.body instanceof FormData
      ? { ...headers }
      : { "Content-Type": "application/json", ...headers };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  });

  const parseResponseBody = async (): Promise<unknown> => {
    if (res.status === 204) return undefined;
    const text = await res.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  if (!res.ok) {
    const err = await parseResponseBody();
    const fallback = res.statusText || "Không thể xử lý yêu cầu";
    throw new Error(toUserErrorMessage(err, fallback));
  }

  const body = await parseResponseBody();
  return body as T;
}

export { apiFetch, getAuthHeader, API_BASE };
