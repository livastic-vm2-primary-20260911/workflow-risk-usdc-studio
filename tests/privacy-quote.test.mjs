import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  SYNTHETIC_QUOTE_BODY, MERCHANT_URL, CHAIN, PRICE, SELLER, USDC,
  validateInput
} from "../src/x402.mjs";

test("fixed synthetic price probe is independent of any buyer workflow", () => {
  assert.equal(SYNTHETIC_QUOTE_BODY.filename,"synthetic-price-probe.yml");
  assert.ok(validateInput(SYNTHETIC_QUOTE_BODY.workflowYaml)>10);
  assert.equal(SYNTHETIC_QUOTE_BODY.includeSarif,true);
  assert.ok(Object.isFrozen(SYNTHETIC_QUOTE_BODY));
  assert.ok(!/wallet|password|private.?key|secret|token:|credential/i.test(
    JSON.stringify(SYNTHETIC_QUOTE_BODY)));
});

test("live unsigned quote event NEVER transmits buyer YAML and requires no upload consent", async () => {
  const ids=["status","workflow","filename","sarif","report","pay","quote",
    "connect","download","free-preview","example","count","wallet-address","consent"];
  const nodes=new Map(ids.map(id=>[id,{
    id, listeners:{}, dataset:{}, value:"", textContent:"", disabled:false,
    hidden:false, checked:false,
    addEventListener(evt,fn){this.listeners[evt]=fn}
  }]));
  const buyerText=[
    "name: PRIVATE_OWNER_ONLY_DO_NOT_UPLOAD",
    "on: pull_request",
    "jobs:",
    "  private:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - run: echo SECRET_MARKER_NOT_SHARED_91fd2e"
  ].join("\n");
  nodes.get("workflow").value=buyerText;
  nodes.get("filename").value="private-nonsecret.yml";
  nodes.get("sarif").checked=true;
  nodes.get("consent").checked=false;  // PRICE ONLY; upload permission has not been given.
  const challenge={
    x402Version:2,
    resource:{url:MERCHANT_URL,description:"Workflow static scan",mimeType:"application/json"},
    accepts:[{scheme:"exact",network:CHAIN,asset:USDC,amount:PRICE,payTo:SELLER,
      maxTimeoutSeconds:300,extra:{name:"USD Coin",version:"2"}}],
    extensions:{}
  };
  const seen=[];
  const old={document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch};
  try {
    globalThis.document={getElementById:id=>nodes.get(id)};
    globalThis.window={};
    globalThis.fetch=async(url,opts)=>{
      seen.push({url,opts});
      return {status:402,headers:new Headers({"PAYMENT-REQUIRED":btoa(JSON.stringify(challenge))})};
    };
    await import("../src/app.mjs?test-price-privacy=20261021");
    await nodes.get("quote").listeners.click();
    assert.equal(seen.length,1);
    assert.equal(seen[0].url,MERCHANT_URL);
    const request=JSON.parse(seen[0].opts.body);
    assert.deepEqual(request,SYNTHETIC_QUOTE_BODY);
    assert.equal(seen[0].opts.headers["PAYMENT-SIGNATURE"],undefined);
    assert.ok(!JSON.stringify(seen).includes("SECRET_MARKER_NOT_SHARED_91fd2e"));
    assert.ok(!JSON.stringify(seen).includes("PRIVATE_OWNER_ONLY_DO_NOT_UPLOAD"));
    assert.match(nodes.get("status").textContent,/YAML was NOT uploaded/);
    assert.equal(nodes.get("pay").disabled,true); // no connected wallet
  } finally {
    for(const [key,val] of Object.entries(old)){
      if(val===undefined) delete globalThis[key];
      else globalThis[key]=val;
    }
  }
});

test("published page and catalog tell buyers actual prepayment data flow",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const code=readFileSync(new URL("../src/app.mjs",import.meta.url),"utf8");
  const catalog=JSON.parse(readFileSync(new URL("../catalog.json",import.meta.url),"utf8"));
  assert.match(html,/NEVER your YAML/);
  assert.match(html,/uploaded to VM5 ONLY if I separately authorize/);
  assert.match(code,/fetch\(MERCHANT_URL, request\(SYNTHETIC_QUOTE_BODY\)\)/);
  assert.match(code,/const b = body\(\);/); // actual data only in paid execution
  assert.equal(catalog.quoteRequest.usesBuyerWorkflow,false);
  assert.equal(catalog.quoteRequest.usesSyntheticPublicExample,true);
  assert.equal(catalog.provenance.prePaymentQuoteSendsSyntheticOnly,true);
});
