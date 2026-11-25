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

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function parseNumericValue(value) {
  if (value === null || value === undefined) return NaN;
  const trimmed = String(value).trim();
  if (trimmed === "") return NaN;
  const num = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(num) ? num : NaN;
}

function normalizeRows(rows) {
  return rows.filter(row => row && Object.values(row).some(v => String(v ?? "").trim() !== ""));
}

function numericValues(values) {
  return values.map(parseNumericValue).filter(Number.isFinite);
}

function summarize(columns, rows) {
  const stats = columns.map(column => {
    const vals = rows.map(r => r[column]);
    const nums = numericValues(vals);
    const nonEmptyCount = vals.filter(v => v !== "" && v !== null && v !== undefined && String(v).trim() !== "").length;
    const missing = vals.length - nonEmptyCount;
    const counts = new Map();
    vals.forEach(v => {
      const str = v === null || v === undefined ? "" : String(v).trim();
      if (str !== "") counts.set(str, (counts.get(str) || 0) + 1);
    });
    const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const sorted = [...nums].sort((a, b) => a - b);
    const median = sorted.length
      ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : null;
    const mean = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    return {
      name: column,
      type: nums.length > 0 && nonEmptyCount > 0 && nums.length >= nonEmptyCount * 0.7 ? "Numeric" : "Text",
      missing,
      unique: counts.size,
      mean,
      median,
      mode,
      min: sorted[0] ?? null,
      max: sorted.at(-1) ?? null
    };
  });
  const missing = stats.reduce((s, x) => s + x.missing, 0);
  return { stats, missing, duplicates: rows.length - new Set(rows.map(r => JSON.stringify(r))).size };
}

function hydrateDatasetRow(item) {
  if (!item) return null;
  const columns = safeJsonParse(item.columns_json, []);
  const rows = safeJsonParse(item.rows_json, []);
  return {
    ...item,
    columns: Array.isArray(columns) ? columns : [],
    rows: Array.isArray(rows) ? rows : []
  };
}

function getDataset(id) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) return null;
  const item = db.prepare("SELECT * FROM datasets WHERE id = ?").get(numId);
  return hydrateDatasetRow(item);
}

function publicDataset(item) {
  const { columns, rows } = item;
  const summary = summarize(columns, rows);
  return {
    id: item.id,
    name: item.name,
    createdAt: item.created_at,
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    summary
  };
}

function insertDataset(name, columns, rows) {
  const result = db.prepare("INSERT INTO datasets (name, columns_json, rows_json) VALUES (?, ?, ?)")
    .run(name, JSON.stringify(columns), JSON.stringify(rows));
  return getDataset(result.lastInsertRowid);
}

