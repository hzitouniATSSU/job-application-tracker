const configuredApiUrl = import.meta.env.VITE_API_URL as
  | string
  | undefined;

export const API_BASE_URL =
  configuredApiUrl?.replace(/\/$/, "") || "/api";

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${API_BASE_URL}${normalizedPath}`;
}

const SAFE_METHODS = new Set([
  "GET",
  "HEAD",
  "OPTIONS",
]);

let csrfToken: string | null = null;

export function clearCsrfToken() {
  csrfToken = null;
}

async function fetchCsrfToken() {
  const response = await fetch(
    apiUrl("/auth/csrf"),
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to obtain CSRF token"
    );
  }

  const data: { csrfToken: string } =
    await response.json();

  csrfToken = data.csrfToken;

  return csrfToken;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const method = (
    options.method || "GET"
  ).toUpperCase();

  const requiresCsrf =
    !SAFE_METHODS.has(method);

  async function makeRequest() {
    const headers = new Headers(
      options.headers
    );

    if (requiresCsrf) {
      if (!csrfToken) {
        await fetchCsrfToken();
      }

      headers.set(
        "X-CSRF-Token",
        csrfToken!
      );
    }

    return fetch(apiUrl(path), {
      ...options,
      headers,
      credentials: "include",
    });
  }

  let response = await makeRequest();

  if (
    requiresCsrf &&
    response.status === 403
  ) {
    csrfToken = null;
    await fetchCsrfToken();

    response = await makeRequest();
  }

  return response;
}