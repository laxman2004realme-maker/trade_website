import React, { useState, useMemo } from 'react';
import csvUtils from './utils/csvParser';
import type { StockData } from './utils/csvParser';
import { uploadCSVToServer, fetchUploads, fetchCSVFromUrl } from './utils/api';
import { formatDateReadable } from './utils/dateUtils';
import { fetchHistoricalDataList, fetchCSVContent, getCloudinaryUrl, testBackendConnection, deleteHistoricalOlderThan } from './utils/historicalApi';
import UploadModal from './components/UploadModal';
import UploadCard from './components/UploadCard';
import StatCard from './components/StatCard';
import ErrorBoundary from './components/ErrorBoundary';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  // Utility to format date as YYYY-MM-DD without timezone conversion
  const formatDateString = (date: Date | string): string => {
    if (typeof date === 'string') return date;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [loadedDataDate, setLoadedDataDate] = useState<string | null>(null);
  const [showAllTurnover, setShowAllTurnover] = useState(false);
  const [showAllMostTraded, setShowAllMostTraded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = React.useState<any[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState<string | null>(null);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [above21DaySortBy, setAbove21DaySortBy] = useState<'percentAbove' | 'turnover-asc' | 'turnover-desc'>('percentAbove');
  const [showAllUploads, setShowAllUploads] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAllAbove21, setShowAllAbove21] = useState(false);
  const [above21Search, setAbove21Search] = useState('');
  const [uploadSearch, setUploadSearch] = useState('');
  const [historical21Results, setHistorical21Results] = useState<any[] | null>(null);
  const [showAllGainers, setShowAllGainers] = useState(false);
  const [gainersSearch, setGainersSearch] = useState('');
  const [showAllLosers, setShowAllLosers] = useState(false);
  const [losersSearch, setLosersSearch] = useState('');
  const [turnoverSearch, setTurnoverSearch] = useState('');
  const [mostTradedSearch, setMostTradedSearch] = useState('');

  const loadUploads = async () => {
    try {
      const data = await fetchUploads();
      setUploads(data);
    } catch (err) {
      console.warn('failed to load uploads', err);
    }
  };

  React.useEffect(() => {
    loadUploads();
  }, []);

  const handleFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const parsed = csvUtils.parseCSV(text);
    setStocks(parsed);
    setLoadedFileName(file.name);

    // Extract date from filename
    const dateMatch = file.name.match(/(\d{8})/);
    let dateFormatted: string | null = null;
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const day = parseInt(dateStr.substring(0, 2), 10);
      const month = parseInt(dateStr.substring(2, 4), 10);
      const year = parseInt(dateStr.substring(4, 8), 10);
      // Format as YYYY-MM-DD directly to avoid timezone issues
      dateFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      setLoadedDataDate(dateFormatted);
    }

    // upload to server for storage
    setUploading(true);
    try {
      await uploadCSVToServer(file.name, text);
      loadUploads();

      // After upload, try to calculate 21-day averages from historical data
      if (dateFormatted) {
        try {
          const allUploads = await fetchHistoricalDataList();
          const candidates = allUploads
            .filter((u: any) => u.dataDate)
            .sort((a: any, b: any) => new Date(a.dataDate).getTime() - new Date(b.dataDate).getTime());

          // Find uploaded file in candidates
          const idx = candidates.findIndex((u: any) =>
            u.filename === file.name ||
            (u.dataDate && formatDateString(u.dataDate) === dateFormatted)
          );

          if (idx >= 0) {
            const start = Math.max(0, idx - 21 + 1);
            const slice = candidates.slice(start, idx + 1);

            if (slice.length >= 2) {
              const fetches = slice.map(async (u: any) => {
                const url = getCloudinaryUrl(u.cloudinary);
                if (!url) return [];
                try {
                  const txt = await fetchCSVContent(url);
                  return csvUtils.parseCSV(txt);
                } catch (e) {
                  return [];
                }
              });
              const arrays = await Promise.all(fetches);
              const allStocksFlat = ([] as any[]).concat(...arrays);
              if (allStocksFlat.length > 0) {
                const histResults = csvUtils.calculateHistorical21DayAverage(allStocksFlat);
                setHistorical21Results(histResults);
              }
            }
          }
        } catch (e) {
          console.warn('Failed to compute 21-day averages after upload', e);
        }
      }
    } catch (err) {
      console.warn('upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const loadUploadEntry = async (entry: any) => {
    try {
      setLoadingUpload(entry._id);
      const url =
        entry.cloudinary &&
        (entry.cloudinary.secure_url ||
          entry.cloudinary.url ||
          entry.cloudinary.secure_url_raw ||
          entry.cloudinary.public_id);
      if (!url) return alert('No URL found for this upload');

      let fetchUrl = url;
      if (entry.cloudinary && !fetchUrl && entry.cloudinary.public_id) {
        const cloudName =
          (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME || '';
        fetchUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${entry.cloudinary.public_id}`;
      }

      const csvText = await fetchCSVFromUrl(fetchUrl);
      const parsed = csvUtils.parseCSV(csvText);
      setStocks(parsed);
      setLoadedFileName(entry.filename || 'uploaded');

      // Extract date from filename to avoid timezone issues with backend date
      const dateMatch = (entry.filename || '').match(/(\d{8})/);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const day = parseInt(dateStr.substring(0, 2), 10);
        const month = parseInt(dateStr.substring(2, 4), 10);
        const year = parseInt(dateStr.substring(4, 8), 10);
        const dateFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setLoadedDataDate(dateFormatted);
      } else {
        setLoadedDataDate(entry.formattedDataDate || null);
      }

      // Reset search filters when loading a new file
      setAbove21Search('');
      setGainersSearch('');
      setLosersSearch('');
      setTurnoverSearch('');
      setMostTradedSearch('');
      setUploadSearch('');

      // Automatically load 21-day averages
      console.log('🔄 Auto-loading 21-day averages for:', entry.filename);
      try {
        const allUploads = await fetchHistoricalDataList();
        const candidates = allUploads
          .filter((u: any) => u.dataDate)
          .sort((a: any, b: any) => new Date(a.dataDate).getTime() - new Date(b.dataDate).getTime());

        const idx = candidates.findIndex((u: any) =>
          u.filename === entry.filename ||
          (u.dataDate && u._id === entry._id) ||
          (u.dataDate && formatDateString(u.dataDate) === formatDateString(entry.dataDate))
        );

        const start = Math.max(0, idx >= 0 ? idx - 21 + 1 : 0);
        const slice = idx >= 0 ? candidates.slice(start, idx + 1) : candidates.slice(-22);

        if (slice.length >= 2) {
          console.log(`📊 Found ${slice.length} records for 21-day average calculation`);
          const fetches = slice.map(async (u: any) => {
            const url = getCloudinaryUrl(u.cloudinary);
            if (!url) return [];
            try {
              const txt = await fetchCSVContent(url);
              return csvUtils.parseCSV(txt);
            } catch (e) {
              console.warn(`Failed to fetch ${u.filename}:`, e);
              return [];
            }
          });
          const arrays = await Promise.all(fetches);
          const allStocksFlat = ([] as any[]).concat(...arrays);
          if (allStocksFlat.length > 0) {
            const histResults = csvUtils.calculateHistorical21DayAverage(allStocksFlat);
            setHistorical21Results(histResults);
            console.log(`✓ Calculated 21-day averages: ${histResults.length} stocks above average`);
          } else {
            console.warn('No valid stock data from fetched files');
            setHistorical21Results([]);
          }
        } else {
          console.log(`⚠️ Not enough data for 21-day average (${slice.length} records, need ≥2)`);
          setHistorical21Results([]);
        }
      } catch (e) {
        console.warn('Failed to compute 21-day averages for this file', e);
        setHistorical21Results([]);
      }
    } catch (err) {
      console.error('load upload failed', err);
      alert('Failed to load upload');
    } finally {
      setLoadingUpload(null);
    }
  };

  const loadHistorical21DayData = async () => {
    try {
      setLoadingHistorical(true);
      console.log('=== Starting Historical Data Load ===');

      // Step 1: Test backend connectivity
      console.log('Step 1: Testing backend connectivity...');
      const backendConnected = await testBackendConnection();
      console.log('Backend health check:', backendConnected ? '✓ Connected' : '✗ Failed');

      // Step 2: Fetch list of all uploads
      console.log('Step 2: Fetching uploads list from /api/historical-data...');
      const uploadsList = await fetchHistoricalDataList();
      console.log(`Step 2 Complete: Found ${uploadsList.length} uploads`);

      if (uploadsList.length === 0) {
        alert('No uploads found in historical data. Please upload CSV files first.');
        return;
      }

      // Step 3: Fetch and parse all CSV files
      console.log(`Step 3: Loading and parsing ${uploadsList.length} CSV files...`);
      const allStocks: StockData[] = [];
      let fileCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < uploadsList.length; i++) {
        const upload = uploadsList[i];
        try {
          console.log(`  File ${i + 1}/${uploadsList.length}: ${upload.filename}`);
          const url = getCloudinaryUrl(upload.cloudinary);

          if (!url) {
            console.warn(`    ✗ No URL found in cloudinary object`, upload.cloudinary);
            errors.push(`${upload.filename}: No URL found`);
            continue;
          }

          console.log(`    URL: ${url.substring(0, 50)}...`);

          let fetchUrl = url;
          if (typeof url === 'string' && !url.startsWith('http')) {
            const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME || '';
            fetchUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${url}`;
            console.log(`    Constructed URL: ${fetchUrl}`);
          }

          console.log(`    Fetching CSV content...`);
          const csvText = await fetchCSVContent(fetchUrl);
          console.log(`    ✓ Downloaded ${csvText.length} bytes`);

          const parsed = csvUtils.parseCSV(csvText);
          console.log(`    ✓ Parsed ${parsed.length} stocks (EQ series)`);

          allStocks.push(...parsed);
          fileCount++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`  ✗ Failed: ${errMsg}`, err);
          errors.push(`${upload.filename}: ${errMsg}`);
        }
      }

      console.log(`Step 3 Complete: Loaded ${allStocks.length} stocks from ${fileCount} files`);

      if (allStocks.length === 0) {
        const errorDetail = errors.length > 0 ? `\n\nErrors:\n${errors.join('\n')}` : '';
        alert(`No valid stock data found in uploads${errorDetail}`);
        return;
      }

      // Step 4: Calculate 21-day averages without changing main data
      console.log('Step 4: Calculating 21-day averages...');
      const histResults = csvUtils.calculateHistorical21DayAverage(allStocks);
      setHistorical21Results(histResults);
      console.log(`✓ Calculated: ${histResults.length} stocks above 21-day average`);

      if (errors.length > 0) {
        console.warn(`⚠️ ${errors.length} files had errors:`, errors);
      }

      console.log('=== Historical Data Load Complete ===');
    } catch (err) {
      console.error('=== Historical Data Load Failed ===', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setLoadError(errMsg);
      alert(`Failed to load historical data:\n${errMsg}\n\nCheck browser console (F12) for detailed logs.`);
    } finally {
      setLoadingHistorical(false);
    }
  };

  const summary = useMemo(() => csvUtils.calculateMarketSummary(stocks), [stocks]);
  const topGainers = useMemo(() => csvUtils.getTopGainers(stocks, 10), [stocks]);
  const topLosers = useMemo(() => csvUtils.getTopLosers(stocks, 10), [stocks]);
  const topTurnover = useMemo(
    () => csvUtils.getTopTurnover(stocks, showAllTurnover ? Math.max(50, stocks.length) : 10),
    [stocks, showAllTurnover]
  );
  const mostTraded = useMemo(
    () => csvUtils.getMostTraded(stocks, showAllMostTraded ? Math.max(50, stocks.length) : 10),
    [stocks, showAllMostTraded]
  );
  const aboveAvgVolume = useMemo(() => {
    const base = historical21Results !== null ? historical21Results : csvUtils.aboveVolumeAverage(stocks);
    if (above21DaySortBy === 'turnover-asc') {
      return csvUtils.sortBy21DayTurnoverAsc(base);
    } else if (above21DaySortBy === 'turnover-desc') {
      return csvUtils.sortBy21DayTurnoverDesc(base);
    }
    return base; // Default: by percentAbove
  }, [stocks, above21DaySortBy, historical21Results]);

  const totalVolumeStr = csvUtils.formatNumber(summary.totalVolume) + 'Cr';
  const gainersPercent = ((summary.gainers / summary.totalStocks) * 100).toFixed(1);
  const losersPercent = ((summary.losers / summary.totalStocks) * 100).toFixed(1);

  const hasData = stocks.length > 0;

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1 className="header-title">NSE EOD Data Analyzer</h1>
            <p className="header-subtitle">National Stock Exchange End of Day Market Data</p>
          </div>
          <div className="header-actions">
            <button className="btn-bulk-upload" onClick={() => setShowUploadModal(true)}>
              📁 Bulk Upload
            </button>
            <button
              className="btn-historical"
              onClick={loadHistorical21DayData}
              disabled={loadingHistorical}
              title="Load all CSV files to analyze 21-day volume averages"
            >
              {loadingHistorical ? '⟳ Loading Historical...' : '📊 Load 21-Day Average'}
            </button>
            <button
              className="btn-cleanup"
              onClick={async () => {
                if (!confirm('Keep the latest 30 records and delete older uploads? This cannot be undone.')) return;
                try {
                  const res = await deleteHistoricalOlderThan(30);
                  alert(`Deleted ${res.deleted || res.deletedCount || 0} uploads`);
                  loadUploads();
                } catch (e) {
                  console.error('Cleanup failed', e);
                  alert('Cleanup failed: ' + (e instanceof Error ? e.message : String(e)));
                }
              }}
            >
              🗑️ Cleanup (keep 30)
            </button>
            <label className="btn-single-upload">
              📤 Upload CSV
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFile(e.target.files?.[0])}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            {uploading && <span className="uploading-indicator">Uploading...</span>}
          </div>
        </div>

        {hasData && (
          <div className="loaded-file-info">
            <span className="loaded-label">Currently viewing:</span>
            <span className="loaded-name">{loadedFileName}</span>
            {loadedDataDate && (
              <span className="loaded-date">{formatDateReadable(loadedDataDate)}</span>
            )}
          </div>
        )}
      </header>

      {loadError && (
        <div style={{ background: '#fee2e2', padding: 12, margin: '12px 24px', borderRadius: 8 }}>
          <strong style={{ color: '#991b1b' }}>Error:</strong> {loadError}
          <button style={{ marginLeft: 12 }} onClick={() => setLoadError(null)}>Dismiss</button>
        </div>
      )}

      <ErrorBoundary>
        <main className="dashboard-main">
          {/* Previous uploads section */}
          {uploads.length > 0 && (
            <section className="uploads-section">
              <div className="uploads-header">
                <h2 className="section-title">📊 Previous Uploads</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    placeholder="Search uploads by filename or date"
                    value={uploadSearch}
                    onChange={(e) => setUploadSearch(e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}
                  />
                  {uploads.length > 8 && (
                    <button
                      className={`view-all-btn ${showAllUploads ? 'active' : ''}`}
                      onClick={() => setShowAllUploads(!showAllUploads)}
                    >
                      {showAllUploads ? '▼ Hide All' : '▲ View All'}
                    </button>
                  )}
                </div>
              </div>
              <div
                className="uploads-grid"
                style={showAllUploads ? { maxHeight: 360, overflowY: 'auto', paddingRight: 8 } : {}}
              >
                {uploads
                  .slice()
                  .sort((a: any, b: any) => {
                    const dateA = a.dataDate ? new Date(a.dataDate).getTime() : 0;
                    const dateB = b.dataDate ? new Date(b.dataDate).getTime() : 0;
                    return dateB - dateA;
                  })
                  .filter((u: any) => {
                    if (!uploadSearch) return true;
                    const s = uploadSearch.toLowerCase();
                    return (u.filename || '').toLowerCase().includes(s) || (u.formattedDataDate || '').toLowerCase().includes(s);
                  })
                  .slice(0, showAllUploads ? uploads.length : 8)
                  .map((u: any) => (
                    <UploadCard
                      key={u._id}
                      filename={u.filename}
                      uploadedAt={u.uploadedAt}
                      dataDate={u.dataDate}
                      formattedDataDate={u.formattedDataDate}
                      onLoad={() => loadUploadEntry(u)}
                      isLoading={loadingUpload === u._id}
                    />
                  ))}
              </div>
              {uploads.length > 8 && !showAllUploads && (
                <p className="view-more-text">
                  + {uploads.length - 8} more uploads available. <button className="inline-link-btn" onClick={() => setShowAllUploads(true)}>View all</button>
                </p>
              )}
            </section>
          )}

          {!hasData ? (
            <div className="no-data-state">
              <div className="no-data-content">
                <div className="no-data-icon">📈</div>
                <h2>No Data Loaded</h2>
                <p>Upload a CSV file containing NSE EOD market data to get started.</p>
                <button className="btn-primary-large" onClick={() => setShowUploadModal(true)}>
                  Get Started with Bulk Upload
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <section className="stats-grid-section">
                <h2 className="section-title">Market Overview</h2>
                <div className="stats-grid">
                  <StatCard
                    label="Total Stocks"
                    value={summary.totalStocks.toLocaleString()}
                    icon="📊"
                    color="default"
                  />
                  <StatCard
                    label="Gainers"
                    value={summary.gainers.toLocaleString()}
                    icon="📈"
                    color="success"
                    trend={{ direction: 'up', value: parseFloat(gainersPercent) }}
                  />
                  <StatCard
                    label="Losers"
                    value={summary.losers.toLocaleString()}
                    icon="📉"
                    color="danger"
                    trend={{ direction: 'down', value: parseFloat(losersPercent) }}
                  />
                  <StatCard
                    label="Total Volume"
                    value={totalVolumeStr}
                    icon="💱"
                    color="primary"
                  />
                </div>
              </section>

              {/* Top Gainers & Losers */}
              <section className="gainers-losers-section">
                <h2 className="section-title">Top Gainers & Losers</h2>
                <div className="two-column-grid">
                  <div className="column-card">
                    <div className="column-header">
                      <h3 className="column-title">📈 Top 10 Gainers</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          placeholder="Search symbol"
                          value={gainersSearch}
                          onChange={(e) => setGainersSearch(e.target.value.trim().toUpperCase())}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                        />
                        <button
                          className="toggle-btn"
                          onClick={() => setShowAllGainers((v) => !v)}
                        >
                          {showAllGainers ? 'Show Less' : 'View All'}
                        </button>
                      </div>
                    </div>
                    <table className="stock-table" style={showAllGainers ? { display: 'block', maxHeight: 360, overflowY: 'auto' } : { display: 'block' }}>
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Close Price</th>
                          <th>ROC%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topGainers
                          .filter((s) => !gainersSearch || s.symbol.toUpperCase().includes(gainersSearch))
                          .slice(0, showAllGainers ? topGainers.length : 10)
                          .map((s) => (
                            <tr key={s.symbol}>
                              <td className="symbol-cell">{s.symbol}</td>
                              <td className="price-cell">₹{s.close.toFixed(2)}</td>
                              <td className="roc-cell gainers">
                                +{(((s.close - s.prevClose) / (s.prevClose || 1)) * 100).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="column-card">
                    <div className="column-header">
                      <h3 className="column-title">📉 Top 10 Losers</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          placeholder="Search symbol"
                          value={losersSearch}
                          onChange={(e) => setLosersSearch(e.target.value.trim().toUpperCase())}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                        />
                        <button
                          className="toggle-btn"
                          onClick={() => setShowAllLosers((v) => !v)}
                        >
                          {showAllLosers ? 'Show Less' : 'View All'}
                        </button>
                      </div>
                    </div>
                    <table className="stock-table" style={showAllLosers ? { display: 'block', maxHeight: 360, overflowY: 'auto' } : { display: 'block' }}>
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Close Price</th>
                          <th>ROC%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topLosers
                          .filter((s) => !losersSearch || s.symbol.toUpperCase().includes(losersSearch))
                          .slice(0, showAllLosers ? topLosers.length : 10)
                          .map((s) => (
                            <tr key={s.symbol}>
                              <td className="symbol-cell">{s.symbol}</td>
                              <td className="price-cell">₹{s.close.toFixed(2)}</td>
                              <td className="roc-cell losers">
                                {(((s.close - s.prevClose) / (s.prevClose || 1)) * 100).toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Trading Activity */}
              <section className="trading-activity-section">
                <h2 className="section-title">Trading Activity</h2>
                <div className="two-column-grid">
                  <div className="column-card">
                    <div className="column-header">
                      <h3 className="column-title">💰 Top Turnover Stocks</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          placeholder="Search symbol"
                          value={turnoverSearch}
                          onChange={(e) => setTurnoverSearch(e.target.value.trim().toUpperCase())}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                        />
                        <button
                          className="toggle-btn"
                          onClick={() => setShowAllTurnover((v) => !v)}
                        >
                          {showAllTurnover ? 'Show Less' : 'View All'}
                        </button>
                      </div>
                    </div>
                    <table className="stock-table" style={showAllTurnover ? { display: 'block', maxHeight: 360, overflowY: 'auto' } : { display: 'block' }}>
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Close Price</th>
                          <th>Turnover</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topTurnover
                          .filter((s) => !turnoverSearch || s.symbol.toUpperCase().includes(turnoverSearch))
                          .slice(0, showAllTurnover ? topTurnover.length : 10)
                          .map((s) => (
                            <tr key={s.symbol}>
                              <td className="symbol-cell">{s.symbol}</td>
                              <td className="price-cell">₹{s.close.toFixed(2)}</td>
                              <td className="turnover-cell">
                                {csvUtils.formatNumber(s.turnoverLacs)}L
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="column-card">
                    <div className="column-header">
                      <h3 className="column-title">📊 Most Traded Stocks</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          placeholder="Search symbol"
                          value={mostTradedSearch}
                          onChange={(e) => setMostTradedSearch(e.target.value.trim().toUpperCase())}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                        />
                        <button
                          className="toggle-btn"
                          onClick={() => setShowAllMostTraded((v) => !v)}
                        >
                          {showAllMostTraded ? 'Show Less' : 'View All'}
                        </button>
                      </div>
                    </div>
                    <table className="stock-table" style={showAllMostTraded ? { display: 'block', maxHeight: 360, overflowY: 'auto' } : { display: 'block' }}>
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Close Price</th>
                          <th>Trades</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mostTraded
                          .filter((s) => !mostTradedSearch || s.symbol.toUpperCase().includes(mostTradedSearch))
                          .slice(0, showAllMostTraded ? mostTraded.length : 10)
                          .map((s) => (
                            <tr key={s.symbol}>
                              <td className="symbol-cell">{s.symbol}</td>
                              <td className="price-cell">₹{s.close.toFixed(2)}</td>
                              <td className="trades-cell">{s.ttlTrdQnty.toLocaleString()}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Above 21-Day Average Volume */}
              <section className="above-avg-section">
                <h2 className="section-title">⚡ Above 21-Day Average Volume (EQ Series)</h2>
                <div className="sorting-controls">
                  <button
                    className={`sort-btn ${above21DaySortBy === 'percentAbove' ? 'active' : ''}`}
                    onClick={() => setAbove21DaySortBy('percentAbove')}
                    title="Sort by percentage above average (highest first)"
                  >
                    📊 By % Above Average
                  </button>
                  <button
                    className={`sort-btn ${above21DaySortBy === 'turnover-desc' ? 'active' : ''}`}
                    onClick={() => setAbove21DaySortBy('turnover-desc')}
                    title="Sort by turnover highest first"
                  >
                    💰 Turnover (High to Low)
                  </button>
                  <button
                    className={`sort-btn ${above21DaySortBy === 'turnover-asc' ? 'active' : ''}`}
                    onClick={() => setAbove21DaySortBy('turnover-asc')}
                    title="Sort by turnover lowest first"
                  >
                    💰 Turnover (Low to High)
                  </button>
                  <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center' }}>
                    <input
                      placeholder="Search symbol"
                      value={above21Search}
                      onChange={(e) => setAbove21Search(e.target.value.trim().toUpperCase())}
                      style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}
                    />
                    <button
                      className="toggle-btn"
                      onClick={() => setShowAllAbove21((v) => !v)}
                      style={{ marginLeft: 8 }}
                    >
                      {showAllAbove21 ? 'Show Less' : 'View All'}
                    </button>
                  </div>
                </div>
                <div className="column-card">
                  {aboveAvgVolume.length === 0 ? (
                    <div className="no-results">
                      No stocks found with volume above their 21-day average.
                    </div>
                  ) : (
                    <table className="stock-table" style={showAllAbove21 ? { display: 'block', maxHeight: 360, overflowY: 'auto' } : { display: 'block' }}>
                      <thead>
                        <tr>
                          <th>Symbol</th>
                          <th>Close Price</th>
                          <th>Today's Volume</th>
                          <th>21-Day Avg Vol</th>
                          <th>% Above Avg</th>
                          <th>Today's Turnover (₹ Lakhs)</th>
                          <th>21-Day Avg Turnover (₹ Lakhs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aboveAvgVolume.filter(Boolean)
                          .filter((s: any) => {
                            if (!above21Search) return true;
                            return (s?.symbol || '').toString().toUpperCase().includes(above21Search);
                          })
                          .slice(0, showAllAbove21 ? aboveAvgVolume.length : 20)
                          .map((s: any) => (
                            <tr key={`${s?.symbol ?? 'unk'}-${s?.date ?? ''}`}>
                              <td className="symbol-cell">{s?.symbol ?? '-'}</td>
                              <td className="price-cell">₹{Number(s?.close || 0).toFixed(2)}</td>
                              <td className="trades-cell">
                                {csvUtils.formatNumber(Number(s?.currentQnty || 0))}
                              </td>
                              <td className="trades-cell">
                                {csvUtils.formatNumber(Number(s?.avgQnty21Days || 0))}
                              </td>
                              <td className="roc-cell gainers">
                                +{Number(s?.percentAboveAvg || 0).toFixed(2)}%
                              </td>
                              <td className="turnover-cell">
                                {csvUtils.formatNumber(Number(s?.currentTurnover || 0))}
                              </td>
                              <td className="turnover-cell">
                                {csvUtils.formatNumber(Number(s?.avg21DaysTurnover || 0))}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              {/* Market Sentiment */}
              <section className="sentiment-section">
                <h2 className="section-title">Market Sentiment Overview</h2>
                <div className="sentiment-circles">
                  <div className="sentiment-item">
                    <div
                      className="circle gainers"
                      style={{
                        width: Math.max(100, Math.min(280, summary.gainers * 0.6)) + 'px',
                        height: Math.max(100, Math.min(280, summary.gainers * 0.6)) + 'px',
                      }}
                    />
                    <div className="sentiment-label">
                      <strong>Total Gainers ROC</strong>
                      <span>{gainersPercent}%</span>
                    </div>
                    <span className="sentiment-count">{summary.gainers} stocks</span>
                  </div>
                  <div className="sentiment-item">
                    <div
                      className="circle losers"
                      style={{
                        width: Math.max(100, Math.min(280, summary.losers * 0.6)) + 'px',
                        height: Math.max(100, Math.min(280, summary.losers * 0.6)) + 'px',
                      }}
                    />
                    <div className="sentiment-label">
                      <strong>Total Losers ROC</strong>
                      <span>{losersPercent}%</span>
                    </div>
                    <span className="sentiment-count">{summary.losers} stocks</span>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </ErrorBoundary>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={loadUploads}
      />
    </div>
  );
};

export default Dashboard;