function filterRowsBySearch(rows, columns, search) {
  const q = String(search || "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(row => columns.some(col => String(row[col] ?? "").toLowerCase().includes(q)));
}

function buildChartSeries(item, { xAxis, yAxis, aggregation, limit }) {
  const { columns, rows } = item;
  if (!columns.length || !rows.length) {
    return {
      datasetId: item.id,
      xAxis: xAxis || "",
      yAxis: yAxis || "__count__",
      aggregation: aggregation || "count",
      totalPoints: 0,
      skippedInvalidCount: 0,
      isNumericY: false,
      data: []
    };
  }

  const summary = summarize(columns, rows);
  const numericCols = summary.stats.filter(s => s.type === "Numeric").map(s => s.name);
  const resolvedX = columns.includes(xAxis) ? xAxis : (columns.find(c => !numericCols.includes(c)) || columns[0]);
  const resolvedY = yAxis === "__count__" || columns.includes(yAxis)
    ? yAxis
    : (numericCols[0] || "__count__");

  const isCountMetric = resolvedY === "__count__";
  const isNumericY = !isCountMetric && numericCols.includes(resolvedY);
  const allowedAggs = ["none", "sum", "avg", "count"];
  let resolvedAgg = allowedAggs.includes(aggregation) ? aggregation : "";

  if (!resolvedAgg) {
    if (isCountMetric) {
      resolvedAgg = "count";
    } else {
      const uniqueXCount = new Set(rows.map(r => String(r[resolvedX] ?? "").trim() || "(Missing)")).size;
      resolvedAgg = uniqueXCount < rows.length ? "sum" : "none";
    }
  }
  if (isCountMetric && resolvedAgg === "none") resolvedAgg = "count";
  if (!isCountMetric && !isNumericY && (resolvedAgg === "sum" || resolvedAgg === "avg")) {
    resolvedAgg = "count";
  }

  const maxPoints = Math.min(200, Math.max(1, Number(limit) || 30));
  let skippedInvalidCount = 0;
  let data = [];

  if (resolvedAgg === "none") {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const label = String(row[resolvedX] ?? "").trim() || `Row ${i + 1}`;
      const num = parseNumericValue(row[resolvedY]);
      if (!Number.isFinite(num)) {
        skippedInvalidCount += 1;
        continue;
      }
      data.push({ label, value: Number(num.toFixed(4)), count: 1 });
    }
    return {
      datasetId: item.id,
      xAxis: resolvedX,
      yAxis: resolvedY,
      aggregation: resolvedAgg,
      totalPoints: data.length,
      skippedInvalidCount,
      isNumericY,
      data: data.slice(0, maxPoints)
    };
  }

  const groups = new Map();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const key = String(row[resolvedX] ?? "").trim() || "(Missing)";
    if (!groups.has(key)) {
      groups.set(key, { sum: 0, validCount: 0, totalCount: 0 });
    }
    const bucket = groups.get(key);
    bucket.totalCount += 1;

    if (resolvedAgg === "count" || isCountMetric) {
      if (isCountMetric || String(row[resolvedY] ?? "").trim() !== "") {
        bucket.validCount += 1;
      }
    } else {
      const num = parseNumericValue(row[resolvedY]);
      if (Number.isFinite(num)) {
        bucket.sum += num;
        bucket.validCount += 1;
      } else {
        skippedInvalidCount += 1;
      }
    }
  }

  data = [...groups.entries()]
    .filter(([, bucket]) => resolvedAgg === "count" || bucket.validCount > 0)
    .map(([label, bucket]) => {
      let value = bucket.totalCount;
      if (resolvedAgg === "count") {
        value = isCountMetric ? bucket.totalCount : bucket.validCount;
      } else if (resolvedAgg === "sum") {
        value = Number(bucket.sum.toFixed(4));
      } else if (resolvedAgg === "avg") {
        value = Number((bucket.sum / bucket.validCount).toFixed(4));
      }
      return { label, value, count: bucket.totalCount };
    });

  return {
    datasetId: item.id,
    xAxis: resolvedX,
    yAxis: resolvedY,
    aggregation: resolvedAgg,
    totalPoints: data.length,
    skippedInvalidCount,
    isNumericY,
    data: data.slice(0, maxPoints)
  };
}

// Seed a useful sample dataset on first launch.
if (db.prepare("SELECT COUNT(*) AS count FROM datasets").get().count === 0) {
  const sample = [
    { month: "Jan", revenue: 18200, orders: 142, customers: 98, category: "Electronics" },
    { month: "Feb", revenue: 21500, orders: 168, customers: 112, category: "Fashion" },
    { month: "Mar", revenue: 19800, orders: 154, customers: 105, category: "Home" },
    { month: "Apr", revenue: 26400, orders: 203, customers: 137, category: "Electronics" },
    { month: "May", revenue: 29100, orders: 224, customers: 151, category: "Fashion" },
    { month: "Jun", revenue: 27800, orders: 216, customers: 146, category: "Home" },
    { month: "Jul", revenue: 32500, orders: 249, customers: 172, category: "Electronics" },
    { month: "Aug", revenue: 34800, orders: 267, customers: 184, category: "Fashion" },
    { month: "Sep", revenue: 31900, orders: 243, customers: 169, category: "Home" },
    { month: "Oct", revenue: 38600, orders: 294, customers: 201, category: "Electronics" },
    { month: "Nov", revenue: 42100, orders: 321, customers: 218, category: "Fashion" },
    { month: "Dec", revenue: 46800, orders: 356, customers: 239, category: "Home" }
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
  const items = db
    .prepare("SELECT * FROM datasets ORDER BY id DESC")
    .all()
    .map(hydrateDatasetRow)
    .filter(Boolean)
    .map(publicDataset);
  res.json(items);
});

app.get("/api/datasets/:id", (req, res) => {
  const item = getDataset(req.params.id);
  if (!item) return res.status(404).json({ error: "Dataset not found" });
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(20000, requestedLimit) : 500;
  res.json({ ...publicDataset(item), rows: item.rows.slice(0, limit), totalRows: item.rows.length });
});

