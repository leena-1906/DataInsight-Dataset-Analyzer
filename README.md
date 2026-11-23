# DataInsight – Dataset Analyzer

DataInsight is a responsive, modern full-stack web application designed for fast, intuitive analysis, exploration, and visualization of CSV datasets. It automatically detects data types, computes robust column-level statistics, generates interactive trend and category breakdown charts, and offers a searchable data explorer with clean CSV export capabilities.

The repository is organized into two completely decoupled and self-contained applications: **`frontend`** (React, TypeScript, Vite) and **`backend`** (Node.js, Express, SQLite).

---

## Features

- **Interactive CSV Upload**: Upload any CSV dataset up to 10 MB, 80 columns, and 20,000 rows with automatic header validation, UTF-8 BOM removal, and row normalization.
- **SQLite Database Persistence**: Uploaded datasets are persisted in a local SQLite database and preserved across server restarts.
- **Dataset Switching & Management**: Multiple datasets coexist seamlessly with one-click switching and isolated deletion.
- **Dataset Health & Overview**: Instant metrics for total records, column count, missing value count, and data completeness percentage.
- **Statistical Summaries**: Automatic calculation of mean, median, mode, minimum, maximum, and unique count for numeric and text fields.
- **Interactive Visualizations**:
  - **Data Distribution**: Dynamic line and bar chart toggle displaying trends across records with custom tooltips.
  - **Category Breakdown**: Intelligent donut chart identifying true categorical columns (excluding dates, IDs, and numeric fields) with record count aggregations and percentages.
- **Searchable Data Explorer**: Fast, client-side search across all columns with paginated rows (8 per page) and a filter reset.
- **Automated Insights**: Structural analysis observations, data quality ring score, and column highlights.
- **Clean CSV Export**: Download the active dataset anytime as a formatted CSV file.
- **Responsive Layout**: Tailored layouts for desktop, tablet, and mobile devices with an off-canvas drawer and backdrop dismissal.

---

## Technologies Used

### Frontend
- **Framework**: [React 18](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool & Dev Server**: [Vite 6](https://vitejs.dev/)
- **Charts & Visualization**: [Recharts 2](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Modern, responsive CSS handling with CSS Grid and Flexbox

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (v18+)
- **Framework**: [Express 4](https://expressjs.com/)
- **Database Engine**: [SQLite](https://sqlite.org/) via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)
- **CSV Parsing**: [PapaParse 5](https://www.papaparse.com/)
- **File Uploads**: [Multer 2](https://github.com/expressjs/multer)
- **CORS Handling**: [cors](https://www.npmjs.com/package/cors)

---

## Folder Structure

```text
DataInsight/
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main React dashboard & data visualization component
│   │   ├── main.tsx         # Application entry point
│   │   ├── styles.css       # Complete UI theme and responsive styles
│   │   └── vite-env.d.ts    # Vite environment type declarations
│   ├── public/              # Static public assets
│   ├── index.html           # HTML template
│   ├── package.json         # Frontend-only dependencies and scripts
│   ├── tsconfig.json        # TypeScript configuration
│   ├── vite.config.ts       # Vite configuration with API reverse proxy
│   └── .env.example         # Example environment variables for frontend
│
├── backend/
│   ├── src/
│   │   └── server.js        # Express API routes, SQLite schema, & PapaParse logic
│   ├── data/                # SQLite runtime database folder (gitignored)
│   ├── package.json         # Backend-only dependencies and scripts
│   └── .env.example         # Example environment variables for backend
│
├── .gitignore               # Comprehensive Git ignore rules
└── README.md                # Documentation
```

---

## Prerequisites

Before running the project locally, verify you have installed:

- **Node.js**: version `18.0.0` or newer (`node -v`)
- **npm**: version `9.0.0` or newer (`npm -v`)

---

## Backend Setup

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. *(Optional)* Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Windows PowerShell: `Copy-Item .env.example .env`)*

   By default, the backend runs on **port 4000**.

4. Start the backend server:
   - **Development mode (auto-reload on code change):**
     ```bash
     npm run dev
     ```
   - **Production mode:**
     ```bash
     npm start
     ```

The API will be available at: `http://localhost:4000`

---

## Frontend Setup

1. Open a second terminal window and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. *(Optional)* Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *(Windows PowerShell: `Copy-Item .env.example .env`)*

   Vite is configured to automatically proxy `/api` calls to `http://localhost:4000`.

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

The application will be live at: `http://localhost:5173`

---

## How to Run the Application Locally

1. **Start Backend**: In terminal 1, run `cd backend && npm run dev`.
2. **Start Frontend**: In terminal 2, run `cd frontend && npm run dev`.
3. Open your browser and go to: **`http://localhost:5173`**.
4. The dashboard will automatically connect to the backend and display your saved datasets.

---

## CSV Upload and Analysis Instructions

1. **Upload Dataset**:
   - Click the purple **"Upload dataset"** button in the top action bar (or the **"+"** button next to "YOUR DATASETS" in the sidebar).
   - Choose any standard `.csv` file (limits: 10 MB, 80 columns, 20,000 rows).
   - The server parses the file, calculates statistics, stores it in SQLite, and switches to it automatically.
2. **Explore the Workspace**:
   - **Overview Tab**: Examine total records, columns, data completeness percentage, numeric trends (line/bar), category breakdown donut chart, and column statistics (mean, median, mode, min, max, unique values).
   - **Data Explorer Tab**: Inspect individual rows, search in real-time across all columns, and paginate through records.
   - **Insights Tab**: Review automated structural observations, numeric highlights, and data quality scores.
3. **Export CSV**:
   - Click **"Export CSV"** in the top action bar to download the current dataset as a cleaned CSV.
4. **Delete Dataset**:
   - Click the trash icon next to the active dataset banner to remove it from the database.

---

## API Reference & Health Check

The Express backend provides clean REST endpoints:

- `GET /api/health` — Confirms backend server status and uptime
  ```json
  {
    "status": "ok",
    "message": "DataInsight API is running",
    "uptime": 12.34,
    "timestamp": "2026-11-23T11:20:00.000Z"
  }
  ```
- `GET /api/datasets` — Returns summary list of all stored datasets
- `GET /api/datasets/:id` — Returns dataset details and preview rows (up to 500)
- `POST /api/datasets` — Accepts multipart CSV upload (`file` field)
- `GET /api/datasets/:id/export` — Streams dataset as an attachment CSV file
- `DELETE /api/datasets/:id` — Deletes dataset by ID

---

## Database Storage & Persistence

Data is stored locally in SQLite using `better-sqlite3` at:
`backend/data/datainsight.db`

The database file and its WAL logs are automatically managed and excluded from Git commits via `.gitignore`.
