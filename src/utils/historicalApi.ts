/**
 * Test backend connectivity
 */
export async function testBackendConnection(): Promise<boolean> {
    try {
        const res = await fetch('/health');
        return res.ok;
    } catch (err) {
        console.error('Backend health check failed:', err);
        return false;
    }
}

/**
 * Fetch historical data from backend
 */
export async function fetchHistoricalDataList() {
    try {
        const res = await fetch('/api/historical-data');
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        const json = await res.json();
        console.log('Backend response:', json);
        const uploads = json.uploads || json.data || [];
        console.log(`Parsed ${uploads.length} uploads from response`);
        return uploads;
    } catch (err) {
        console.error('Error fetching historical data list:', err);
        throw err;
    }
}

/**
 * Fetch specific file metadata
 */
export async function fetchFileData(fileId: string) {
    const res = await fetch(`/api/historical-data/${fileId}`);
    if (!res.ok) throw new Error('Failed to fetch file data');
    const json = await res.json();
    return json.file;
}

/**
 * Fetch and parse CSV content from URL
 */
export async function fetchCSVContent(url: string): Promise<string> {
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} from ${url}`);
        }
        const text = await res.text();
        return text;
    } catch (err) {
        console.error(`Error fetching CSV from ${url}:`, err);
        throw err;
    }
}

/**
 * Get URL from cloudinary object
 */
export function getCloudinaryUrl(cloudinary: any): string {
    console.log('Extracting URL from cloudinary object:', {
        hasSecureUrl: !!cloudinary?.secure_url,
        hasUrl: !!cloudinary?.url,
        hasSecureUrlRaw: !!cloudinary?.secure_url_raw,
        hasPublicId: !!cloudinary?.public_id,
        cloudinaryKeys: cloudinary ? Object.keys(cloudinary) : 'null'
    });

    if (!cloudinary) {
        console.warn('Cloudinary object is null/undefined');
        return '';
    }

    const url = (
        cloudinary.secure_url ||
        cloudinary.url ||
        cloudinary.secure_url_raw ||
        cloudinary.public_id || ''
    );

    console.log('Selected URL:', url);
    return url;
}

/**
 * Delete historical uploads older than `days` days (server-side cleanup)
 */
export async function deleteHistoricalOlderThan(days = 30) {
    const res = await fetch(`/api/historical-data/cleanup?days=${encodeURIComponent(String(days))}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Cleanup failed: ${res.status} ${txt}`);
    }
    return await res.json();
}
