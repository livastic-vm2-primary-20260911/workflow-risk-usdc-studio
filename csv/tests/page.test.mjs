import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MERCHANT_URL,PRICE,CHAIN,USDC,SELLER} from "../pay.mjs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const src=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
const local=readFileSync(new URL("../local.mjs",import.meta.url),"utf8");
const catalog=JSON.parse(readFileSync(new URL("../catalog.json",import.meta.url),"utf8"));
const sitemap=readFileSync(new URL("../../sitemap.xml",import.meta.url),"utf8");
const home=readFileSync(new URL("../../index.html",import.meta.url),"utf8");
test("CSV page declares canonical HTTPS public address",()=>{
  assert.ok(html.includes('rel="canonical" href="https://livastic-vm2-primary-20260911.github.io/workflow-risk-usdc-studio/csv/"'));
});
test("CSV HTML public navigation links to parent service",()=>{
  assert.ok(html.includes('href="../"'));
  assert.ok(home.includes('href="./csv/"'));
});
test("CSV page exposes all wired input and action IDs",()=>{
  for(const id of ["csv-input","csv-file","csv-limits","expected-columns","example","local",
    "consent","quote","connect","wallet-address","pay","status","report","download"]){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
});
test("CSV CSP permits only same-origin scripts and known original merchant calls",()=>{
  const csp=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
  assert.ok(csp?.includes("default-src 'none'"));
  assert.ok(csp.includes("script-src 'self'"));
  assert.ok(csp.includes("connect-src https://vm5-openapi-x402.onrender.com"));
  assert.ok(csp.includes("form-action 'none'"));
  assert.ok(!csp.includes("unsafe-inline"));
});
test("CSV HTML does not import third-party script bundles",()=>{
  const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(v=>v[1]);
  assert.deepEqual(scripts,["./app.mjs?v=20261021-csv-private-quote"]);
});
test("CSV page always offers on-device scan separate from paid quote",()=>{
  assert.ok(html.includes('Scan CSV locally — FREE'));
  assert.ok(html.includes('Inspect unsigned 0.005 USDC quote'));
  assert.ok(html.includes('Authorize 0.005 USDC'));
});
test("CSV default wallet purchase button disabled",()=>{
  assert.ok(html.includes('<button id="pay" disabled'));
});
test("CSV app pure local scanner has no HTTP call",()=>{
  assert.ok(!local.includes("fetch("));
  assert.ok(!local.includes("XMLHttpRequest"));
  assert.ok(!local.includes("ethereum"));
  assert.ok(!local.includes("eth_sendTransaction"));
});
test("CSV app only has one real paid network destination",()=>{
  assert.ok(src.includes('await fetch(MERCHANT_URL'));
  assert.ok(!src.includes("location.replace("));
  assert.ok(!src.includes("sendTransaction"));
});
test("signed attempt latch exists before paid fetch",()=>{
  assert.ok(src.indexOf("signedAttempt=true;") > 0);
  assert.ok(src.indexOf("signedAttempt=true;") < src.indexOf("const r=await fetch(MERCHANT_URL,{"));
});
test("main sitemap includes the CSV subpage",()=>{
  assert.ok(sitemap.includes("workflow-risk-usdc-studio/csv/"));
  assert.ok(sitemap.includes("workflow-risk-usdc-studio/"));
});
test("CSV catalog tracks fixed firstparty native Circle Base USDC quote",()=>{
  assert.equal(catalog.merchant.resource,MERCHANT_URL);
  assert.equal(catalog.merchant.amountAtomic,PRICE);
  assert.equal(catalog.merchant.asset,USDC);
  assert.equal(catalog.merchant.payTo,SELLER);
  assert.equal(catalog.merchant.network,CHAIN);
});
test("free CSV local offer cannot claim payment or upload",()=>{
  assert.equal(catalog.free.noUpload,true);
  assert.equal(catalog.free.noCharge,true);
  assert.equal(catalog.free.noWallet,true);
  assert.equal(catalog.newOutsideBuyerReceiptsClaimed,0);
  assert.equal(catalog.realPaidBuyerEndToEndVerified,false);
});
test("CSV page merchant is the existing one owner VM5",()=>{
  assert.ok(html.includes("same beneficial owner"));
  assert.ok(html.includes("VM5 merchant"));
});
