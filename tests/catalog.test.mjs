import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MERCHANT_URL, FREE_SAMPLE_URL, PRICE, SELLER, USDC, CHAIN, MAX_INPUT_BYTES} from "../src/x402.mjs";

const c=JSON.parse(readFileSync(new URL("../catalog.json",import.meta.url),"utf8"));
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const llms=readFileSync(new URL("../llms.txt",import.meta.url),"utf8");
test("catalog routes all paid calls to the existing same-owner VM5 origin",()=>{
  assert.equal(c.merchant.resourceUrl,MERCHANT_URL);
  assert.equal(c.merchant.method,"POST");
  assert.equal(c.merchant.origin,new URL(MERCHANT_URL).origin);
});
test("catalog price asset network and payee exactly match pinned client",()=>{
  assert.equal(c.merchant.amountAtomic,PRICE);
  assert.equal(c.merchant.asset,USDC);
  assert.equal(c.merchant.network,CHAIN);
  assert.equal(c.merchant.payTo,SELLER);
  assert.equal(c.merchant.displayPrice,"0.20 USDC");
});
test("catalog is not a fake separate merchant or buyer",()=>{
  assert.equal(c.provenance.oneHumanOwnerAcrossVm2AndVm5,true);
  assert.equal(c.provenance.originalServiceAlreadyExisted,true);
  assert.equal(c.provenance.noNewPaidCustomersClaimedAtLaunch,true);
  assert.equal(c.provenance.noRealBuyerSignedEndToEndTestClaimed,true);
});
test("catalog cannot promote a payment without actual merchant signed result",()=>{
  assert.equal(c.merchant.paymentProtocol,"x402-v2");
  assert.equal(c.merchant.paymentScheme,"exact");
  assert.ok(c.warnings.some(x=>x.includes("HTTP 402 is not proof")));
});
test("catalog example is bounded and does not carry a key",()=>{
  assert.equal(c.request.maxWorkflowUtf8Bytes,MAX_INPUT_BYTES);
  assert.ok(c.request.required.includes("workflowYaml"));
  assert.ok(!/privateKey|mnemonic|secretKey|signingKey/.test(JSON.stringify(c.request.example)));
});
test("public page exposes a first-party free report example",()=>{
  assert.equal(c.freePublicSyntheticExample,FREE_SAMPLE_URL);
  assert.ok(html.includes(c.freePublicSyntheticExample));
  assert.ok(html.includes("See the free, fictional report sample"));
  assert.ok(html.includes('id="free-preview"'));
});
test("llms.txt points agents to actual paid URL and token",()=>{
  assert.ok(llms.includes(MERCHANT_URL));
  assert.ok(llms.includes(CHAIN));
  assert.ok(llms.includes("0.20 native Circle USDC"));
  assert.ok(llms.includes(SELLER));
});
test("llms.txt explicitly excludes private keys and bought receipts",()=>{
  assert.ok(llms.includes("Never put a"));
  assert.ok(llms.includes("new outside buyer sale is claimed"));
});
