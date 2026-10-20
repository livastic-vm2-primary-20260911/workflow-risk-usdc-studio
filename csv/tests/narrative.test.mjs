import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {inspectNarrativeCSV,parseDescription,candidateReviewCSV,MAX_DESCRIPTION_CHARS} from "../narrative/core.mjs";

const src=(entries,header="Description,Date")=>[header,...entries].join("\n");
const typical=src([
 '"Purchase of 1.4324467000 SOL","2026-10-01"',
 '"Sale of 0.250000 BTC","2026-10-02"',
 '"Bought 3 ETH","2026-10-03"',
 '"Sold 4 XRP","2026-10-04"',
]);
const badRaw=['Purchase of 1 SOL for CAD30','Purchase of 1 SOL and 1 BTC',
 'Purchase of 1e40 ETH','Purchase of 1,500 ETH','Sale of -1 BTC',
 'Sale of 1. SOL','Bought 1.1234567890123456789 ETH',
 'Purchase of 0004 SOL','Purchase of $3 SOL','Purchase of 2 SOL!',
 'Transfer 1 SOL','Mint of 1 SOL','Withdrawal 1 ETH',
 'Purchase of 1 sol','Bought 1💰 ETH','Sold １ BTC'];

test("four narrow action grammars are distinguishable",()=>{
 const x=inspectNarrativeCSV(typical);
 assert.equal(x.candidateRecords,4);
 assert.equal(x.unparsedRecords,0);
 assert.deepEqual(x.records.map(r=>r.kind),["BUY_CANDIDATE","SELL_CANDIDATE","BUY_CANDIDATE","SELL_CANDIDATE"]);
});
test("preserves long decimal exactly without float rounding",()=>{
 const a=parseDescription("Purchase of 1.4324467000 SOL");
 assert.equal(a.quantity,"1.4324467000");
 assert.equal(a.symbol,"SOL");
 assert.equal(a.reviewRequired,true);
});
test("max 18-digit fraction permitted only at strict precision",()=>{
 assert.equal(parseDescription("Bought 0.000000000000000001 BTC").quantity,"0.000000000000000001");
 assert.equal(parseDescription("Bought 0.0000000000000000001 BTC").ok,false);
});
test("zero cannot be interpreted as real purchase",()=>{
 for(const input of ["Bought 0 ETH","Bought 0.000 ETH","Sale of 0.0 BTC"])
  assert.equal(parseDescription(input).code,"ZERO_QUANTITY");
});
test("narrative amounts reject scientific/negative/thousands/locale values",()=>{
 for(const item of badRaw) {
  assert.equal(parseDescription(item).ok,false,item);
 }
});
test("explicit leading formula characters are rejected, not evaluated",()=>{
 for(const s of ['=2+2','@SUM(A1:A2)','+HYPERLINK(1)','-cmd|calc']) {
  assert.equal(parseDescription(s).code,"FORMULA_LIKE");
 }
});
test("non-text, whitespace and overlong are noncandidate",()=>{
 assert.equal(parseDescription(null).code,"NOT_TEXT");
 assert.equal(parseDescription("  ").code,"BLANK_DESCRIPTION");
 assert.equal(parseDescription("A".repeat(MAX_DESCRIPTION_CHARS+1)).code,"DESCRIPTION_TOO_LONG");
});
test("case-insensitive grammar but NOT lowercase asset ticker",()=>{
 const a=parseDescription("purchase of 2 ETH");
 assert.equal(a.ok,true);
 assert.equal(parseDescription("Purchase of 2 eth").code,"SYMBOL_NOT_UPPERCASE");
});
test("source row count/order never deduplicates repeated narrative rows",()=>{
 const r=inspectNarrativeCSV(src(['"Bought 1 ETH",A','"Bought 1 ETH",A','"Sold 1 BTC",B']));
 assert.equal(r.sourceRecords,3);
 assert.deepEqual(r.records.map(x=>x.sourceRecord),[2,3,4]);
 assert.equal(r.candidateRecords,3);
});
test("quoted comma inside unrelated column is handled as one record",()=>{
 const r=inspectNarrativeCSV(src(['"Bought 1 ETH","Jan, Feb"']));
 assert.equal(r.sourceRecords,1);
 assert.equal(r.records[0].symbol,"ETH");
});
test("quoted multiline unrelated cell preserves logical record number",()=>{
 const r=inspectNarrativeCSV(src(['"Bought 1 ETH","first\nsecond"','"Sold 2 BTC",C']));
 assert.equal(r.candidateRecords,2);
 assert.equal(r.records[1].sourceRecord,3);
});
test("UTF-8 BOM in Description header accepted",()=>{
 const r=inspectNarrativeCSV("\uFEFFDescription,Date\nBought 1 ETH,2026-10-20");
 assert.equal(r.candidateRecords,1);
});
test("case-insensitive column match is possible with user-provided header name",()=>{
 assert.equal(inspectNarrativeCSV("Narrative,Date\nBought 2 ETH,2026-10-20","narrative").candidateRecords,1);
});
test("duplicate header names fail rather than ambiguously choosing",()=>{
 assert.throws(()=>inspectNarrativeCSV("Description,description\nBought 1 ETH,A"),/DUPLICATE_HEADERS/);
});
test("missing column fails before candidate output",()=>{
 assert.throws(()=>inspectNarrativeCSV("Memo,Date\nBought 1 ETH,B"),/DESCRIPTION_COLUMN_NOT_FOUND/);
});
test("empty/header-only file fails, no fake row",()=>{
 assert.throws(()=>inspectNarrativeCSV("Description,Date\n"),/NEEDS_DATA_ROWS/);
});
test("invalid column reference fails",()=>{
 assert.throws(()=>inspectNarrativeCSV(typical,"../../config"),/INVALID_COLUMN_NAME/);
});
test("ragged rows fail closed",()=>{
 assert.throws(()=>inspectNarrativeCSV("Description,Date\nBought 1 ETH\n"),/RAGGED_CSV/);
});
test("malformed CSV quoting fails closed",()=>{
 for(const x of [
 'Description,Date\n"Bought 1 ETH,A',
 'Description,Date\nBought "1 ETH",A',
 'Description,Date\n"Bought 1 ETH"trailing,A'
 ]) assert.throws(()=>inspectNarrativeCSV(x),/quoted|quote|closing/);
});
test("NUL fails in CSV source",()=>{
 assert.throws(()=>inspectNarrativeCSV("Description,Date\nBought 1 ETH,\u0000"),/NUL/);
});
test("strict source byte limit protects browser resources",()=>{
 const s="Description,Date\n"+"Bought 1 ETH,"+"x".repeat(33000);
 assert.throws(()=>inspectNarrativeCSV(s),/CSV size/);
});
test("maximum 500 data rows accepted",()=>{
 const input=src(Array.from({length:500},()=>"Bought 1 ETH,2026-10-20"));
 const r=inspectNarrativeCSV(input);
 assert.equal(r.sourceRecords,500);
});
test("501 data rows refused",()=>{
 assert.throws(()=>inspectNarrativeCSV(src(Array.from({length:501},()=>"Bought 1 ETH,2026-10-20"))),/500 data rows/);
});
test("more than 40 columns refused",()=>{
 const h=Array.from({length:41},(_,i)=>i===0?"Description":"field"+i).join(",");
 const row=Array.from({length:41},(_,i)=>i===0?"Bought 1 ETH":"v").join(",");
 assert.throws(()=>inspectNarrativeCSV(h+"\n"+row),/40 columns/);
});
test("case equality does not infer token contract",()=>{
 const r=inspectNarrativeCSV("Description,Address\nBought 1 USDC,0x0000");
 assert.equal(r.records[0].symbol,"USDC");
 assert.ok(r.limitations.some(x=>x.includes("token contract")));
});
test("no data uploaded, paid or charged in report flags",()=>{
 const x=inspectNarrativeCSV(typical);
 assert.equal(x.paid,false);assert.equal(x.uploaded,false);assert.equal(x.chargedUSDC,"0");
});
test("unparsed records remain explicit and counted",()=>{
 const x=inspectNarrativeCSV(src(['Unknown operation,A','Bought 1 ETH,B']));
 assert.equal(x.candidateRecords,1);
 assert.equal(x.unparsedRecords,1);
 assert.equal(x.records[0].code,"NO_EXACT_SINGLE_ACTION");
});
test("summary does not include raw source IDs or account strings",()=>{
 const x=inspectNarrativeCSV('Description,Wallet,SecretReference\n"Bought 2 ETH","0xPRIVATE_123","EXCLUDED_ID_123"');
 assert.ok(!JSON.stringify(x).includes("EXCLUDED_ID_123"));
 assert.ok(!JSON.stringify(x).includes("0xPRIVATE_123"));
});
test("CSV export starts with review-only header, not Koinly importer format",()=>{
 const r=inspectNarrativeCSV(typical), s=candidateReviewCSV(r);
 assert.ok(s.startsWith("Source Record,Review Type,Quantity,Asset Symbol,Status\r\n"));
 assert.equal(s.split("\r\n").length,6); // header + 4 candidates + final empty
 assert.ok(s.includes("REVIEW_REQUIRED_NOT_KOINLY_IMPORT"));
 assert.ok(!s.includes("Koinly Date"));
});
test("candidate export keeps source precision and not source descriptions",()=>{
 const r=inspectNarrativeCSV(typical), s=candidateReviewCSV(r);
 assert.ok(s.includes('"1.4324467000"'));
 assert.ok(!s.includes("Purchase of"));
 assert.ok(!s.includes("Sale of"));
 assert.ok(!s.includes("2026-10-"));
});
test("candidate export excludes unparsed records rather than inventing trades",()=>{
 const r=inspectNarrativeCSV(src(['Unknown operation,A','Bought 1 ETH,B']));
 const csv=candidateReviewCSV(r);
 assert.ok(!csv.includes("Unknown"));
 assert.equal(csv.match(/REVIEW_REQUIRED_NOT_KOINLY_IMPORT/g)?.length,1);
});
test("export refuses mutated external report with CSV formula injection",()=>{
 const report=inspectNarrativeCSV(typical);
 report.records[0].symbol="=IMPORTXML";
 assert.throws(()=>candidateReviewCSV(report),/UNSAFE_LOCAL_REPORT_DATA/);
});
test("export refuses malformed provenance even if shaped like a result",()=>{
 assert.throws(()=>candidateReviewCSV({kind:"CRYPTO_NARRATIVE_CSV_BROWSER_LOCAL_CANDIDATES",
 paid:true,uploaded:false,records:[]}),/INVALID_LOCAL_REPORT/);
});
test("export refuses mutated negative amounts",()=>{
 const report=inspectNarrativeCSV(typical);
 report.records[0].quantity="-1";
 assert.throws(()=>candidateReviewCSV(report),/UNSAFE_LOCAL_REPORT_DATA/);
});
test("browser HTML has strict no-connect CSP and no third-party scripts",()=>{
 const html=readFileSync(new URL("../narrative/index.html",import.meta.url),"utf8");
 assert.ok(html.includes("connect-src 'none'"));
 assert.ok(html.includes("form-action 'none'"));
 const externalScripts=[...html.matchAll(/<script[^>]*src="(https?:[^"]+)"/g)];
 assert.equal(externalScripts.length,0);
 assert.ok(html.includes("Not a Koinly-compatible"));
});
test("public UI uses textContent not unsafe innerHTML",()=>{
 const app=readFileSync(new URL("../narrative/app.mjs",import.meta.url),"utf8");
 assert.ok(app.includes("textContent"));
 assert.ok(!app.includes("innerHTML"));
 assert.ok(!app.includes("fetch("));
 assert.ok(!app.includes("ethereum"));
});
test("help links refer to existing one-owner products, not a second seller",()=>{
 const html=readFileSync(new URL("../narrative/index.html",import.meta.url),"utf8");
 assert.ok(html.includes("livastic-vm1-primary.github.io/paperpilot-tools/koinly-column-mapper.html"));
 assert.ok(html.includes("livastic-vm3-primary-tmp-260920.github.io/crypto-csv-rescue/koinly-preflight/"));
 assert.ok(html.includes("nonbinding 49 Base Circle USDC"));
});
