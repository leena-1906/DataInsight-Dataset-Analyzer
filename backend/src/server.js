const express = require("express");
const cors = require("cors");
const multer = require("multer");
const Database = require("better-sqlite3");
const Papa = require("papaparse");
const path = require("path");
const fs = require("fs");
const { sampleDatasets } = require("./sampleDatasets");

const app = express();
const PORT = process.env.PORT || 4000;
const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "datainsight.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    columns_json TEXT NOT NULL,
    rows_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(cors());
app.use(express.json({ limit: "15mb" }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function normalizeRows(rows) {
  return rows.filter(row => row && Object.values(row).some(v => String(v ?? "").trim() !== ""));
}

function numericValues(values) {
  return values.map(v => (v === null || v === undefined || String(v).trim() === "" ? NaN : Number(String(v).replace(/,/g, ""))))
    .filter(Number.isFinite);
}

function summarize(columns, rows) {
  const stats = columns.map(column => {
    const vals = rows.map(r => r[column]);
    const nums = numericValues(vals);
    const missing = vals.filter(v => v === null || v === undefined || String(v).trim() === "").length;
    const counts = new Map();
    vals.filter(v => v !== null && v !== undefined && String(v).trim() !== "").forEach(v => counts.set(String(v), (counts.get(String(v)) || 0) + 1));
    const mode = [...counts.entries()].sort((a,b) => b[1]-a[1])[0]?.[0] ?? "—";
    const sorted = [...nums].sort((a,b)=>a-b);
    const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2) : null;
    const mean = nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : null;
    return { name: column, type: nums.length && nums.length >= vals.filter(v=>v!=="" && v!==null && v!==undefined).length * .7 ? "Numeric" : "Text", missing, unique: counts.size, mean, median, mode, min: sorted[0] ?? null, max: sorted.at(-1) ?? null };
  });
  const missing = stats.reduce((s,x)=>s+x.missing,0);
  return { stats, missing, duplicates: rows.length - new Set(rows.map(r=>JSON.stringify(r))).size };
}

function getDataset(id) {
  const item = db.prepare("SELECT * FROM datasets WHERE id = ?").get(id);
  if (!item) return null;
  return { ...item, columns: JSON.parse(item.columns_json), rows: JSON.parse(item.rows_json) };
}

function publicDataset(item) {
  const { columns, rows } = item;
  const summary = summarize(columns, rows);
  return { id: item.id, name: item.name, createdAt: item.created_at, rowCount: rows.length, columnCount: columns.length, columns, summary };
}

function insertDataset(name, columns, rows) {
  const result = db.prepare("INSERT INTO datasets (name, columns_json, rows_json) VALUES (?, ?, ?)")
    .run(name, JSON.stringify(columns), JSON.stringify(rows));
  return getDataset(result.lastInsertRowid);
}

// Seed a useful sample dataset on first launch.
if (db.prepare("SELECT COUNT(*) AS count FROM datasets").get().count === 0) {
  const sample = [
    { month:"Jan", revenue:18200, orders:142, customers:98, category:"Electronics" },
    { month:"Feb", revenue:21500, orders:168, customers:112, category:"Fashion" },
    { month:"Mar", revenue:19800, orders:154, customers:105, category:"Home" },
    { month:"Apr", revenue:26400, orders:203, customers:137, category:"Electronics" },
    { month:"May", revenue:29100, orders:224, customers:151, category:"Fashion" },
    { month:"Jun", revenue:27800, orders:216, customers:146, category:"Home" },
    { month:"Jul", revenue:32500, orders:249, customers:172, category:"Electronics" },
    { month:"Aug", revenue:34800, orders:267, customers:184, category:"Fashion" },
    { month:"Sep", revenue:31900, orders:243, customers:169, category:"Home" },
    { month:"Oct", revenue:38600, orders:294, customers:201, category:"Electronics" },
    { month:"Nov", revenue:42100, orders:321, customers:218, category:"Fashion" },
    { month:"Dec", revenue:46800, orders:356, customers:239, category:"Home" }
  ];
  insertDataset("Retail performance 2025", Object.keys(sample[0]), sample);
}

// Health check endpoint
app.get("/api/health", (_, res) => {
  res.json({
    status: "ok",
    message: "DataInsight API is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get("/api/datasets", (_, res) => {
  const items = db.prepare("SELECT * FROM datasets ORDER BY id DESC").all().map(x => publicDataset(getDataset(x.id)));
  res.json(items);
});

app.get("/api/datasets/:id", (req, res) => {
  const item = getDataset(Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Dataset not found" });
  res.json({ ...publicDataset(item), rows: item.rows.slice(0, 500), totalRows: item.rows.length });
});

app.post("/api/datasets", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please choose a CSV file." });
    const text = req.file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: "greedy", dynamicTyping: false });
    if (parsed.errors.length) return res.status(400).json({ error: parsed.errors[0].message });
    const rows = normalizeRows(parsed.data);
    const columns = parsed.meta.fields || [];
    if (!columns.length || !rows.length) return res.status(400).json({ error: "The CSV needs a header row and at least one data row." });
    if (columns.length > 80 || rows.length > 20000) return res.status(400).json({ error: "Limit: 80 columns and 20,000 rows per dataset." });
    const item = insertDataset(path.parse(req.file.originalname).name, columns, rows);
    res.status(201).json({ ...publicDataset(item), rows: item.rows.slice(0,500), totalRows: item.rows.length });
  } catch (e) { res.status(500).json({ error: "Could not process this CSV file." }); }
});

app.delete("/api/datasets/:id", (req, res) => {
  const result = db.prepare("DELETE FROM datasets WHERE id = ?").run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "Dataset not found" });
  res.json({ ok: true });
});

app.get("/api/datasets/:id/export", (req, res) => {
  const item = getDataset(Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Dataset not found" });
  const csv = Papa.unparse(item.rows, { columns: item.columns });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${item.name.replace(/[^a-z0-9-_]/gi,"_")}-clean.csv"`);
  res.send(csv);
});

// Sample demo datasets endpoints
app.get("/api/samples", (_, res) => {
  res.json(sampleDatasets.map(s => ({
    id: s.id,
    name: s.name,
    filename: s.filename,
    category: s.category,
    description: s.description,
    columns: s.columns,
    rowCount: s.rowCount
  })));
});

app.get("/api/samples/:id/download", (req, res) => {
  const sample = sampleDatasets.find(s => s.id === req.params.id);
  if (!sample) return res.status(404).json({ error: "Sample dataset not found" });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${sample.filename}"`);
  res.send(sample.csvContent.trim());
});

app.post("/api/samples/:id/load", (req, res) => {
  const sample = sampleDatasets.find(s => s.id === req.params.id);
  if (!sample) return res.status(404).json({ error: "Sample dataset not found" });
  const parsed = Papa.parse(sample.csvContent.trim(), { header: true, skipEmptyLines: "greedy" });
  const rows = normalizeRows(parsed.data);
  const columns = parsed.meta.fields || [];
  const item = insertDataset(sample.name, columns, rows);
  res.status(201).json({ ...publicDataset(item), rows: item.rows.slice(0, 500), totalRows: item.rows.length });
});

// Centralized error handling middleware for Multer and server errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 10 MB." });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(500).json({ error: err.message || "An unexpected server error occurred." });
  }
  next();
});

app.listen(PORT, () => console.log(`DataInsight API running at http://localhost:${PORT}`));
