function parseNumericValue(value) {
  if (value === null || value === undefined) return NaN;
  const trimmed = String(value).trim();
  if (trimmed === "") return NaN;
  const num = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(num) ? num : NaN;
}

function roundNumber(value, decimals = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Number(value.toFixed(decimals));
}

function formatCompactRangeEdge(n) {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function summarize(columns, rows) {
  const stats = columns.map(column => {
    const vals = rows.map(r => r[column]);
    const nums = [];
    const nonNumericVals = [];
    const counts = new Map();
    let nonEmptyCount = 0;

    for (let i = 0; i < vals.length; i += 1) {
      const raw = vals[i];
      const str = raw === null || raw === undefined ? "" : String(raw).trim();
      if (str === "") continue;

      nonEmptyCount += 1;
      counts.set(str, (counts.get(str) || 0) + 1);

      const parsed = parseNumericValue(str);
      if (Number.isFinite(parsed)) {
        nums.push(parsed);
      } else {
        nonNumericVals.push(str);
      }
    }

    const missing = vals.length - nonEmptyCount;
    const missingPct = vals.length ? roundNumber((missing / vals.length) * 100, 2) : 0;
    const isEmptyColumn = nonEmptyCount === 0;
    const isNumeric = nums.length > 0 && nonEmptyCount > 0 && nums.length >= nonEmptyCount * 0.7;

    const sortedEntries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const mode = sortedEntries[0]?.[0] ?? "—";
    const modeCount = sortedEntries[0]?.[1] ?? 0;

    const sorted = [...nums].sort((a, b) => a - b);
    const count = nums.length;
    const min = count ? sorted[0] : null;
    const max = count ? sorted[count - 1] : null;
    const sum = count ? nums.reduce((a, b) => a + b, 0) : null;
    const mean = count ? sum / count : null;
    const median = count
      ? (count % 2 ? sorted[(count - 1) / 2] : (sorted[count / 2 - 1] + sorted[count / 2]) / 2)
      : null;
    const range = min !== null && max !== null ? max - min : null;

    let variance = null;
    let stdDev = null;
    if (count > 0 && mean !== null) {
      const sqDiff = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0);
      variance = count > 1 ? sqDiff / (count - 1) : 0;
      stdDev = Math.sqrt(variance);
    }

    const inconsistentCount = isNumeric
      ? nonNumericVals.length
      : (nums.length > 0 && nums.length < nonEmptyCount
          ? Math.min(nums.length, nonEmptyCount - nums.length)
          : 0);

    const inconsistentSamples = isNumeric
      ? nonNumericVals.slice(0, 3)
      : (inconsistentCount > 0 ? nums.slice(0, 3).map(String) : []);

    return {
      name: column,
      type: isNumeric ? "Numeric" : "Text",
      count,
      nonEmptyCount,
      missing,
      missingPct,
      unique: counts.size,
      isEmptyColumn,
      inconsistentCount,
      inconsistentSamples,
      mean: roundNumber(mean),
      median: roundNumber(median),
      mode,
      modeCount,
      min: roundNumber(min),
      max: roundNumber(max),
      sum: roundNumber(sum),
      range: roundNumber(range),
      stdDev: roundNumber(stdDev),
      variance: roundNumber(variance)
    };
  });

  const missing = stats.reduce((s, x) => s + x.missing, 0);
  const duplicates = rows.length - new Set(rows.map(r => JSON.stringify(r))).size;
  return { stats, missing, duplicates };
}