app.get("/api/datasets/:id/records", (req, res) => {
  const item = getDataset(req.params.id);
  if (!item) return res.status(404).json({ error: "Dataset not found" });

  const search = typeof req.query.search === "string" ? req.query.search : "";
  const sortBy = typeof req.query.sortBy === "string" && item.columns.includes(req.query.sortBy) ? req.query.sortBy : "";
  const sortDir = req.query.sortDir === "desc" ? "desc" : "asc";
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 10));

  let rows = filterRowsBySearch(item.rows, item.columns, search);

  if (sortBy) {
    const dir = sortDir === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const rawA = String(a[sortBy] ?? "").trim();
      const rawB = String(b[sortBy] ?? "").trim();
      if (!rawA && !rawB) return 0;
      if (!rawA) return 1;
      if (!rawB) return -1;
      const numA = parseNumericValue(rawA);
      const numB = parseNumericValue(rawB);
      if (Number.isFinite(numA) && Number.isFinite(numB)) {
        return (numA - numB) * dir;
      }
      return rawA.localeCompare(rawB, undefined, { numeric: true, sensitivity: "base" }) * dir;
    });
  }

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(req.query.page) || 1));
  const start = (page - 1) * pageSize;

  res.json({
    datasetId: item.id,
    total,
    totalRows: item.rows.length,
    page,
    pageSize,
    totalPages,
    rows: rows.slice(start, start + pageSize)
  });
});

app.get("/api/datasets/:id/chart", (req, res) => {
  const item = getDataset(req.params.id);
  if (!item) return res.status(404).json({ error: "Dataset not found" });

  const xAxis = typeof req.query.xAxis === "string" ? req.query.xAxis : "";
  const yAxis = typeof req.query.yAxis === "string" ? req.query.yAxis : "";
  const aggregation = typeof req.query.aggregation === "string" ? req.query.aggregation : "";
  const limit = Number(req.query.limit) || 30;

  res.json(buildChartSeries(item, { xAxis, yAxis, aggregation, limit }));
});

app.post("/api/datasets", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Please choose a CSV file." });
    const text = req.file.buffer.toString("utf8").replace(/^\uFEFF/, "");
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: "greedy", dynamicTyping: false });
    const fatalErrors = (parsed.errors || []).filter(err => err.code !== "UndetectableDelimiter");
    if (fatalErrors.length) return res.status(400).json({ error: fatalErrors[0].message });
    const rows = normalizeRows(parsed.data);
    const columns = (parsed.meta.fields || []).filter(c => String(c).trim() !== "");
    if (!columns.length || !rows.length) {
      return res.status(400).json({ error: "The CSV needs a header row and at least one data row." });
    }
    if (columns.length > 80 || rows.length > 20000) {
      return res.status(400).json({ error: "Limit: 80 columns and 20,000 rows per dataset." });
    }
    const datasetName = path.parse(req.file.originalname).name || "Uploaded Dataset";
    const item = insertDataset(datasetName, columns, rows);
    res.status(201).json({ ...publicDataset(item), rows: item.rows.slice(0, 500), totalRows: item.rows.length });
  } catch (e) {
    res.status(500).json({ error: "Could not process this CSV file." });
  }
});

app.delete("/api/datasets/:id", (req, res) => {
  const numId = Number(req.params.id);
  if (!Number.isInteger(numId) || numId <= 0) return res.status(404).json({ error: "Dataset not found" });
  const result = db.prepare("DELETE FROM datasets WHERE id = ?").run(numId);
  if (!result.changes) return res.status(404).json({ error: "Dataset not found" });
  res.json({ ok: true });
});

app.get("/api/datasets/:id/export", (req, res) => {
  const item = getDataset(req.params.id);
  if (!item) return res.status(404).json({ error: "Dataset not found" });
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const exportRows = search ? filterRowsBySearch(item.rows, item.columns, search) : item.rows;
  const csv = Papa.unparse(exportRows, { columns: item.columns });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  const suffix = search ? "-filtered" : "-clean";
  res.setHeader("Content-Disposition", `attachment; filename="${item.name.replace(/[^a-z0-9-_]/gi, "_")}${suffix}.csv"`);
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
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
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
