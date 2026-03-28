# NSE EOD Data Analyzer

A full-stack dashboard for analyzing NSE (National Stock Exchange) EOD CSV data.

The project includes:
- `my-app/`: React + TypeScript + Vite frontend dashboard
- `backend/`: Node.js + Express API for CSV upload, Cloudinary storage, and MongoDB metadata

## Features

- Upload single or multiple NSE EOD CSV files
- Parse and filter EQ series data
- View top gainers, top losers, top turnover, and most traded stocks
- Calculate 21-day average volume breakouts
- Persist uploads to Cloudinary and metadata to MongoDB
- Load historical uploads and clean up older records

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express
- Database: MongoDB Atlas
- File Storage: Cloudinary

## Project Structure

```text
Website/
├─ backend/
│  ├─ src/
│  ├─ server.js
│  └─ .env.example
├─ my-app/
│  ├─ src/
│  ├─ vite.config.ts
│  └─ .env.example
├─ DEBUGGING_GUIDE.md
└─ README.md
```

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+
- MongoDB connection URI
- Cloudinary account credentials

## Local Setup

1. Clone the repo and move into the project root.

```bash
git clone <your-repo-url>
cd Website
```

2. Setup and run backend.

```bash
cd backend
npm install
# create backend/.env from backend/.env.example and update values
npm start
```

Backend runs on `http://localhost:5000` by default.

3. Setup and run frontend (new terminal).

```bash
cd my-app
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Environment Variables

Create `backend/.env` with:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/stocks?retryWrites=true&w=majority
PORT=5000
```

Optional frontend env file `my-app/.env.local`:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key
VITE_CLOUDINARY_API_SECRET=your_api_secret
```

## Frontend-Backend Connection (Dev)

`my-app/vite.config.ts` currently proxies `/api` and `/health`.

For local backend development, set proxy target to:
- `http://localhost:5000`

For remote backend development, keep your deployed backend URL as target.

## API Endpoints

- `GET /health` - health check
- `POST /api/upload` - upload one CSV
- `POST /api/bulk-upload` - upload multiple CSV files
- `GET /api/uploads` - recent uploads
- `GET /api/historical-data` - list historical uploads
- `GET /api/historical-data/:fileId` - get one uploaded file record
- `DELETE /api/historical-data/cleanup?days=30` - keep latest N records, remove older ones

## CSV Requirements

- Filename should contain date in `DDMMYYYY` format.
- Example: `sec_bhavdata_full_02022026.csv`
- Expected columns include:
`SYMBOL`, `SERIES`, `DATE1`, `PREV_CLOSE`, `OPEN_PRICE`, `HIGH_PRICE`, `LOW_PRICE`, `CLOSE_PRICE`, `TTL_TRD_QNTY`, `TURNOVER_LACS`

## Troubleshooting

- See [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md) for historical-load debugging.
- If upload fails, verify Cloudinary credentials in `backend/.env`.
- If historical endpoints fail, verify `MONGODB_URI` and DB network access.

## Security Note Before Publishing

- Do not commit real API keys or database credentials to GitHub.
- Rotate keys immediately if any credentials were previously exposed in local/example files.