function findPrimaryCategoricalColumn(columns, stats, rows) {
  if (!columns.length) return null;

  const exactCategory = columns.find(c => c.trim().toLowerCase() === "category");
  if (exactCategory) return exactCategory;

  const containsCategory = columns.find(c => /category|categories/i.test(c.trim()));
  if (containsCategory) return containsCategory;

  const DATE_NAME_REGEX = /(^|_|\b)(date|time|timestamp|datetime|day|month|year|created_?at|updated_?at)($|_|\b)/i;
  const ID_NAME_REGEX = /(^|_|\b)(id|uuid|guid|code|pk|fk|index|key|hash|token)($|_|\b)/i;
  const DATE_VAL_REGEX = /^\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})(\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?)?\s*$/i;

  const candidates = columns.filter(col => {
    const stat = stats.find(s => s.name === col);
    if (!stat || stat.type === "Numeric" || stat.isEmptyColumn) return false;
    if (DATE_NAME_REGEX.test(col.trim())) return false;
    if (ID_NAME_REGEX.test(col.trim())) return false;

    const sampleVals = rows
      .map(r => String(r[col] ?? "").trim())
      .filter(Boolean)
      .slice(0, 30);
    if (sampleVals.length > 0) {
      const dateMatches = sampleVals.filter(v => DATE_VAL_REGEX.test(v)).length;
      if (dateMatches / sampleVals.length >= 0.5) return false;
    }

    if (stat.unique <= 1) return false;
    if (rows.length > 3 && stat.unique === rows.length) return false;
    return true;
  });

  if (!candidates.length) {
    const fallbackText = stats.find(s => s.type === "Text" && !s.isEmptyColumn);
    return fallbackText ? fallbackText.name : null;
  }

  const CAT_KEYWORDS = /(^|_|\b)(type|segment|group|genre|status|department|class|tier|region|country|city|state|gender|brand|vendor|industry|priority|channel|role|grade|subject)($|_|\b)/i;
  const keywordMatch = candidates.find(c => CAT_KEYWORDS.test(c.trim()));
  if (keywordMatch) return keywordMatch;

  candidates.sort((a, b) => {
    const sA = stats.find(s => s.name === a)?.unique ?? 999;
    const sB = stats.find(s => s.name === b)?.unique ?? 999;
    return sA - sB;
  });

  return candidates[0] ?? null;
}

function buildNumericHistogram(rows, columnName, maxBins = 8) {
  if (!columnName || !rows.length) return [];
  const nums = rows.map(r => parseNumericValue(r[columnName])).filter(Number.isFinite);
  if (!nums.length) return [];

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) {
    return [{
      range: formatCompactRangeEdge(min),
      min: roundNumber(min),
      max: roundNumber(max),
      count: nums.length
    }];
  }

  const binCount = Math.min(maxBins, Math.max(4, Math.ceil(Math.sqrt(nums.length))));
  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, idx) => {
    const start = min + idx * width;
    const end = idx === binCount - 1 ? max : min + (idx + 1) * width;
    return {
      range: `${formatCompactRangeEdge(start)}–${formatCompactRangeEdge(end)}`,
      min: roundNumber(start, 2),
      max: roundNumber(end, 2),
      count: 0
    };
  });

  for (let i = 0; i < nums.length; i += 1) {
    const val = nums[i];
    const rawIdx = Math.floor((val - min) / width);
    const idx = Math.min(binCount - 1, Math.max(0, rawIdx));
    bins[idx].count += 1;
  }

  return bins;
}

function buildCategoryFrequency(rows, columnName) {
  if (!columnName || !rows.length) {
    return { column: columnName || "", totalValid: 0, uniqueCount: 0, top5: [], distribution: [] };
  }

  const counts = new Map();
  let totalValid = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const val = String(rows[i][columnName] ?? "").trim();
    if (!val) continue;
    totalValid += 1;
    counts.set(val, (counts.get(val) || 0) + 1);
  }

  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label,
      count,
      percentage: totalValid ? roundNumber((count / totalValid) * 100, 1) : 0
    }));

  const top5 = sorted.slice(0, 5);
  let distribution = sorted.slice(0, 10);
  if (sorted.length > 10) {
    const otherCount = sorted.slice(10).reduce((acc, item) => acc + item.count, 0);
    distribution = [
      ...distribution,
      {
        label: "Other",
        count: otherCount,
        percentage: totalValid ? roundNumber((otherCount / totalValid) * 100, 1) : 0
      }
    ];
  }

  return {
    column: columnName,
    totalValid,
    uniqueCount: sorted.length,
    top5,
    distribution
  };
}

