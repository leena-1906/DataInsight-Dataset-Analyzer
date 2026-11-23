# 📊 DataInsight — Dataset Analyzer

<p align="center">
  <strong>A powerful, interactive platform for exploring, analyzing, and visualizing CSV datasets.</strong>
</p>

DataInsight is a modern, full-stack web application that transforms raw CSV data into meaningful insights. Upload datasets, explore statistics, visualize trends, discover data quality issues, and interact with your data through an intuitive dashboard.

Built using React, TypeScript, Node.js, Express, and SQLite, DataInsight makes data exploration simple, fast, and accessible.

---

## 🌐 Live Demo

- - **Frontend:** [Open DataInsight](https://data-insight-dataset-analyzer.vercel.app/)
- **Backend API:** [Render API](https://datainsight-dataset-analyzer.onrender.com)
- **API Health:** [Check API Status](https://datainsight-dataset-analyzer.onrender.com/api/health)
- **GitHub Repository:** [DataInsight Dataset Analyzer](https://github.com/leena-1906/DataInsight-Dataset-Analyzer)

---## 📸 Application Preview

### Dashboard

![DataInsight Dashboard](screenshots/dashboard.png)

## ✨ Features

### 📁 Dataset Management
- Upload CSV files up to 10 MB.
- Load built-in sample datasets instantly.
- Manage multiple datasets in one workspace.
- Switch between datasets seamlessly.
- Delete datasets independently.

### 📊 Data Analysis
- Automatic data type detection.
- Mean, median, mode, minimum, maximum, and unique value calculations.
- Dataset completeness and missing value analysis.
- Automated data quality insights.

### 📈 Interactive Visualizations
- Dynamic line and bar charts.
- Category breakdown using donut charts.
- Interactive tooltips.
- Numeric trends and category comparisons.

### 🔎 Data Explorer
- Search across dataset columns.
- Paginated data table.
- Interactive data exploration.
- Easy dataset navigation.

### 📥 CSV Import & Export
- Upload and parse CSV files.
- Download built-in sample datasets.
- Export analyzed datasets as CSV.

### 📱 Responsive UI
- Modern dashboard interface.
- Responsive layouts for desktop, tablet, and mobile.
- Mobile-friendly navigation drawer.

---

## 🧪 Built-in Sample Datasets

Explore DataInsight without uploading your own files.

| Dataset | Description |
|---|---|
| Sales Performance | Explore sales, products, quantities, and regional performance. |
| Student Performance | Analyze marks, attendance, subjects, and grades. |
| Customer Orders | Explore customer purchases, order amounts, cities, and payment methods. |

---

## 🛠️ Tech Stack

### Frontend
- React 18
- TypeScript
- Vite 6
- Recharts
- Lucide React
- CSS Grid & Flexbox

### Backend
- Node.js
- Express 4
- SQLite
- better-sqlite3
- PapaParse
- Multer
- CORS

---

## 🏗️ Project Architecture

```text
DataInsight
│
├── frontend/          # React + TypeScript application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/           # Node.js + Express API
│   ├── src/
│   ├── data/
│   └── package.json
│
└── README.md
```

The frontend and backend are separate applications communicating through REST API endpoints.

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/) — v18 or newer
- npm — v9 or newer
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/leena-1906/DataInsight-Dataset-Analyzer.git

cd DataInsight-Dataset-Analyzer
```

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Start the backend server:

```bash
npm run dev
```

Backend runs at:

```text
http://localhost:4000
```

### 3. Set Up the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

Open the frontend URL in your browser to start exploring datasets.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check API status |
| GET | `/api/datasets` | List stored datasets |
| GET | `/api/datasets/:id` | Get dataset details |
| POST | `/api/datasets` | Upload a CSV dataset |
| GET | `/api/datasets/:id/export` | Export dataset as CSV |
| DELETE | `/api/datasets/:id` | Delete a dataset |
| GET | `/api/samples` | List available sample datasets |
| GET | `/api/samples/:id/download` | Download sample CSV |
| POST | `/api/samples/:id/load` | Load sample dataset |

---

## ☁️ Deployment

| Service | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | SQLite |

### Frontend Deployment
- Framework: Vite
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

### Backend Deployment
- Platform: Render
- Build Command: `npm install`
- Start Command: `npm start`

---

## 🎯 Project Goals

DataInsight was built to simplify dataset exploration by combining data processing, statistical analysis, visualization, and dataset management into one application.

The project demonstrates practical implementation of:

- Full-stack web development
- REST API integration
- Database management
- CSV file processing
- Data visualization
- Responsive UI development
- Cloud deployment

---

## 👩‍💻 Author

**Leena Harad**

GitHub: [@leena-1906](https://github.com/leena-1906)

---

⭐ If you find this project interesting, consider giving the repository a star!
