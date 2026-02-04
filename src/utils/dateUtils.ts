/**
 * Extract date from CSV filename
 * Supports formats like: sec_bhavdata_full_01012026.csv
 */
export function extractDateFromFilename(filename: string): Date | null {
    try {
        const dateMatch = filename.match(/(\d{8})/);
        if (!dateMatch) return null;

        const dateStr = dateMatch[1];
        const day = parseInt(dateStr.substring(0, 2), 10);
        const month = parseInt(dateStr.substring(2, 4), 10);
        const year = parseInt(dateStr.substring(4, 8), 10);

        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
            return null;
        }

        return new Date(year, month - 1, day);
    } catch (e) {
        return null;
    }
}

/**
 * Format date for display (YYYY-MM-DD)
 */
export function formatDate(date: Date | null): string | null {
    if (!date) return null;
    return date.toISOString().split('T')[0];
}

/**
 * Format date for display (human readable)
 */
export function formatDateReadable(date: Date | string | null): string {
    if (!date) return 'Unknown';
    let dateObj: Date;

    if (typeof date === 'string') {
        // Parse YYYY-MM-DD format without timezone conversion
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
    } else {
        dateObj = date;
    }

    return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
