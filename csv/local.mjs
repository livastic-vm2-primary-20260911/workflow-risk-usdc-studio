/**
 * Lightweight bounded, browser-local CSV structural preflight.
 * CSV contents NEVER leave the browser unless the user separately opts in
 * to the paid VM5 remote API. Findings contain coordinates, not cell values.
 * Not semantic verification, schema assurance, or security certification.
 */
export const MAX_CSV_BYTES = 32768;
export const MAX_CSV_DATA_ROWS = 500;
export const MAX_CSV_COLUMNS = 40;
const findingLimit = 80;

function assert(ok, why) { if (!ok) throw new Error(why); }
export function validateCSVText(text) {
  assert(typeof text === "string", "CSV data must be text");
  const size = new TextEncoder().encode(text).length;
  assert(size >= 3 && size <= MAX_CSV_BYTES, "CSV size must be 3–32,768 UTF-8 bytes");
  assert(!text.includes("\0"), "CSV contains an invalid NUL byte");
  return size;
}
export function parseCSV(text) {
  validateCSVText(text);
  const rows = [];
  let fields = [], cell = "", insideQuotes = false;
  let justClosed = false;
  let count = 0;
  const endCell = () => {
    fields.push(cell); cell = ""; justClosed = false;
    assert(fields.length <= MAX_CSV_COLUMNS, "CSV exceeds 40 columns");
  };
  const endRow = () => {
    endCell();
    rows.push(fields);
    fields = [];
    count++;
    assert(count <= MAX_CSV_DATA_ROWS + 1, "CSV exceeds 500 data rows");
  };
  // An escaped quote ("") is valid only inside a quoted field.
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (insideQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { insideQuotes = false; justClosed = true; }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      assert(cell === "" && !justClosed, "Unexpected quote inside CSV field");
      insideQuotes = true;
    } else if (ch === ",") {
      endCell();
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      assert(!justClosed, "Text after closing quoted CSV field");
      cell += ch;
    }
  }
  assert(!insideQuotes, "Unterminated quoted CSV field");
  const hasTerminalNewline = /\r\n$|\n$|\r$/.test(text);
  if (!hasTerminalNewline || fields.length || cell) endRow();
  assert(rows.length > 0 && rows[0].some(v=>v.trim().length > 0), "CSV header is missing");
  assert(rows[0].length <= MAX_CSV_COLUMNS, "CSV exceeds 40 columns");
  if (rows[0][0].startsWith("\uFEFF")) rows[0][0] = rows[0][0].slice(1);
  return rows;
}
export function parseExpectedColumns(value) {
  if (value == null || String(value).trim() === "") return [];
  assert(typeof value === "string", "Expected columns must be text");
  const cols = value.split(",").map(s=>s.trim());
  assert(cols.length <= MAX_CSV_COLUMNS && cols.every(c=>c.length >= 1 && c.length <= 200),
    "Expected columns must contain at most 40 nonempty names");
  assert(new Set(cols.map(c=>c.toLowerCase())).size === cols.length,
    "Expected columns must be unique");
  return cols;
}
const looksLikeFormula = value => {
  const s = value.trimStart();
  return /^[=+@]/.test(s) || (/^-/.test(s) && !/^-\d+(\.\d+)?$/.test(s));
};
export function inspectCSV(text, expected = []) {
  const bytes = validateCSVText(text);
  assert(Array.isArray(expected) && expected.length <= MAX_CSV_COLUMNS &&
    expected.every(s => typeof s === "string" && s.length > 0),
    "Invalid expected column list");
  const rows = parseCSV(text);
  const headers = rows[0];
  const colCount = headers.length;
  const totals = {
    raggedRows: 0, blankCells: 0, duplicateRows: 0,
    formulaLikeCells: 0, duplicateHeaders: 0, missingExpectedColumns: 0
  };
  const details = [];
  const add = (type, row, column, detail) => {
    if (details.length < findingLimit) details.push({type,row,column,detail});
  };
  const headerSeen = new Set();
  headers.forEach((header,idx)=>{
    const name=header.trim().toLowerCase();
    if(headerSeen.has(name)) {
      totals.duplicateHeaders++;
      add("DUPLICATE_HEADER",1,idx+1,"Header name repeated (case-insensitive)");
    }
    headerSeen.add(name);
  });
  for (const wanted of expected) {
    if (!headerSeen.has(wanted.trim().toLowerCase())) {
      totals.missingExpectedColumns++;
      add("EXPECTED_COLUMN_MISSING",1,null,"One expected header was not found");
    }
  }
  const seenRows=new Map();
  for(let i=1;i<rows.length;i++){
    const row=rows[i],rowNumber=i+1; // physical 1-based row number including header
    if(row.length !== colCount){
      totals.raggedRows++;
      add("COLUMN_COUNT_MISMATCH",rowNumber,null,
        "Data row has a different number of columns from the header");
    }
    const key=JSON.stringify(row);
    if (seenRows.has(key)) {
      totals.duplicateRows++;
      add("DUPLICATE_ROW",rowNumber,null,
        "Identical data row previously appeared in the file");
    } else seenRows.set(key,rowNumber);
    for(let j=0;j<row.length;j++){
      const value=row[j];
      if (value.trim()==="") {
        totals.blankCells++;
        add("BLANK_CELL",rowNumber,j+1,"Empty or whitespace-only cell");
      }
      if (looksLikeFormula(value)) {
        totals.formulaLikeCells++;
        add("FORMULA_LIKE",rowNumber,j+1,
          "Formula-like leading text; review before opening CSV in a spreadsheet");
      }
    }
  }
  return {
    kind: "BROWSER_LOCAL_CSV_STRUCTURE_PREVIEW",
    paid:false, uploaded:false, chargedUSDC:"0",
    fileBytes:bytes,
    headerColumns:colCount,
    dataRows:rows.length-1,
    totals,
    details,
    findingsTruncated: Object.values(totals).reduce((n,v)=>n+v,0) > details.length,
    limitations:[
      "Heuristic structural scan only; NOT a semantic validation, import guarantee or security certification.",
      "CSV values stay in this browser; free-mode output includes coordinates and counts, not source cell values.",
      "The hosted paid API requires separate explicit permission and an x402 wallet authorization."
    ]
  };
}