function buildQualityReport(columns, rows, stats, missing, duplicates) {
  const rowCount = rows.length;
  const colCount = columns.length;
  const totalCells = rowCount * colCount;
  const completeness = totalCells ? roundNumber(((totalCells - missing) / totalCells) * 100, 1) : 0;
  const missingPct = totalCells ? roundNumber((missing / totalCells) * 100, 2) : 0;
  const duplicatePct = rowCount ? roundNumber((duplicates / rowCount) * 100, 2) : 0;

  const emptyColumns = stats.filter(s => s.isEmptyColumn).map(s => s.name);
  const numericMismatchCols = stats.filter(s => s.type === "Numeric" && s.inconsistentCount > 0);
  const mixedTextCols = stats.filter(s => s.type === "Text" && s.inconsistentCount > 0);
  const inconsistentCols = stats.filter(s => s.inconsistentCount > 0);
  const totalInconsistentCells = inconsistentCols.reduce((sum, c) => sum + c.inconsistentCount, 0);

  // Quality score out of 100 based on completeness, duplicates, empty columns, and type consistency
  let qualityScore = 0;
  if (totalCells > 0) {
    const dupPenalty = Math.min(20, duplicatePct * 0.5);
    const emptyColPenalty = colCount ? Math.min(20, (emptyColumns.length / colCount) * 25) : 0;
    const typePenalty = Math.min(20, (totalInconsistentCells / totalCells) * 100);
    qualityScore = Math.max(0, Math.min(100, Math.round(completeness - dupPenalty - emptyColPenalty - typePenalty)));
  }

  const overallStatus = qualityScore >= 85
    ? "Good"
    : qualityScore >= 65
      ? "Warning"
      : "Needs Attention";

  const columnChecks = stats.map(s => {
    const issues = [];
    if (s.isEmptyColumn) issues.push("Empty column (100% missing)");
    else if (s.missing > 0) issues.push(`${s.missing} missing (${s.missingPct}%)`);

    if (s.type === "Numeric" && s.inconsistentCount > 0) {
      issues.push(`${s.inconsistentCount} non-numeric value${s.inconsistentCount > 1 ? "s" : ""}`);
    } else if (s.type === "Text" && s.inconsistentCount > 0) {
      issues.push(`Mixed numeric & text values (${s.inconsistentCount})`);
    }

    let status = "Good";
    if (s.isEmptyColumn || s.missingPct > 15 || (s.type === "Numeric" && s.inconsistentCount > 0)) {
      status = "Needs Attention";
    } else if (s.missing > 0 || s.inconsistentCount > 0) {
      status = "Warning";
    }

    return {
      column: s.name,
      type: s.type,
      nonEmptyCount: s.nonEmptyCount,
      missing: s.missing,
      missingPct: s.missingPct,
      unique: s.unique,
      isEmptyColumn: s.isEmptyColumn,
      inconsistentCount: s.inconsistentCount,
      inconsistentSamples: s.inconsistentSamples,
      status,
      note: issues.length ? issues.join(" · ") : "Clean"
    };
  });

  const checks = [
    {
      id: "missing-values",
      label: "Missing & Null Values",
      status: missing === 0 ? "Good" : missingPct <= 10 ? "Warning" : "Needs Attention",
      value: `${missing} cells (${missingPct}%)`,
      detail: missing === 0
        ? "All cells contain valid non-empty values."
        : `${missing} missing or empty cells detected across ${stats.filter(s => s.missing > 0).length} column(s).`
    },
    {
      id: "duplicate-records",
      label: "Duplicate Records",
      status: duplicates === 0 ? "Good" : duplicatePct <= 10 ? "Warning" : "Needs Attention",
      value: `${duplicates} row${duplicates === 1 ? "" : "s"} (${duplicatePct}%)`,
      detail: duplicates === 0
        ? "Every record in this dataset is unique."
        : `${duplicates} exact duplicate record(s) found.`
    },
    {
      id: "empty-columns",
      label: "Empty Columns",
      status: emptyColumns.length === 0 ? "Good" : "Needs Attention",
      value: `${emptyColumns.length} column${emptyColumns.length === 1 ? "" : "s"}`,
      detail: emptyColumns.length === 0
        ? "Every column contains populated data."
        : `Completely empty column(s): ${emptyColumns.join(", ")}.`
    },
    {
      id: "type-consistency",
      label: "Data Type Consistency",
      status: numericMismatchCols.length > 0
        ? "Needs Attention"
        : mixedTextCols.length > 0
          ? "Warning"
          : "Good",
      value: inconsistentCols.length === 0
        ? "Consistent"
        : `${inconsistentCols.length} column${inconsistentCols.length === 1 ? "" : "s"}`,
      detail: numericMismatchCols.length > 0
        ? `Non-numeric entries found in numeric column(s): ${numericMismatchCols.map(c => c.name).join(", ")}.`
        : mixedTextCols.length > 0
          ? `Mixed numeric and text entries in: ${mixedTextCols.map(c => c.name).join(", ")}.`
          : "All columns have consistent value types."
    }
  ];

  return {
    completeness,
    missingPct,
    duplicatePct,
    emptyColumns,
    inconsistentColumnCount: inconsistentCols.length,
    qualityScore,
    overallStatus,
    checks,
    columnChecks
  };
}

