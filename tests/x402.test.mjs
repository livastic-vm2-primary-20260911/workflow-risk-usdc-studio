import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MERCHANT_URL, CHAIN, CHAIN_HEX, USDC, SELLER, PRICE, MAX_INPUT_BYTES,
  validateInput, decodeHeader, verifyChallenge, payloadDigest,
  paymentAuthorization, buildPaymentHeader, parseSettlement, shortAddress
} from "../src/x402.mjs";

const addr = "0x1111111111111111111111111111111111111111";
const sign = "0x" + "a".repeat(130);
const tx = "0x" + "b".repeat(64);
const random = new Uint8Array(Array.from({length:32},(_,i)=>i));
const valid = () => ({
  x402Version:2,
  resource:{url:MERCHANT_URL,description:"Real signed report",mimeType:"application/json"},
  accepts:[{
    scheme:"exact",network:CHAIN,amount:PRICE,asset:USDC,payTo:SELLER,
    maxTimeoutSeconds:300,
    extra:{name:"USD Coin",version:"2"}
  }],
  extensions:{}
});
const mutate=(setter)=>{
  const c=valid();setter(c);return c;
};
const b64=v=>btoa(JSON.stringify(v));

test("pins the existing VM5 merchant and exact Base USDC 0.20 amount", () => {
  assert.equal(MERCHANT_URL,"https://vm5-openapi-x402.onrender.com/v1/workflow-risk");
  assert.equal(CHAIN,"eip155:8453");
  assert.equal(CHAIN_HEX,"0x2105");
  assert.equal(PRICE,"200000");
  assert.equal(USDC.toLowerCase(),"0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
  assert.equal(SELLER.toLowerCase(),"0x6b01efa0705e91a7aca54271510bf9e594717f34");
});
test("a genuine-shaped challenge is accepted", () => {
  const r=verifyChallenge(valid());
  assert.equal(r.amountUsdc,"0.20");assert.equal(r.payTo,SELLER);
});
test("unknown resource origin is refused",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.resource.url="https://evil.invalid/collect";})),/Unexpected paid resource/);
});
test("missing resource URL is refused",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{delete c.resource;})),/Unexpected paid resource/);
});
test("v1 x402 quote is rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.x402Version=1;})),/x402 v2/);
});
test("injected second payment choice is rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts.push({...c.accepts[0]});})),/Unexpected payment options/);
});
test("empty choices rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts=[];})),/Unexpected payment options/);
});
test("non-exact scheme rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].scheme="upto";})),/Unsupported chain/);
});
test("wrong network rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].network="eip155:84532";})),/Unsupported chain/);
});
test("wrong token rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].asset=addr;})),/Unexpected payment token/);
});
test("wrong payee rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].payTo=addr;})),/Unexpected payee/);
});
test("price raised by a single atomic unit is rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].amount="200001";})),/Unexpected price/);
});
test("price lowered unexpectedly is also rejected rather than accepting off-contract product",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].amount="100000";})),/Unexpected price/);
});
test("negative and invalid amount formats rejected",()=>{
  for(const amount of ["-1","200000.0",200000,undefined,"999999999"]) {
    assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].amount=amount;})),/Unexpected price/);
  }
});
test("extra settlement extensions are rejected before wallet signing",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.extensions={permit2:{spender:addr}};})),/Unsupported payment extensions/);
});
test("the existing merchant's public Bazaar discovery extension is allowed and echoed",()=>{
  const c=valid();
  c.extensions={bazaar:{
    info:{input:{type:"http",method:"POST",bodyType:"json",body:{workflowYaml:"name: synthetic public file"}},
          output:{type:"json",example:{risk:"none"}}},
    schema:{$schema:"https://json-schema.org/draft/2020-12/schema",type:"object",properties:{}}
  }};
  const quote=verifyChallenge(c);
  assert.equal(quote.payment.amount,PRICE);
  const {authorization}=paymentAuthorization(quote,addr,1800000000,random);
  const header=buildPaymentHeader(quote,authorization,sign);
  assert.deepEqual(decodeHeader(header).extensions,c.extensions);
});
test("unknown Bazaar HTTP method and malicious oversized metadata fail closed",()=>{
  const c=valid();
  c.extensions={bazaar:{
    info:{input:{type:"http",method:"GET",bodyType:"json"}},
    schema:{type:"object"}
  }};
  assert.throws(()=>verifyChallenge(c),/Unexpected Bazaar/);
  c.extensions.bazaar.info.input.method="POST";
  c.extensions.bazaar.info.input.body={pad:"x".repeat(7000)};
  assert.throws(()=>verifyChallenge(c),/Unexpected Bazaar/);
});
test("permit2 transfer method rejected",()=>{
  assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].extra.assetTransferMethod="permit2";})),/Unsupported EIP-3009/);
});
test("wrong EIP712 token name/version rejected",()=>{
  for(const key of ["name","version"]) {
    assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].extra[key]="wrong";})),/Unsupported EIP-3009/);
  }
});
test("bad or long payment timeout rejected",()=>{
  for(const t of [null,"300",0,29,601,NaN,Infinity]){
    assert.throws(()=>verifyChallenge(mutate(c=>{c.accepts[0].maxTimeoutSeconds=t;})),/Unsupported payment expiry/);
  }
});
test("case differences in genuine EVM addresses accepted",()=>{
  const c=valid();c.accepts[0].payTo=SELLER.toUpperCase().replace("0X","0x");c.accepts[0].asset=USDC.toUpperCase().replace("0X","0x");
  assert.equal(verifyChallenge(c).amountAtomic,"200000");
});
test("invalid JSON header rejected",()=>assert.throws(()=>decodeHeader(btoa("not json")),/Unparseable/));
test("oversized base64 header rejected",()=>assert.throws(()=>decodeHeader("A".repeat(16000)),/oversized/));
test("non-base64 header rejected",()=>assert.throws(()=>decodeHeader("!invalid x402 header!"),/Invalid x402/));
test("normal header decoder roundtrips merchant quote",()=>{
  assert.equal(decodeHeader(b64(valid())).x402Version,2);
});
test("tiny workflow and empty workflow rejected",()=>{
  for(const s of ["", "hi", "123456789"]) assert.throws(()=>validateInput(s),/10–48,000/);
});
test("maximum allowed byte count accepted",()=>assert.equal(validateInput("x".repeat(MAX_INPUT_BYTES)),MAX_INPUT_BYTES));
test("oversized UTF-8 bytes rejected even if JS string length is small",()=>{
  assert.throws(()=>validateInput("고".repeat(17000)),/10–48,000/);
});
test("NUL workflow input refused",()=>assert.throws(()=>validateInput("some valid\0 yaml"),/NUL bytes/));
test("non-string workflow refused",()=>assert.throws(()=>validateInput({a:1}),/must be text/));
test("input digest stable for identical JSON request",async()=>{
  const a=await payloadDigest("name: release job", "x.yml",true);
  const b=await payloadDigest("name: release job", "x.yml",true);
  assert.equal(a,b);
  assert.match(a,/^[a-f0-9]{64}$/);
});
test("input digest detects content modifications",async()=>{
  assert.notEqual(await payloadDigest("name: release job","x.yml",true),
                  await payloadDigest("name: build  job","x.yml",true));
});
test("input digest binds filename and SARIF option",async()=>{
  const x=await payloadDigest("name: release job","a.yml",true);
  assert.notEqual(x,await payloadDigest("name: release job","b.yml",true));
  assert.notEqual(x,await payloadDigest("name: release job","a.yml",false));
});
test("authorization is exact amount and payee with bounded lifetime",()=>{
  const q=verifyChallenge(valid());
  const {authorization,typed}=paymentAuthorization(q,addr,1800000000,random);
  assert.equal(authorization.from,addr);
  assert.equal(authorization.to,SELLER);
  assert.equal(authorization.value,PRICE);
  assert.equal(authorization.validAfter,"1799999940");
  assert.equal(authorization.validBefore,"1800000295");
  assert.match(authorization.nonce,/^0x[0-9a-f]{64}$/);
  assert.equal(typed.domain.verifyingContract,USDC);
  assert.equal(typed.domain.chainId,8453);
  assert.equal(typed.domain.name,"USD Coin");
  assert.equal(typed.domain.version,"2");
  assert.equal(typed.primaryType,"TransferWithAuthorization");
  assert.equal(typed.message.to,SELLER);
  assert.equal(typed.message.value,PRICE);
});
test("authorization rejects invalid payer address",()=>{
  assert.throws(()=>paymentAuthorization(verifyChallenge(valid()), "no-wallet",1800000000,random),/Invalid wallet address/);
});
test("authorization rejects weak nonce",()=>{
  assert.throws(()=>paymentAuthorization(verifyChallenge(valid()),addr,1800000000,new Uint8Array(5)),/32-byte nonce/);
});
test("authorization rejects invalid time",()=>{
  assert.throws(()=>paymentAuthorization(verifyChallenge(valid()),addr,1,random),/Invalid local time/);
});
test("authorization rechecks mutated quote rather than signing",()=>{
  const q=verifyChallenge(valid());
  q.challenge.accepts[0].amount="999999";
  assert.throws(()=>paymentAuthorization(q,addr,1800000000,random),/Unexpected price/);
});
test("payment header is x402 v2 base64 with bounded EIP3009",()=>{
  const q=verifyChallenge(valid());
  const {authorization}=paymentAuthorization(q,addr,1800000000,random);
  const header=buildPaymentHeader(q,authorization,sign);
  const out=decodeHeader(header);
  assert.equal(out.x402Version,2);
  assert.equal(out.accepted.amount,PRICE);
  assert.equal(out.payload.signature,sign);
  assert.equal(out.payload.authorization.to,SELLER);
  assert.equal(out.payload.authorization.value,PRICE);
  assert.deepEqual(out.extensions,{});
});
test("bad signature length rejected",()=>{
  const q=verifyChallenge(valid());
  const {authorization}=paymentAuthorization(q,addr,1800000000,random);
  assert.throws(()=>buildPaymentHeader(q,authorization,"0x123"),/Invalid typed-data wallet signature/);
});
test("tampered payee is rejected before send",()=>{
  const q=verifyChallenge(valid());
  const {authorization}=paymentAuthorization(q,addr,1800000000,random);
  authorization.to=addr;
  assert.throws(()=>buildPaymentHeader(q,authorization,sign),/Authorization mismatch/);
});
test("tampered authorization amount is rejected before send",()=>{
  const q=verifyChallenge(valid());
  const {authorization}=paymentAuthorization(q,addr,1800000000,random);
  authorization.value="200001";
  assert.throws(()=>buildPaymentHeader(q,authorization,sign),/Authorization mismatch/);
});
test("tampered nonce is rejected",()=>{
  const q=verifyChallenge(valid());
  const {authorization}=paymentAuthorization(q,addr,1800000000,random);
  authorization.nonce="0x000";
  assert.throws(()=>buildPaymentHeader(q,authorization,sign),/Authorization mismatch/);
});
test("settlement does not report success if header absent",()=>{
  assert.equal(parseSettlement(null).confirmed,false);
});
test("settlement doesn't count success without transaction hash",()=>{
  assert.equal(parseSettlement(b64({success:true,network:CHAIN})).confirmed,false);
});
test("settlement doesn't count wrong chain or failure",()=>{
  assert.equal(parseSettlement(b64({success:true,transaction:tx,network:"eip155:1"})).confirmed,false);
  assert.equal(parseSettlement(b64({success:false,transaction:tx,network:CHAIN})).confirmed,false);
});
test("properly formatted response claims success but not block finality",()=>{
  const p=parseSettlement(b64({success:true,network:CHAIN,transaction:tx}));
  assert.equal(p.confirmed,true);assert.equal(p.transaction,tx);
});
test("short payer/payee label obscures middle only",()=>{
  assert.equal(shortAddress(SELLER),"0x6b01ef…717f34");
});
