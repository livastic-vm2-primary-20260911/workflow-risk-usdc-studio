import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {SYNTHETIC_QUOTE_BODY,MERCHANT_URL,CHAIN,PRICE,USDC,SELLER,validateInput} from "../pay.mjs";

test("CSV unsigned quote is immutable synthetic only with no buyer data",()=>{
  assert.ok(Object.isFrozen(SYNTHETIC_QUOTE_BODY));
  assert.ok(Object.isFrozen(SYNTHETIC_QUOTE_BODY.expectedColumns));
  assert.ok(validateInput(SYNTHETIC_QUOTE_BODY.csvText)>20);
  assert.deepEqual(SYNTHETIC_QUOTE_BODY.expectedColumns,["email","amount","date"]);
  assert.ok(!/private|secret|credential|api.?key/i.test(JSON.stringify(SYNTHETIC_QUOTE_BODY)));
});

test("CSV quote does not leak buyer CSV when upload consent is unchecked",async()=>{
  const ids=["csv-input","expected-columns","report","status","quote","pay",
    "connect","download","local","example","csv-file","wallet-address","consent"];
  const nodes=new Map(ids.map(id=>[id,{
    id,listeners:{},dataset:{},value:"",checked:false,disabled:false,hidden:false,
    textContent:"",addEventListener(kind,handler){this.listeners[kind]=handler;}
  }]));
  const buyerCsv="email,amount\nPRIVATE_BUYER_CSV_NOT_UPLOAD_6b220a,330.92";
  nodes.get("csv-input").value=buyerCsv;
  nodes.get("expected-columns").value="email,amount";
  nodes.get("consent").checked=false;
  const challenge={
    x402Version:2,
    resource:{url:MERCHANT_URL,description:"CSV structural preflight",mimeType:"application/json"},
    accepts:[{scheme:"exact",network:CHAIN,asset:USDC,amount:PRICE,payTo:SELLER,
      maxTimeoutSeconds:300,extra:{name:"USD Coin",version:"2"}}],
    extensions:{}
  };
  const old={document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch};
  const sent=[];
  try {
    globalThis.document={getElementById:(id)=>nodes.get(id)};
    globalThis.window={};
    globalThis.fetch=async(url,options)=>{
      sent.push({url,options});
      return {status:402,headers:new Headers({"PAYMENT-REQUIRED":btoa(JSON.stringify(challenge))})};
    };
    await import("../app.mjs?test-csv-private-quote=20261021");
    await nodes.get("quote").listeners.click();
    assert.equal(sent.length,1);
    assert.equal(sent[0].url,MERCHANT_URL);
    assert.deepEqual(JSON.parse(sent[0].options.body),SYNTHETIC_QUOTE_BODY);
    assert.ok(!JSON.stringify(sent).includes("PRIVATE_BUYER_CSV_NOT_UPLOAD_6b220a"));
    assert.equal(sent[0].options.headers["PAYMENT-SIGNATURE"],undefined);
    assert.match(nodes.get("status").textContent,/data was NOT uploaded/);
    assert.equal(nodes.get("pay").disabled,true);
  } finally {
    for(const [k,v] of Object.entries(old)){
      if(v===undefined)delete globalThis[k];
      else globalThis[k]=v;
    }
  }
});

test("public CSV page and catalog disclose free synthetic price flow",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const js=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
  const catalog=JSON.parse(readFileSync(new URL("../catalog.json",import.meta.url),"utf8"));
  assert.ok(html.includes("quote uses a fixed public synthetic example"));
  assert.ok(html.includes("ONLY if I separately authorize"));
  assert.ok(js.includes('requestBody(SYNTHETIC_QUOTE_BODY)'));
  assert.ok(js.includes('if(!el("consent").checked)throw')); // paid path still gated
  assert.equal(catalog.quoteRequest.usesBuyerCsv,false);
  assert.equal(catalog.quoteRequest.buyerCsvSentOnlyAfterAuthorizedPaidRequest,true);
});
