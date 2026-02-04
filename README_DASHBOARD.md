# NSE EOD Dashboard - Vite + React

A modern dashboard for analyzing NSE (National Stock Exchange) EOD (End of Day) market data.

## Features

- **CSV Upload**: Load NSE EOD data files
- **EQ Series Only**: Automatically filters for equity stocks
- **Top Lists**: Top 20 Gainers, Top 20 Losers, Top Turnover, Most Traded
- **See All**: Toggle to view all results for Top Turnover and Most Traded
- **21-Day Average**: Identify stocks trading above 21-day average volume
- **Market Sentiment**: Visualization of gainers vs losers with circles sized by count
- **Volume Tracking**: TURNOVER_LACS converted to Crores for easy readability

## Setup

### 1. Install Dependencies

```bash
cd my-app
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/stocks?retryWrites=true&w=majority
MONGODB_DB=stocks
```

### 3. Run the App

#### Frontend (Vite)
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

#### Backend (Optional - for uploading to Cloudinary/MongoDB)
 The backend has been moved to the repository root `backend/` folder.
 To run the backend server, open a separate terminal, change to the `backend` folder and run the install and start commands:
 
 ```bash
 cd ../backend
 npm install
 npm start
 ```
 
 Backend will listen on `http://localhost:5000` by default (or the port set in `backend/.env`).

If you want the frontend to connect to the backend, update the API URL in `src/utils/api.ts`:
```typescript
// Vite proxies `/api` to http://localhost:5000 in `vite.config.ts` by default.
// If you do not use the proxy, replace `/api` with `http://localhost:5000/api` in `src/utils/api.ts`.
```

## CSV File Format

Expected columns (NSE EOD format):
- SYMBOL
- SERIES (filter for 'EQ' only)
- DATE1
- PREV_CLOSE
- OPEN_PRICE
- HIGH_PRICE
- LOW_PRICE
- LAST_PRICE
- CLOSE_PRICE
- AVG_PRICE
- TTL_TRD_QNTY (Total Traded Quantity)
- TURNOVER_LACS
- NO_OF_TRADES
- DELIV_QTY
- DELIV_PER

## Key Calculations

- **ROC (Rate of Change)**: `((close - prevClose) / prevClose) * 100`
- **Total Volume**: Sum of TURNOVER_LACS / 100 (convert to Crores)
- **21-Day Average**: For each symbol with ≥22 days, today's TTL_TRD_QNTY vs average of previous 21 days
- **Sentiment Circles**: Diameter proportional to gainer/loser counts (scaled 0.5x, bounded 60-240px)

## Project Structure

```
my-app/
├── src/
│   ├── Dashboard.tsx          # Main component
│   ├── Dashboard.css          # Dashboard styles
│   ├── utils/
│   │   ├── csvParser.ts       # CSV parsing & calculations
│   │   └── api.ts             # API client helper
│   ├── App.tsx                # App wrapper
│   └── main.tsx               # Entry point
├── server.js                  # Optional backend (Node.js + Express)
├── .env.example               # Environment variables template
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Notes

- The parser filters for `SERIES === 'EQ'` only (Equity stocks)
- All calculations are done client-side for performance
- Cloudinary/MongoDB integration is optional; you can use the app offline with just CSV file upload
- Market Sentiment circles scale dynamically based on gainer/loser counts

## Using the attached screenshots for UI images

I added styles and placeholders that reference images in `public/assets/`. To use your attached screenshots in the UI, save them to the following paths in the `my-app/public/assets/` folder:

- `public/assets/header-hero.png` — used as the header hero/banner background
- `public/assets/top-gainers.png` — used as banner/preview for the Top Gainers area (optional)

After copying the screenshots to those paths the app will load them automatically. If you prefer other filenames, update `src/Dashboard.tsx` to point to your assets.
