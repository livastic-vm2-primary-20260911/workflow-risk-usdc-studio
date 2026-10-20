import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {inspectNarrativeCSV,candidateReviewCSV} from "../narrative/core.mjs";

const path = file => new URL("../mini-review-demo/"+file,import.meta.url);
const read = file => readFileSync(path(file),"utf8");
const input = read("synthetic-source-10rows.csv");
const report = JSON.parse(read("derived-review-only.json"));
const candidates = read("derived-candidate-review-only.csv");
const html = read("index.html");
const buyerReport = read("REVIEW_REPORT.md");
const catalog = JSON.parse(readFileSync(new URL("../catalog.json",import.meta.url),"utf8"));
const localPage = readFileSync(new URL("../narrative/index.html",import.meta.url),"utf8");
const paidPage = readFileSync(new URL("../index.html",import.meta.url),"utf8");
const sitemap = readFileSync(new URL("../../sitemap.xml",import.meta.url),"utf8");

test("sample result JSON is derived from the actual shipping parser, byte-for-byte",()=>{
 const actual=inspectNarrativeCSV(input);
 assert.deepEqual(actual,report);
 assert.equal(actual.sourceRecords,10);
 assert.equal(actual.candidateRecords,6);
 assert.equal(actual.unparsedRecords,4);
 assert.deepEqual(actual.reasonTotals,{
   NO_EXACT_SINGLE_ACTION:1,
   REVERSAL_OR_MULTIPLE_ACTIONS:2,
   FORMULA_LIKE:1,
 });
});
test("sample candidate output is exactly actual shipping parser export, not a fabricated customer",()=>{
 const actual=candidateReviewCSV(inspectNarrativeCSV(input));
 assert.equal(candidates,actual);
 assert.equal(candidates.split("\r\n").length,8);
 for(const sensitive of ["SYNTHETIC-","2026-10-","QuoteText","Reference","REFUNDED","HYPERLINK","Transfer of","Purchase of"]){
   assert.ok(!candidates.includes(sensitive),"derived output leaked source text: "+sensitive);
   assert.ok(!JSON.stringify(report).includes(sensitive),"public JSON leaked source cells: "+sensitive);
 }
});
test("one actual synthetic source, exact logical row order, no fake transaction finality",()=>{
 const r=inspectNarrativeCSV(input);
 assert.deepEqual(r.records.map(x=>x.sourceRecord),[2,3,4,5,6,7,8,9,10,11]);
 assert.deepEqual(r.records.map(x=>x.status),[
   "REVIEW_REQUIRED","REVIEW_REQUIRED","REVIEW_REQUIRED","REVIEW_REQUIRED",
   "REVIEW_REQUIRED","REVIEW_REQUIRED","NOT_PARSED","NOT_PARSED","NOT_PARSED","NOT_PARSED"
 ]);
 assert.equal(r.records[2].code,"TRAILING_CONTEXT_IGNORED_REVIEW_REQUIRED");
 assert.equal(r.records[4].code,"TRAILING_CONTEXT_IGNORED_REVIEW_REQUIRED");
 assert.equal(r.records[7].code,"REVERSAL_OR_MULTIPLE_ACTIONS");
});
test("static page is public only, forbids client network fetch and payment",()=>{
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/script-src 'none'/);
 assert.match(html,/form-action 'none'/);
 assert.ok(!/<script\b|<form\b|<iframe\b|<img[^>]+src="https?:/i.test(html));
 assert.ok(!/eth_sign|window\.ethereum|PAYMENT-SIGNATURE|walletConnect|fetch\(/.test(html));
 assert.ok(html.includes("0 REAL CUSTOMERS CLAIMED"));
 assert.ok(html.includes("0 paid customers, 0 purchases, 0 wallet transfers") || buyerReport.includes("0 paid customers, 0 purchases, 0 wallet transfers"));
});
test("full sample page describes exact ten rows with truthful statuses",()=>{
 const tbody=html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
 assert.ok(tbody);
 assert.equal((tbody.match(/<tr>/g)||[]).length,10);
 for(const exact of ["1.4324467000 SOL","0.000000000000000001 ETH","NOT_PARSED","99 CAD","6 candidates","4 explicit exceptions"]){
   assert.ok(html.includes(exact),exact);
 }
 for(const term of ["No Koinly import-ready output","no settlement proof","not a signed order"]){
   assert.ok(html.toLowerCase().includes(term.toLowerCase()),term);
 }
});
test("actual buyer-facing links and scope say HashN is non-escrow optional",()=>{
 const url="https://hashn.com/store/886ed287-aaca-434b-9f27-560a50bfbbb6/listings/koinly-csv-one-source-mapping-mini-review-5usdc.md";
 assert.ok(html.includes(url));
 assert.ok(html.includes("HashN is a contact directory for registered agents, not escrow or instant checkout"));
 assert.ok(html.includes("5 native Circle USDC"));
 assert.match(html,/one buyer-authorized/i);
 assert.ok(html.includes("refund"));
 assert.ok(html.includes("Human inquiry"));
 assert.ok(html.includes("not a real customer order") || html.includes("not evidence of a paid customer"));
 assert.ok(buyerReport.includes("No client material"));
 assert.ok(buyerReport.includes("Do not send real client CSVs"));
});
test("free buyer sites link to published source-derived 10-row demo exactly once",()=>{
 for(const page of [localPage,paidPage]){
   assert.equal((page.match(/href="\.\/?\.?\/mini-review-demo\/"/g)||[]).length,1);
 }
 const item=catalog.freeNarrativeInspector.independentFictionalMiniReviewEvidence;
 assert.equal(item.syntheticSourceRecords,10);
 assert.equal(item.genuinelyDerivedReviewCandidateRecords,6);
 assert.equal(item.unparsedRecords,4);
 assert.equal(item.independentRealBuyersOrPaidDemoClaims,0);
 assert.equal(item.requiresSeparateWrittenScopeBeforeRealBuyerDataOrUSDCTransfer,true);
});
test("original machine discovery lists single real demo canonical under known GitHub Pages scope",()=>{
 const url="https://livastic-vm2-primary-20260911.github.io/workflow-risk-usdc-studio/csv/mini-review-demo/";
 assert.equal((sitemap.match(/mini-review-demo\//g)||[]).length,1);
 assert.ok(sitemap.includes("<loc>"+url+"</loc>"));
 assert.ok(html.includes('<link rel="canonical" href="'+url+'">'));
 assert.ok(!html.includes("schema.org/Review") && !html.includes("AggregateRating"));
});