function generateAutoInsights({ rowCount, colCount, stats, quality, categoryFreq }) {
  if (!rowCount || !colCount) {
    return [
      {
        id: "empty-dataset",
        title: "Empty dataset",
        tone: "warning",
        metric: "0 records",
        description: "This dataset does not contain any records to analyze yet."
      }
    ];
  }

  const insights = [];
  const numericCols = stats.filter(s => s.type === "Numeric" && s.mean !== null);

  insights.push({
    id: "completeness",
    title: "Dataset completeness & quality",
    tone: quality.overallStatus === "Good" ? "positive" : quality.overallStatus === "Warning" ? "warning" : "alert",
    metric: `${quality.qualityScore}/100 · ${quality.completeness}% complete`,
    description: `Analyzed ${rowCount.toLocaleString("en-US")} records across ${colCount} columns (${numericCols.length} numeric, ${colCount - numericCols.length} text). Overall data quality is ${quality.overallStatus}.`
  });

  if (numericCols.length > 0) {
    const highestMeanCol = [...numericCols].sort((a, b) => (b.mean ?? -Infinity) - (a.mean ?? -Infinity))[0];
    insights.push({
      id: "highest-average",
      title: "Highest average numeric column",
      tone: "info",
      metric: `${highestMeanCol.name} (${highestMeanCol.mean})`,
      description: `"${highestMeanCol.name}" has the highest average value at ${highestMeanCol.mean} (median ${highestMeanCol.median}, sum ${highestMeanCol.sum}).`
    });

    const highestMaxCol = [...numericCols].sort((a, b) => (b.max ?? -Infinity) - (a.max ?? -Infinity))[0];
    const lowestMinCol = [...numericCols].sort((a, b) => (a.min ?? Infinity) - (b.min ?? Infinity))[0];
    insights.push({
      id: "numeric-extremes",
      title: "Numeric extremes observed",
      tone: "info",
      metric: `${lowestMinCol.min} to ${highestMaxCol.max}`,
      description: `The highest recorded value is ${highestMaxCol.max} in "${highestMaxCol.name}", while the lowest recorded value is ${lowestMinCol.min} in "${lowestMinCol.name}".`
    });

    const highestStdCol = [...numericCols].sort((a, b) => (b.stdDev ?? -1) - (a.stdDev ?? -1))[0];
    if (highestStdCol && highestStdCol.stdDev !== null) {
      insights.push({
        id: "variability",
        title: "Highest value spread",
        tone: "info",
        metric: `${highestStdCol.name} (SD ${highestStdCol.stdDev})`,
        description: `"${highestStdCol.name}" shows the widest dispersion with a standard deviation of ${highestStdCol.stdDev} across a range of ${highestStdCol.range}.`
      });
    }
  }

  const mostMissingCol = [...stats].sort((a, b) => b.missing - a.missing)[0];
  if (mostMissingCol && mostMissingCol.missing > 0) {
    insights.push({
      id: "missing-hotspot",
      title: "Highest missing values column",
      tone: mostMissingCol.missingPct > 15 ? "alert" : "warning",
      metric: `${mostMissingCol.name} (${mostMissingCol.missing} · ${mostMissingCol.missingPct}%)`,
      description: `"${mostMissingCol.name}" has the most missing data with ${mostMissingCol.missing} empty cell(s) (${mostMissingCol.missingPct}% of records).`
    });
  } else {
    insights.push({
      id: "no-missing",
      title: "Zero missing values",
      tone: "positive",
      metric: "0 missing cells",
      description: "Every column across all records is 100% populated with no null or blank values."
    });
  }

  if (categoryFreq.top5.length > 0) {
    const top = categoryFreq.top5[0];
    insights.push({
      id: "top-category",
      title: "Most frequent category",
      tone: "info",
      metric: `${top.label} (${top.percentage}%)`,
      description: `In "${categoryFreq.column}", "${top.label}" appears most frequently (${top.count} of ${categoryFreq.totalValid} valid records, ${top.percentage}%).`
    });
  }

  const totalDuplicates = rowCount - new Set().size; // unused placeholder avoided below
  void totalDuplicates;

  if (quality.inconsistentColumnCount > 0 || quality.emptyColumns.length > 0) {
    const parts = [];
    if (quality.emptyColumns.length > 0) {
      parts.push(`${quality.emptyColumns.length} empty column(s)`);
    }
    if (quality.inconsistentColumnCount > 0) {
      parts.push(`${quality.inconsistentColumnCount} column(s) with mixed or invalid types`);
    }
    insights.push({
      id: "integrity-warning",
      title: "Data integrity pattern detected",
      tone: "warning",
      metric: `${quality.inconsistentColumnCount + quality.emptyColumns.length} issue(s)`,
      description: `Detected ${parts.join(" and ")}. Review the Data Quality Report below for column-level details.`
    });
  }

  return insights;
}

