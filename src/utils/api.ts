// API helper for uploading CSV to Cloudinary and MongoDB

export async function uploadCSVToServer(filename: string, csvText: string) {
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, text: csvText })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Upload failed');
    return result;
  } catch (err) {
    console.error('upload error', err);
    throw err;
  }
}

export async function bulkUploadCSVToServer(files: Array<{ filename: string; text: string }>) {
  try {
    const response = await fetch('/api/bulk-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Bulk upload failed');
    return result;
  } catch (err) {
    console.error('bulk upload error', err);
    throw err;
  }
}

export async function fetchUploads() {
  const res = await fetch('/api/uploads');
  if (!res.ok) throw new Error('Failed to fetch uploads');
  const json = await res.json();
  return json.uploads || [];
}

export async function fetchCSVFromUrl(url: string) {
  // fetch raw CSV text from provided URL
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch CSV');
  return await res.text();
}
