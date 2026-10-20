import {test} from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CSV_BYTES, MAX_CSV_DATA_ROWS, MAX_CSV_COLUMNS,
  validateCSVText, parseCSV, parseExpectedColumns, inspectCSV
} from "../local.mjs";

const sample="email,amount,date\nalice@example.org,12.5,2026-10-20\nalice@example.org,12.5,2026-10-20\nbad@address,=1+1,\n";
test("CSV parser enforces 32K UTF-8 bytes",()=>{
  assert.equal(MAX_CSV_BYTES,32768);
  assert.throws(()=>validateCSVText("한".repeat(11000)),/CSV size/);
  assert.equal(validateCSVText("a,b\n"),4);
});
test("CSV rejects NUL and non-text values",()=>{
  assert.throws(()=>validateCSVText("a,b\nx\0z"),/NUL/);
  assert.throws(()=>validateCSVText({csv:"a,b"}),/CSV data must be text/);
});
test("CSV accepts simple header and data",()=>{
  assert.deepEqual(parseCSV("a,b\n1,2"),[["a","b"],["1","2"]]);
});
test("CSV reads CRLF, LF and terminal newline without phantom row",()=>{
  assert.deepEqual(parseCSV("a,b\r\n1,2\r\n"),[["a","b"],["1","2"]]);
  assert.deepEqual(parseCSV("a,b\n1,2\n"),[["a","b"],["1","2"]]);
  assert.deepEqual(parseCSV("a,b\r1,2\r"),[["a","b"],["1","2"]]);
});
test("quoted commas and quotes are decoded, not split",()=>{
  assert.deepEqual(parseCSV('a,b\n"one,two","said ""hello"""'),
    [["a","b"],["one,two",'said "hello"']]);
});
test("newline inside quoted CSV cell remains one data row",()=>{
  assert.deepEqual(parseCSV('a,b\n"two\nlines",c'),
    [["a","b"],["two\nlines","c"]]);
});
test("UTF-8 BOM stripped from first header",()=>{
  assert.deepEqual(parseCSV("\uFEFFcol,second\n1,2"),
    [["col","second"],["1","2"]]);
});
test("missing header rejected",()=>{
  assert.throws(()=>parseCSV(',,\n1,2,3'),/CSV header is missing/);
});
test("unterminated quote rejected",()=>{
  assert.throws(()=>parseCSV('a,b\n"never closed,c'),/Unterminated/);
});
test("embedded unquoted quote rejected",()=>{
  assert.throws(()=>parseCSV('a,b\nabc"def",2'),/Unexpected quote/);
});
test("trailing text after close quote rejected",()=>{
  assert.throws(()=>parseCSV('a,b\n"abc"x,2'),/Text after closing/);
});
test("maximum 40 columns enforced on every row",()=>{
  assert.equal(MAX_CSV_COLUMNS,40);
  const hdr=Array.from({length:40},(_,i)=>'c'+i).join(",");
  assert.equal(parseCSV(hdr+"\n"+Array.from({length:40},()=>1).join(","))[0].length,40);
  assert.throws(()=>parseCSV(hdr+"\n"+Array.from({length:41},()=>1).join(",")),/exceeds 40/);
});
test("maximum 500 data rows accepted, 501 rejected",()=>{
  assert.equal(MAX_CSV_DATA_ROWS,500);
  const prefix="a,b\n";
  assert.equal(parseCSV(prefix+"1,2\n".repeat(500)).length,501);
  assert.throws(()=>parseCSV(prefix+"1,2\n".repeat(501)),/exceeds 500/);
});
test("expected columns trim and preserve distinct names",()=>{
  assert.deepEqual(parseExpectedColumns(" email, amount ,date "),["email","amount","date"]);
});
test("missing expected columns allowed as empty",()=>{
  assert.deepEqual(parseExpectedColumns(""),[]);
  assert.deepEqual(parseExpectedColumns(null),[]);
});
test("expected columns reject missing fields and duplicate names",()=>{
  assert.throws(()=>parseExpectedColumns("a,,b"),/at most 40/);
  assert.throws(()=>parseExpectedColumns("a,A"),/unique/);
});
test("expected columns reject 41 names",()=>{
  assert.throws(()=>parseExpectedColumns(Array.from({length:41},(_,i)=>'c'+i).join(",")),/at most 40/);
});
test("free local data flow explicitly denies charging and uploading",()=>{
  const r=inspectCSV(sample,["email","amount","date"]);
  assert.equal(r.paid,false);
  assert.equal(r.uploaded,false);
  assert.equal(r.chargedUSDC,"0");
  assert.equal(r.kind,"BROWSER_LOCAL_CSV_STRUCTURE_PREVIEW");
});
test("finds duplicate data rows, blank cell and formula-like prefixes",()=>{
  const r=inspectCSV(sample);
  assert.equal(r.dataRows,3);
  assert.equal(r.headerColumns,3);
  assert.equal(r.totals.duplicateRows,1);
  assert.equal(r.totals.blankCells,1);
  assert.equal(r.totals.formulaLikeCells,1);
});
test("reports ragged row with position",()=>{
  const r=inspectCSV("a,b\nx,2\nbadline");
  assert.equal(r.totals.raggedRows,1);
  assert.ok(r.details.some(x=>x.type==="COLUMN_COUNT_MISMATCH" && x.row===3));
});
test("duplicate case-insensitive column detected",()=>{
  const r=inspectCSV("Email,email\nx,y");
  assert.equal(r.totals.duplicateHeaders,1);
});
test("missing expected column reported without inventing matching rows",()=>{
  const r=inspectCSV("email,age\nalice,24",["email","date"]);
  assert.equal(r.totals.missingExpectedColumns,1);
});
test("never copies source row values into public report JSON",()=>{
  const input="name,amount\nPRIVATE_CUSTOMER_ROW_VALUE,=A1+2";
  const r=inspectCSV(input);
  assert.ok(JSON.stringify(r).includes("FORMULA_LIKE"));
  assert.ok(!JSON.stringify(r).includes("PRIVATE_CUSTOMER_ROW_VALUE"));
  assert.ok(!JSON.stringify(r).includes("=A1+2"));
});
test("numeric negatives not misclassified as formula injection",()=>{
  const r=inspectCSV("a,b\n-123,-2.4");
  assert.equal(r.totals.formulaLikeCells,0);
});
test("non-numeric leading minus and plus flagged as spreadsheet formulas",()=>{
  const r=inspectCSV("a,b\n-cmd,+SUM(A1)");
  assert.equal(r.totals.formulaLikeCells,2);
});
test("no findings for well-formed small CSV",()=>{
  const r=inspectCSV("name,score\nAda,10\nBob,20");
  assert.equal(r.details.length,0);
  assert.equal(Object.values(r.totals).reduce((a,b)=>a+b,0),0);
});
test("findings truncate safely without echoing original CSV",()=>{
  const data="one,two\n"+Array.from({length:200},(_,i)=>"=formula"+i+",").join("\n");
  const r=inspectCSV(data);
  assert.equal(r.details.length,80);
  assert.equal(r.findingsTruncated,true);
});
test("a quote, charge or wallet never occurs in this pure local module",()=>{
  assert.equal(typeof inspectCSV,"function");
  assert.equal(inspectCSV("a,b\n1,2").chargedUSDC,"0");
});