function analyzeDataset(item, options = {}) {
  const { columns, rows } = item;
  const { stats, missing, duplicates } = summarize(columns, rows);

  const numericStats = stats.filter(s => s.type === "Numeric");
  const textStats = stats.filter(s => s.type === "Text");

  const selectedNumericCol =
    options.numericCol && numericStats.some(s => s.name === options.numericCol)
      ? options.numericCol
      : (numericStats[0]?.name || "");

  const defaultCatCol = findPrimaryCategoricalColumn(columns, stats, rows);
  const selectedCategoryCol =
    options.categoryCol && columns.includes(options.categoryCol)
      ? options.categoryCol
      : (defaultCatCol || columns[0] || "");

  const quality = buildQualityReport(columns, rows, stats, missing, duplicates);
  const numericHistogram = buildNumericHistogram(rows, selectedNumericCol);
  const categoryFrequency = buildCategoryFrequency(rows, selectedCategoryCol);
  const missingByColumn = stats.map(s => ({
    column: s.name,
    missing: s.missing,
    valid: s.nonEmptyCount,
    missingPct: s.missingPct
  }));
  const numericComparison = numericStats.map(s => ({
    column: s.name,
    min: s.min ?? 0,
    mean: s.mean ?? 0,
    median: s.median ?? 0,
    max: s.max ?? 0,
    sum: s.sum ?? 0,
    stdDev: s.stdDev ?? 0
  }));

  const insights = generateAutoInsights({
    rowCount: rows.length,
    colCount: columns.length,
    stats,
    quality,
    categoryFreq: categoryFrequency
  });

  if (duplicates > 0) {
    insights.push({
      id: "duplicates-pattern",
      title: "Duplicate records detected",
      tone: quality.duplicatePct > 10 ? "alert" : "warning",
      metric: `${duplicates} row${duplicates === 1 ? "" : "s"} (${quality.duplicatePct}%)`,
      description: `Found ${duplicates} exact duplicate row(s) (${quality.duplicatePct}% of dataset records).`
    });
  }

  return {
    dataset: {
      id: item.id,
      name: item.name,
      createdAt: item.created_at,
      rowCount: rows.length,
      columnCount: columns.length,
      numericColumnsCount: numericStats.length,
      textColumnsCount: textStats.length,
      columns
    },
    overview: {
      totalRecords: rows.length,
      totalColumns: columns.length,
      numericColumns: numericStats.length,
      textColumns: textStats.length,
      missingValues: missing,
      missingPct: quality.missingPct,
      duplicateRecords: duplicates,
      duplicatePct: quality.duplicatePct,
      completeness: quality.completeness,
      qualityScore: quality.qualityScore,
      overallStatus: quality.overallStatus
    },
    numericStats,
    columnStats: stats,
    quality,
    distributions: {
      selectedNumericCol,
      numericColumns: numericStats.map(s => s.name),
      numericHistogram,
      selectedCategoryCol,
      categoryColumns: columns,
      categoryFrequency,
      missingByColumn,
      numericComparison
    },
    insights
  };
}

module.exports = {
  parseNumericValue,
  summarize,
  analyzeDataset
};
