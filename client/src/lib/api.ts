const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

export const API_BASE_URL = configuredApiUrl?.replace(/\/$/, "") || "/api";

export function apiUrl(path: string) {
   const normalizedPath = path.startsWith("/") ? path : `/${path}`;

   return `${API_BASE_URL}${normalizedPath}`;
}

export function assetUrl(path: string) {
    if (path.startsWith("http://") || path.startsWith("http://")) {
        return path;
    }

   

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
}