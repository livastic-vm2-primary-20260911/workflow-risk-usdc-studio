/**
 * Browser-local crypto CSV narrative parser.
 * Derived review candidates only, never inferred prices, taxes or transfers.
 * Pure functions: no network, wallet, storage, logs or private data export.
 */
import {parseCSV, validateCSVText, MAX_CSV_DATA_ROWS} from "../local.mjs";

const problem = code => {throw new Error(code)};
export const MAX_DESCRIPTION_CHARS = 512;
const NARRATIVE = /^(Purchase of|Sale of|Bought|Sold) (0|[1-9][0-9]{0,13})(?:\.([0-9]{1,18}))? ([A-Za-z][A-Za-z0-9]{1,11})$/i;
const VALID_SYMBOL = /^[A-Z][A-Z0-9]{1,11}$/;
const FORMULA_LIKE = /^[=+@-]/;

export function parseDescription(raw) {
  if (typeof raw !== "string") return {ok:false,code:"NOT_TEXT"};
  const value = raw.trim();
  if (value.length > MAX_DESCRIPTION_CHARS) return {ok:false,code:"DESCRIPTION_TOO_LONG"};
  if (!value) return {ok:false,code:"BLANK_DESCRIPTION"};
  if (FORMULA_LIKE.test(value)) return {ok:false,code:"FORMULA_LIKE"};
  const m=NARRATIVE.exec(value);
  if (!m) return {ok:false,code:"NO_EXACT_SINGLE_ACTION"};
  const symbol=m[4];
  if (!VALID_SYMBOL.test(symbol)) return {ok:false,code:"SYMBOL_NOT_UPPERCASE"};
  const decimal=m[2]+(m[3]!==undefined?"."+m[3]:"");
  if (/^0(?:\.0+)?$/.test(decimal)) return {ok:false,code:"ZERO_QUANTITY"};
  const v=m[1].toLowerCase();
  return {
    ok:true, kind:v==="sale of"||v==="sold"?"SELL_CANDIDATE":"BUY_CANDIDATE",
    quantity:decimal, symbol, reviewRequired:true, code:"NARRATIVE_CANDIDATE_ONLY"
  };
}

export function inspectNarrativeCSV(text,columnName="Description") {
  const bytes=validateCSVText(text);
  const rows=parseCSV(text);
  if (rows.length<2) problem("NEEDS_DATA_ROWS");
  if (rows.length-1>MAX_CSV_DATA_ROWS) problem("TOO_MANY_ROWS");
  const header=rows[0].map(v=>v.trim());
  if (header.some(v=>!v||v.length>160)) problem("INVALID_HEADERS");
  const norm=header.map(v=>v.toLowerCase());
  if (new Set(norm).size!==norm.length) problem("DUPLICATE_HEADERS");
  if (typeof columnName!=="string"||!/^[a-zA-Z0-9_ -]{1,80}$/.test(columnName.trim()))
    problem("INVALID_COLUMN_NAME");
  const idx=norm.indexOf(columnName.trim().toLowerCase());
  if (idx<0) problem("DESCRIPTION_COLUMN_NOT_FOUND");
  const records=[], reasonTotals={};
  for(let i=1;i<rows.length;i++) {
    const row=rows[i];
    if(row.length!==header.length)problem("RAGGED_CSV_REQUIRES_REPAIR");
    const item=parseDescription(row[idx]);
    const record={
      sourceRecord:i+1, // 1-based logical CSV record, including header
      status:item.ok?"REVIEW_REQUIRED":"NOT_PARSED",
      code:item.code
    };
    if (item.ok) {
      record.kind=item.kind;
      record.quantity=item.quantity;
      record.symbol=item.symbol;
    } else {
      reasonTotals[item.code]=(reasonTotals[item.code]||0)+1;
    }
    records.push(record);
  }
  return {
    kind:"CRYPTO_NARRATIVE_CSV_BROWSER_LOCAL_CANDIDATES",
    paid:false,uploaded:false,chargedUSDC:"0",
    inputBytes:bytes,sourceRecords:records.length,
    candidateRecords:records.filter(x=>x.status==="REVIEW_REQUIRED").length,
    unparsedRecords:records.filter(x=>x.status==="NOT_PARSED").length,
    descriptionColumn:header[idx],reasonTotals,records,
    limitations:[
      "CANDIDATES ONLY. No Koinly import, quote asset, paid value, fees, tax basis, income, or import guarantee.",
      "Asset tickers alone do not prove the blockchain, token contract, or receipt.",
      "No date/timezone, source ID, fee or transfer assumptions; reconcile originals manually.",
      "The optional review CSV copies neither the raw description nor unrelated source columns.",
      "Do not share private exchange exports or real wallet/account records without authorization."
    ]
  };
}

const escapeCSV=value=>'"'+String(value).replace(/"/g,'""')+'"';
export function candidateReviewCSV(report) {
  if (!report||report.kind!=="CRYPTO_NARRATIVE_CSV_BROWSER_LOCAL_CANDIDATES"||
      report.uploaded!==false||report.paid!==false||
      !Array.isArray(report.records)||report.records.length>MAX_CSV_DATA_ROWS)
    problem("INVALID_LOCAL_REPORT");
  const output=["Source Record,Review Type,Quantity,Asset Symbol,Status"];
  for(const row of report.records) {
    if(row.status!=="REVIEW_REQUIRED") continue;
    if(!Number.isSafeInteger(row.sourceRecord)||row.sourceRecord<2||
       !["BUY_CANDIDATE","SELL_CANDIDATE"].includes(row.kind)||
       !/^(0|[1-9][0-9]{0,13})(?:\.[0-9]{1,18})?$/.test(row.quantity)||
       !VALID_SYMBOL.test(row.symbol)) problem("UNSAFE_LOCAL_REPORT_DATA");
    output.push([
      String(row.sourceRecord),escapeCSV(row.kind),escapeCSV(row.quantity),
      escapeCSV(row.symbol),escapeCSV("REVIEW_REQUIRED_NOT_KOINLY_IMPORT")
    ].join(","));
  }
  return output.join("\r\n")+"\r\n";
}
