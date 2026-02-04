/**
 * API Configuration
 * Uses full backend URL in production, relative paths in development
 */

const getApiBaseUrl = (): string => {
    // In production (deployed to Vercel), use the full backend URL
    if (import.meta.env.PROD) {
        return 'https://trade-web-backend-dbxjeqm31-laxmans-projects-7bd3c892.vercel.app';
    }

    // In development, use relative paths (proxied by vite)
    return '';
};

export const API_BASE_URL = getApiBaseUrl();

export const getFullUrl = (path: string): string => {
    return `${API_BASE_URL}${path}`;
};
