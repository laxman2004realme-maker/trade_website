export type StockData = {
  symbol: string;
  series: string;
  date: string; // ISO
  prevClose: number;
  open: number;
  high: number;
  low: number;
  last: number;
  close: number;
  avgPrice: number;
  ttlTrdQnty: number;
  turnoverLacs: number; // in lakhs
  noOfTrades: number;
  delivQty?: number;
  delivPerc?: number;
};

export type MarketSummary = {
  totalStocks: number;
  gainers: number;
  losers: number;
  totalVolume: number; // in crores
};

function parseNumber(v: string) {
  if (v == null || v === "") return 0;
  const n = Number(v.replace(/[,\s]+/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseDate(d: string) {
  // Expects formats like 02-Feb-2026
  if (!d) return new Date(0).toISOString();
  const parts = d.split('-');
  if (parts.length !== 3) return new Date(d).toISOString();
  const day = Number(parts[0]);
  const monName = parts[1];
  const year = Number(parts[2]);
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  const m = months[monName] ?? 0;
  return new Date(Date.UTC(year, m, day)).toISOString();
}

export function parseCSV(text: string): StockData[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map(h => h.trim());
  const cols = header.map(h => h.toUpperCase());
  const rows: StockData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    const values = raw.split(',').map(v => v.trim());
    const obj: any = {};
    for (let j = 0; j < cols.length; j++) {
      obj[cols[j]] = values[j] ?? "";
    }
    // Only keep EQ series (Equity)
    if ((obj['SERIES'] ?? '').toUpperCase() !== 'EQ') continue;

    const s: StockData = {
      symbol: obj['SYMBOL'] ?? '',
      series: obj['SERIES'] ?? '',
      date: parseDate(obj['DATE1'] ?? obj['DATE'] ?? ''),
      prevClose: parseNumber(obj['PREV_CLOSE'] ?? obj['PREV PRICE'] ?? ''),
      open: parseNumber(obj['OPEN_PRICE'] ?? obj['OPEN'] ?? ''),
      high: parseNumber(obj['HIGH_PRICE'] ?? obj['HIGH'] ?? ''),
      low: parseNumber(obj['LOW_PRICE'] ?? obj['LOW'] ?? ''),
      last: parseNumber(obj['LAST_PRICE'] ?? obj['LAST'] ?? ''),
      close: parseNumber(obj['CLOSE_PRICE'] ?? obj['CLOSE'] ?? ''),
      avgPrice: parseNumber(obj['AVG_PRICE'] ?? obj['AVG PRICE'] ?? ''),
      ttlTrdQnty: parseNumber(obj['TTL_TRD_QNTY'] ?? obj['TTL_TRD_QTY'] ?? obj['TOTTRDQTY'] ?? ''),
      turnoverLacs: parseNumber(obj['TURNOVER_LACS'] ?? obj['TURNOVER(LACS)'] ?? obj['TURNOVER'] ?? ''),
      noOfTrades: parseNumber(obj['NO_OF_TRADES'] ?? obj['NO_OF_TRADES'] ?? ''),
      delivQty: parseNumber(obj['DELIV_QTY'] ?? obj['DELIV_QTY'] ?? ''),
      delivPerc: parseNumber(obj['DELIV_PER'] ?? obj['DELIV_PER'] ?? ''),
    };
    rows.push(s);
  }
  return rows;
}

export function formatNumber(n: number) {
  if (Math.abs(n) < 1000) return n.toFixed(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function calculateMarketSummary(stocks: StockData[]): MarketSummary {
  const unique = new Set(stocks.map(s => s.symbol));
  let gainers = 0, losers = 0; let totalLacs = 0;
  stocks.forEach(s => {
    if (s.close > s.prevClose) gainers++;
    if (s.close < s.prevClose) losers++;
    totalLacs += s.turnoverLacs || 0;
  });
  // TURNOVER_LACS is in lakhs; convert to crores (1 Cr = 100 Lakhs)
  const totalCr = totalLacs / 100;
  return { totalStocks: unique.size, gainers, losers, totalVolume: totalCr };
}

export function getTopGainers(stocks: StockData[], top = 20) {
  return stocks
    .map(s => ({ ...s, roc: s.prevClose ? ((s.close - s.prevClose) / s.prevClose) * 100 : 0 }))
    .sort((a, b) => b.roc - a.roc)
    .slice(0, top);
}

export function getTopLosers(stocks: StockData[], top = 20) {
  return stocks
    .map(s => ({ ...s, roc: s.prevClose ? ((s.close - s.prevClose) / s.prevClose) * 100 : 0 }))
    .sort((a, b) => a.roc - b.roc)
    .slice(0, top);
}

export function getTopTurnover(stocks: StockData[], top = 20) {
  return stocks.slice().sort((a, b) => (b.turnoverLacs || 0) - (a.turnoverLacs || 0)).slice(0, top);
}

export function getMostTraded(stocks: StockData[], top = 20) {
  return stocks.slice().sort((a, b) => (b.ttlTrdQnty || 0) - (a.ttlTrdQnty || 0)).slice(0, top);
}

/**
 * Get stocks where today's volume beats the 21-day average
 * Filters only EQ series and requires at least 22 data points per stock
 */
export function aboveVolumeAverage(stocks: StockData[]) {
  const groups: Record<string, StockData[]> = {};

  // Group stocks by symbol
  stocks.forEach(s => {
    groups[s.symbol] = groups[s.symbol] || [];
    groups[s.symbol].push(s);
  });

  const results: (StockData & { avgQnty21Days: number; currentQnty: number; percentAboveAvg: number; avg21DaysTurnover?: number; currentTurnover?: number })[] = [];

  // For each stock, calculate 21-day average and check if today beats it
  for (const symbol of Object.keys(groups)) {
    const stockHistory = groups[symbol].slice().sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Need at least 22 data points (21 days + today)
    if (stockHistory.length < 22) continue;

    const today = stockHistory[stockHistory.length - 1];
    const last21Days = stockHistory.slice(-22, -1); // Last 21 days excluding today

    const avg21DaysQnty = last21Days.reduce((acc, cur) => acc + (cur.ttlTrdQnty || 0), 0) / last21Days.length;
    const todayQnty = today.ttlTrdQnty || 0;

    // Calculate turnover averages (turnoverLacs is stored per-row)
    const avg21DaysTurnover = last21Days.reduce((acc, cur) => acc + (cur.turnoverLacs || 0), 0) / last21Days.length;
    const todayTurnover = today.turnoverLacs || 0;

    // Only include if today's volume beats 21-day average
    if (todayQnty > avg21DaysQnty) {
      const percentAbove = ((todayQnty - avg21DaysQnty) / avg21DaysQnty) * 100;
      results.push({
        ...today,
        avgQnty21Days: avg21DaysQnty,
        currentQnty: todayQnty,
        percentAboveAvg: percentAbove
        , avg21DaysTurnover: avg21DaysTurnover
        , currentTurnover: todayTurnover
      });
    }
  }

  // Sort by percent above average (descending)
  return results.sort((a, b) => b.percentAboveAvg - a.percentAboveAvg);
}

export function above21DayAverage(stocks: StockData[]) {
  const groups: Record<string, StockData[]> = {};
  stocks.forEach(s => {
    groups[s.symbol] = groups[s.symbol] || [];
    groups[s.symbol].push(s);
  });
  const results: StockData[] = [];
  for (const sym of Object.keys(groups)) {
    const arr = groups[sym].slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (arr.length < 22) continue;
    const last = arr[arr.length - 1];
    const prev21 = arr.slice(-22, -1);
    const avg = prev21.reduce((acc, cur) => acc + (cur.ttlTrdQnty || 0), 0) / prev21.length;
    if ((last.ttlTrdQnty || 0) > avg) results.push(last);
  }
  return results;
}

/**
 * Calculate 21-day volume average using historical data from multiple CSV files
 * Returns stocks where the most recent day beats the 21-day rolling average
 */
export function calculateHistorical21DayAverage(allStocks: StockData[]) {
  const groups: Record<string, StockData[]> = {};

  // Group all stocks by symbol across all dates
  allStocks.forEach(s => {
    groups[s.symbol] = groups[s.symbol] || [];
    groups[s.symbol].push(s);
  });

  const results: (StockData & {
    avgQnty21Days: number;
    currentQnty: number;
    percentAboveAvg: number;
    daysOfData: number;
    avg21DaysTurnover: number;
    currentTurnover: number;
  })[] = [];

  // For each symbol, find the most recent date and calculate 21-day average
  for (const symbol of Object.keys(groups)) {
    const stockHistory = groups[symbol].slice().sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Need at least 22 data points
    if (stockHistory.length < 22) continue;

    const today = stockHistory[stockHistory.length - 1];
    const last21Days = stockHistory.slice(-22, -1); // Last 21 days excluding today

    const avg21DaysQnty = last21Days.reduce((acc, cur) => acc + (cur.ttlTrdQnty || 0), 0) / last21Days.length;
    const todayQnty = today.ttlTrdQnty || 0;

    // Calculate 21-day average turnover
    const avg21DaysTurnover = last21Days.reduce((acc, cur) => acc + (cur.turnoverLacs || 0), 0) / last21Days.length;
    const currentTurnover = today.turnoverLacs || 0;

    // Only include if today's volume beats 21-day average
    if (todayQnty > avg21DaysQnty) {
      const percentAbove = ((todayQnty - avg21DaysQnty) / avg21DaysQnty) * 100;
      results.push({
        ...today,
        avgQnty21Days: avg21DaysQnty,
        currentQnty: todayQnty,
        percentAboveAvg: percentAbove,
        daysOfData: stockHistory.length,
        avg21DaysTurnover: avg21DaysTurnover,
        currentTurnover: currentTurnover
      });
    }
  }

  // Sort by percent above average (descending)
  return results.sort((a, b) => b.percentAboveAvg - a.percentAboveAvg);
}

export default {
  parseCSV,
  calculateMarketSummary,
  formatNumber,
  getTopGainers,
  getTopLosers,
  getTopTurnover,
  getMostTraded,
  above21DayAverage,
  aboveVolumeAverage,
  calculateHistorical21DayAverage,
  sortBy21DayTurnoverAsc: (stocks: any[]) => stocks.slice().sort((a, b) => a.currentTurnover - b.currentTurnover),
  sortBy21DayTurnoverDesc: (stocks: any[]) => stocks.slice().sort((a, b) => b.currentTurnover - a.currentTurnover),
  sortBy21DayVolumeAsc: (stocks: any[]) => stocks.slice().sort((a, b) => a.currentQnty - b.currentQnty),
  sortBy21DayVolumeDesc: (stocks: any[]) => stocks.slice().sort((a, b) => b.currentQnty - a.currentQnty),
};
