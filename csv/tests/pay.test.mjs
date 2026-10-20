import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  MERCHANT_URL,FREE_SAMPLE_URL,PRICE,USDC,SELLER,CHAIN,CHAIN_HEX,
  MAX_INPUT_BYTES,validateInput,verifyChallenge,decodeHeader,
  payloadDigest,paymentAuthorization,buildPaymentHeader,verifyFreeSample,
  parseSettlement
} from "../pay.mjs";

const payer="0x1111111111111111111111111111111111111111";
const other="0x2222222222222222222222222222222222222222";
const fakeSig="0x"+"a".repeat(130);
const fakeTx="0x"+"b".repeat(64);
const nonce=new Uint8Array(Array.from({length:32},(_,i)=>i));
const b64=v=>btoa(JSON.stringify(v));
const chall=()=>({
  x402Version:2,
  resource:{url:MERCHANT_URL,mimeType:"application/json",
    description:"Nonsecret buyer-supplied CSV static QA"},
  accepts:[{
    scheme:"exact",network:CHAIN,amount:PRICE,asset:USDC,payTo:SELLER,
    maxTimeoutSeconds:300,extra:{name:"USD Coin",version:"2"}
  }],
  extensions:{
    bazaar:{
      info:{input:{type:"http",method:"POST",bodyType:"json",
        body:{csvText:"a,b\n1,2",expectedColumns:["a","b"]}},
        output:{type:"json",example:{dataRows:1}}},
      schema:{type:"object",properties:{input:{type:"object"},output:{type:"object"}}}
    }
  }
});
const mutate=fn=>{const c=chall();fn(c);return c;};
test("CSV paid endpoint and price are pinned from real VM5 402",()=>{
  assert.equal(MERCHANT_URL,"https://vm5-openapi-x402.onrender.com/v1/csv-preflight");
  assert.equal(FREE_SAMPLE_URL,"https://vm5-openapi-x402.onrender.com/v1/csv-sample");
  assert.equal(PRICE,"5000");
  assert.equal(CHAIN,"eip155:8453");
  assert.equal(CHAIN_HEX,"0x2105");
  assert.equal(MAX_INPUT_BYTES,32768);
});
test("same-owner VM5 original Base USDC address pinned",()=>{
  assert.equal(USDC.toLowerCase(),"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
  assert.equal(SELLER.toLowerCase(),"0x6b01efa0705e91a7aca54271510bf9e594717f34");
});
test("valid Bazaar-enabled CSV merchant quote accepted",()=>{
  const q=verifyChallenge(chall());
  assert.equal(q.amountAtomic,"5000");
  assert.equal(q.amountUsdc,"0.005");
  assert.equal(q.merchant,MERCHANT_URL);
});
test("unexpected host or route rejected before wallet signing",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.resource.url="https://evil.invalid/v1/csv-preflight";})),/Unexpected paid resource/);
  assert.throws(()=>verifyChallenge(mutate(c=>{c.resource.url=c.resource.url.replace("csv-preflight","csv-report");})),/Unexpected paid resource/);
});
test("x402 v1 quote refused",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.x402Version=1;})),/x402 v2/);
});
test("non-Base route rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].network="eip155:1";})),/Unsupported chain/);
});
test("unknown scheme rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].scheme="upto";})),/Unsupported chain/);
});
test("different token or payee rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].asset=other;})),/Unexpected payment token/);
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].payTo=other;})),/Unexpected payee/);
});
test("priced USDC must be EXACTLY 5000 atomic units",()=>{
  for(const bad of ["5001","4999","200000",5000,"-1","0","5000.00"]){
    assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].amount=bad;})),/Unexpected price/);
  }
});
test("ambiguous multiple payment choices rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts.push(c.accepts[0]);})),/Unexpected payment options/);
});
test("unsupported EIP3009 domain name rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].extra.name="WRONG";})),/Unsupported EIP-3009/);
});
test("unsupported transfer method rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].extra.assetTransferMethod="permit2";})),/Unsupported EIP-3009/);
});
test("short/huge/malformed expiry rejected",()=>{
  for(const value of [2,601,"300",null]){
    assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].maxTimeoutSeconds=value;})),/Unsupported payment expiry/);
  }
});
test("unknown x402 extension is not allowed despite Bazaar being allowed",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.extensions.custom="pay-more";})),/Unsupported payment extensions/);
});
test("unexpected Bazaar method not allowed",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.extensions.bazaar.info.input.method="GET";})),/Unexpected Bazaar/);
});
test("valid CSV Bazaar extension is echoed verbatim in signature header",()=>{
  const q=verifyChallenge(chall());
  const {authorization}=paymentAuthorization(q,payer,1800000000,nonce);
  const h=buildPaymentHeader(q,authorization,fakeSig);
  const parsed=decodeHeader(h);
  assert.equal(parsed.x402Version,2);
  assert.deepEqual(parsed.extensions,q.challenge.extensions);
  assert.equal(parsed.payload.authorization.value,"5000");
});
test("invalid base64 request quote fails",()=>{
  assert.throws(()=>decodeHeader("bad header!!"),/Invalid x402/);
});
test("invalid payer address fails before typing wallet action",()=>{
  assert.throws(()=>paymentAuthorization(verifyChallenge(chall()),"not-a-wallet",1800000000,nonce),/Invalid wallet address/);
});
test("nonce must be cryptographically secure 32 bytes",()=>{
  assert.throws(()=>paymentAuthorization(verifyChallenge(chall()),payer,1800000000,new Uint8Array(2)),/32-byte nonce/);
});
test("signed EIP712 amount and domain match USDC 0.005 on Base",()=>{
  const q=verifyChallenge(chall());
  const {authorization,typed}=paymentAuthorization(q,payer,1800000000,nonce);
  assert.equal(authorization.from,payer);
  assert.equal(authorization.to,SELLER);
  assert.equal(authorization.value,PRICE);
  assert.equal(typed.domain.chainId,8453);
  assert.equal(typed.domain.name,"USD Coin");
  assert.equal(typed.domain.version,"2");
  assert.equal(typed.domain.verifyingContract,USDC);
  assert.equal(typed.primaryType,"TransferWithAuthorization");
  assert.match(authorization.nonce,/^0x[a-f0-9]{64}$/);
});
test("quote must be revalidated if an object changes after preview",()=>{
  const q=verifyChallenge(chall());
  q.challenge.accepts[0].amount="200000";
  assert.throws(()=>paymentAuthorization(q,payer,1800000000,nonce),/Unexpected price/);
});
test("invalid typed-data wallet signature is refused",()=>{
  const q=verifyChallenge(chall());
  const {authorization}=paymentAuthorization(q,payer,1800000000,nonce);
  assert.throws(()=>buildPaymentHeader(q,authorization,"0x123"),/Invalid typed-data wallet signature/);
});
test("tampering with approved CSV payee or amount is rejected",()=>{
  const q=verifyChallenge(chall());
  const {authorization}=paymentAuthorization(q,payer,1800000000,nonce);
  authorization.to=other;
  assert.throws(()=>buildPaymentHeader(q,authorization,fakeSig),/Authorization mismatch/);
  authorization.to=SELLER;authorization.value="5001";
  assert.throws(()=>buildPaymentHeader(q,authorization,fakeSig),/Authorization mismatch/);
});
test("CSV input size tracks UTF-8 byte length and rejects NUL",()=>{
  assert.equal(validateInput("a,b\n1,2"),7);
  assert.throws(()=>validateInput("가".repeat(12000)),/CSV size/);
  assert.throws(()=>validateInput("a,b\nx\0y"),/NUL/);
});
test("request digest binds data AND expected column list",async()=>{
  const a=await payloadDigest("a,b\n1,2",["a","b"]);
  assert.equal(a,await payloadDigest("a,b\n1,2",["a","b"]));
  assert.notEqual(a,await payloadDigest("a,b\n1,3",["a","b"]));
  assert.notEqual(a,await payloadDigest("a,b\n1,2",["a"]));
  assert.match(a,/^[a-f0-9]{64}$/);
});
test("free public sample must be real original non-charged CSV offer",()=>{
  const sample={paid:false,kind:"original_synthetic_csv_structural_qa_offer",
    sampleCsv:"name,amount\n1,2",priceUSDC:"0.005",network:CHAIN};
  assert.equal(verifyFreeSample(sample).paid,false);
});
test("free CSV sample that claims payment is refused",()=>{
  const a={paid:true,kind:"original_synthetic_csv_structural_qa_offer",
    sampleCsv:"name,amount\n1,2",priceUSDC:"0.005",network:CHAIN};
  assert.throws(()=>verifyFreeSample(a),/Unexpected CSV sample/);
  a.paid=false;a.chargedUSDC="0.005";
  assert.throws(()=>verifyFreeSample(a),/Unexpected CSV sample/);
});
test("settlement response without transaction proof stays unverified",()=>{
  assert.equal(parseSettlement(null).confirmed,false);
  assert.equal(parseSettlement(b64({success:true,network:CHAIN})).confirmed,false);
});
test("settlement response with wrong network refused",()=>{
  assert.equal(parseSettlement(b64({success:true,network:"eip155:1",transaction:fakeTx})).confirmed,false);
});
test("synthetic correctly shaped seller response does not establish block finality",()=>{
  const r=parseSettlement(b64({success:true,network:CHAIN,transaction:fakeTx}));
  assert.equal(r.confirmed,true);
  assert.equal(r.transaction,fakeTx);
});
test("published CSV client has an explicit consent checkbox and one signing method",()=>{
  const src=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.ok(html.includes('id="consent"'));
  assert.ok(html.includes('id="local"'));
  assert.ok(html.includes('id="quote"'));
  assert.ok(html.includes('id="pay"'));
  assert.ok(src.includes("paidRequest")===false); // CSV code calls it signedAttempt.
  assert.ok(src.includes("signedAttempt=true"));
  assert.equal((src.match(/method:"eth_signTypedData_v4"/g)||[]).length,1);
  assert.equal((src.match(/"PAYMENT-SIGNATURE":encoded/g)||[]).length,1);
  assert.ok(!src.includes("localStorage"));
  assert.ok(!src.includes("sessionStorage"));
});

test("local upload selector is bounded and never auto-posts CSV",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const source=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
  assert.ok(html.includes('id="csv-file" type="file"'));
  assert.ok(html.includes('accept=".csv,text/csv"'));
  assert.ok(source.includes('selected.size > 32768'));
  assert.ok(source.includes('const content = await selected.text()'));
  assert.ok(source.includes('validateInput(content)'));
  assert.ok(!source.includes("new FormData("));
});
