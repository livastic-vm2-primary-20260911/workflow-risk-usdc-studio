import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = p => readFileSync(new URL("../"+p, import.meta.url),"utf8");
const child=read("narrative/index.html");
const parent=read("index.html");
const source=read("README.md");
const catalog=JSON.parse(read("catalog.json"));
const quote="https://hashn.com/store/886ed287-aaca-434b-9f27-560a50bfbbb6/listings/koinly-csv-one-source-mapping-mini-review-5usdc.md";
const contact="https://docs.google.com/forms/d/e/1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g/viewform";

test("single same-owner VM1 original small buyer offer is linked once from both VM2 free pages",()=>{
 for(const page of [child,parent]){
  assert.equal(page.split(quote).length-1,1);
  assert.ok(page.includes("5"),"explicit small price visible");
  assert.ok(page.includes("10"),"no more than ten redacted rows");
  const at=page.indexOf('href="'+quote+'"');
  const tag=page.slice(page.lastIndexOf("<a",at),page.indexOf(">",at)+1);
  assert.match(tag,/rel="noopener noreferrer"/);
  assert.match(tag,/target="_blank"/);
 }
});

test("free-first conversion cannot be described as instant paid checkout or escrow",()=>{
 assert.match(child,/HashN is <strong>an agent contact directory, not an instant checkout or escrow<\/strong>/);
 assert.match(parent,/HashN handles agent contact only—no escrow, no checkout/);
 assert.match(child,/No buyer order is claimed/);
 assert.match(parent,/no paid customer is claimed/);
 assert.match(child,/written scope\/payment\/refund/);
});

test("small 5 native Circle BaseUSDC and larger 49 nonbinding proposal cannot be collapsed",()=>{
 assert.ok(child.includes("5 Base Circle USDC"));
 assert.ok(child.includes("nonbinding 49 Base Circle USDC"));
 assert.ok(child.includes(contact));
 assert.ok(child.includes("up to 50"));
 const offers=catalog.freeNarrativeInspector.relatedSameOwnerOptionalManualReviewOffers;
 assert.equal(offers.length,2);
 assert.equal(offers[0].advertisedPriceNativeCircleBaseUSDC,"5");
 assert.equal(offers[0].maximumBuyerAuthorizedDeidentifiedRows,10);
 assert.equal(offers[0].hashnNoEscrowNoCheckout,true);
 assert.equal(offers[1].advertisedPriceNativeCircleBaseUSDC,"49");
 assert.equal(offers[1].maximumBuyerAuthorizedDeidentifiedRows,50);
 assert.equal(offers[1].offerStatus,"nonbinding_proposed_scope_not_an_instant_payment");
 assert.ok(offers.every(o=>o.independentOrdersVerified===0&&o.requiresSeparateWrittenScope===true));
});

test("original API x402 merchant remains distinct and no wallet signing is added",()=>{
 assert.ok(parent.includes("0.005"));
 assert.ok(parent.includes("vm5-openapi-x402.onrender.com/openapi.json"));
 assert.equal(catalog.freeNarrativeInspector.priceUSDC,"0");
 assert.equal(catalog.freeNarrativeInspector.noWallet,true);
 assert.equal(catalog.freeNarrativeInspector.noUpload,true);
 assert.match(child,/connect-src 'none'/);
 assert.ok(!child.includes("eth_signTypedData_v4"));
 assert.ok(!child.includes("window.ethereum"));
});

test("original free tool and manual offer are truthful; README maintains no accepted orders",()=>{
 assert.match(source,/HashN offers neither an automatic checkout nor escrow/);
 assert.match(source,/No purchase, buyer or actual transfer/);
 assert.match(child,/neither paid offer is tax advice or importer acceptance certification/);
 assert.match(parent,/Try narrative inspector — FREE/);
});
