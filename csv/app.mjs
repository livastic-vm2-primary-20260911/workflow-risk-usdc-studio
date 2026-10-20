import {inspectCSV, parseExpectedColumns} from "./local.mjs?v=20261020-csvlaunch";
import {
  MERCHANT_URL, CHAIN_HEX, PRICE, SELLER, USDC,
  validateInput, SYNTHETIC_QUOTE_BODY, decodeHeader, verifyChallenge, payloadDigest,
  paymentAuthorization, buildPaymentHeader, parseSettlement, shortAddress
} from "./pay.mjs?v=20261021-csv-private-quote";

const el = id => document.getElementById(id);
const text = el("csv-input");
const columns = el("expected-columns");
const result = el("report");
const status = el("status");
const quoteButton = el("quote");
const payButton = el("pay");
const connect = el("connect");
const download = el("download");
const scan = el("local");
const synthetic = [
  "email,amount,date",
  "a@example.org,12.5,2026-10-20",
  "a@example.org,12.5,2026-10-20",
  "bad@example.org,=SUM(A1:A5),",
  "b@example.org,24,2026-10-21",
].join("\n");

let quote = null, quoteTime = 0, quoteDigest = null;
let wallet = null, signedAttempt = false;
let output = null, outputKind = null;

const reportStatus = (msg,kind = "") => {
  status.textContent = msg;
  status.dataset.kind = kind;
};
function invalidate() {
  quote = null; quoteTime = 0; quoteDigest = null;
  payButton.disabled = true;
  result.textContent = "No report yet.";
  output = null; outputKind = null; download.hidden = true;
  if(!signedAttempt) reportStatus("Input changed. Local scanning is free. Check a fresh unsigned quote before paying.");
}
text.addEventListener("input",invalidate);
columns.addEventListener("input",invalidate);
el("example").addEventListener("click",()=>{
  text.value = synthetic; columns.value = "email,amount,date"; invalidate();
});
el("csv-file").addEventListener("change", async (event)=>{
  if (signedAttempt) {
    reportStatus("A signed payment may be outstanding; do not load new input until you reconcile payment.", "warning");
    event.target.value = "";
    return;
  }
  const selected = event.target.files?.[0];
  if(!selected) return;
  try {
    if(selected.size > 32768 || selected.size < 3)
      throw new Error("Choose a CSV file between 3 and 32,768 bytes.");
    const content = await selected.text();
    validateInput(content);
    text.value = content;
    columns.value = "";
    invalidate();
    reportStatus("Loaded "+selected.size+"-byte CSV file LOCALLY. No upload. Click Scan CSV locally to analyze for free.","ready");
  } catch(e) {
    reportStatus("Local file read rejected: "+String(e?.message||e).slice(0,210)+". No upload or payment.","warning");
  } finally {
    event.target.value = "";
  }
});
function ownInput(){
  const csvText=text.value;
  validateInput(csvText);
  const expectedColumns=parseExpectedColumns(columns.value);
  return {csvText,expectedColumns};
}
function showReport(obj,kind) {
  output = JSON.stringify(obj,null,2);
  outputKind = kind;
  result.textContent = output.slice(0,200000);
  download.textContent = kind === "LOCAL" ? "Download FREE local report" : "Download paid report";
  download.hidden = false;
}

scan.addEventListener("click",()=>{
  if (signedAttempt) {
    reportStatus("A signed payment may be outstanding; reconcile the request before another action.", "warning");
    return;
  }
  try {
    const b = ownInput();
    quote = null; quoteTime = 0; quoteDigest = null; payButton.disabled = true;
    const report=inspectCSV(b.csvText,b.expectedColumns);
    showReport(report,"LOCAL");
    reportStatus("FREE LOCAL preview: " + report.dataRows + " data rows, " +
      report.headerColumns + " columns. Uploaded=false, chargedUSDC=0. No wallet or merchant API call.", "ready");
  } catch(e) {
    reportStatus("Local CSV inspection: "+String(e?.message || e).slice(0,240), "warning");
  }
});
const requestBody = data => ({
  method:"POST",mode:"cors",cache:"no-store",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify(data)
});
quoteButton.addEventListener("click",async()=>{
  if(signedAttempt)return;
  quoteButton.disabled=true;payButton.disabled=true;
  try {
    const data=ownInput();
    reportStatus("Requesting an unsigned price using ONLY a fixed public FICTIONAL CSV. Your CSV stays on your device: NO wallet signature or charge.");
    const r=await fetch(MERCHANT_URL,requestBody(SYNTHETIC_QUOTE_BODY));
    if(r.status!==402) {
      reportStatus("Merchant HTTP "+r.status+". No valid payment quote; file may be invalid. No charge.", "warning");
      return;
    }
    const verified=verifyChallenge(decodeHeader(r.headers.get("PAYMENT-REQUIRED")));
    quote=verified;quoteTime=Date.now();
    quoteDigest=await payloadDigest(data.csvText,data.expectedColumns);
    payButton.disabled=!wallet;
    reportStatus("LIVE x402 quote verified using a synthetic CSV (your data was NOT uploaded): exactly 0.005 Circle Base USDC; seller "+
      shortAddress(SELLER)+". This is PRICE DISCOVERY, not a payment. Connect an authorized Base wallet only if you want to buy.", "ready");
  } catch(e) {
    reportStatus("Unsigned CSV quote failed: "+String(e?.message || e).slice(0,240)+". No charge.", "warning");
  } finally { quoteButton.disabled=false; }
});
connect.addEventListener("click",async()=>{
  try {
    if (!window.ethereum || typeof window.ethereum.request!=="function") {
      throw new Error("Use a compatible injected EVM wallet extension; never paste a recovery phrase.");
    }
    const accounts=await window.ethereum.request({method:"eth_requestAccounts"});
    if (!Array.isArray(accounts) || !/^0x[a-fA-F0-9]{40}$/.test(accounts[0]||"")) {
      throw new Error("No EVM account returned");
    }
    const chain=await window.ethereum.request({method:"eth_chainId"});
    if (String(chain).toLowerCase()!==CHAIN_HEX)
      throw new Error("Switch the wallet manually to Base Mainnet (8453) before connecting again.");
    wallet=accounts[0];
    el("wallet-address").textContent="Connected: "+shortAddress(wallet);
    payButton.disabled=!quote||signedAttempt;
    reportStatus("Wallet connected. No USDC authorization or payment has occurred.");
  } catch(e){
    wallet=null;payButton.disabled=true;
    reportStatus("Wallet connection: "+String(e?.message||e).slice(0,220),"warning");
  }
});
window.ethereum?.on?.("accountsChanged",()=>{
  wallet=null;payButton.disabled=true;
  el("wallet-address").textContent="Wallet changed; reconnect before paying.";
});
window.ethereum?.on?.("chainChanged",()=>{
  wallet=null;payButton.disabled=true;
  el("wallet-address").textContent="Network changed; reconnect on Base before paying.";
});
payButton.addEventListener("click",async()=>{
  if (signedAttempt) return;
  payButton.disabled=true;quoteButton.disabled=true;
  let didSign=false;
  try {
    if(!wallet||!quote)throw new Error("Verified live 402 quote and connected Base wallet required.");
    if(Date.now()-quoteTime>=180000)throw new Error("Quote is stale; inspect an unsigned quote again.");
    const accounts=await window.ethereum.request({method:"eth_accounts"});
    const chain=await window.ethereum.request({method:"eth_chainId"});
    if(String(chain).toLowerCase()!==CHAIN_HEX ||
       !Array.isArray(accounts) || accounts[0]?.toLowerCase()!==wallet.toLowerCase())
      throw new Error("Wallet or Base chain changed.");
    const data=ownInput();
    if(!el("consent").checked)throw new Error("Upload consent was withdrawn.");
    if(quoteDigest!==await payloadDigest(data.csvText,data.expectedColumns))
      throw new Error("CSV changed since price discovery; refuse stale authorization.");
    verifyChallenge(quote.challenge);
    if(quote.payment.amount!==PRICE || quote.payment.payTo.toLowerCase()!==SELLER.toLowerCase())
      throw new Error("Price or payee changed.");
    reportStatus("Please review ONE 0.005 USDC EIP-3009 wallet signature, exact seller and Base network. No unlimited allowance.","warning");
    const nonce=new Uint8Array(32);crypto.getRandomValues(nonce);
    const {authorization,typed}=paymentAuthorization(quote,wallet,Math.floor(Date.now()/1000),nonce);
    const signature=await window.ethereum.request({
      method:"eth_signTypedData_v4",params:[wallet,JSON.stringify(typed)]
    });
    didSign=true;
    const encoded=buildPaymentHeader(quote,authorization,signature);
    signedAttempt=true; // NEVER auto-retry once a signed payload is sent.
    reportStatus("ONE authorized CSV report POST is in progress. Do not retry a potentially settled payment.","warning");
    const r=await fetch(MERCHANT_URL,{
      ...requestBody(data),
      headers:{"Content-Type":"application/json","PAYMENT-SIGNATURE":encoded}
    });
    if(!r.ok) {
      reportStatus("Paid request HTTP "+r.status+
        " with uncertain settlement. DO NOT RETRY until you verify the merchant record.","warning");
      return;
    }
    const body=await r.text();
    if(body.length>200000)throw new Error("Report is unexpectedly large");
    const obj=JSON.parse(body);
    showReport(obj,"PAID");
    let payResult;
    try {payResult=parseSettlement(r.headers.get("PAYMENT-RESPONSE"));}
    catch {payResult={confirmed:false,reason:"Malformed settlement header"};}
    if(payResult.confirmed) {
      reportStatus("CSV report delivered. Merchant settlement response claims transaction "+
        payResult.transaction+". Independently confirm chain finality.","success");
    } else {
      reportStatus("CSV report was returned; token settlement was NOT independently verified ("+
        payResult.reason+"). Do not repeat payment.","warning");
    }
  } catch(e){
    reportStatus("Payment flow stopped: "+String(e?.message||e).slice(0,230)+
      (didSign?". A signature may be outstanding: no retry.":". No signed request sent."),"warning");
  } finally {
    payButton.disabled=true;
    quoteButton.disabled=signedAttempt||didSign;
  }
});
download.addEventListener("click",()=>{
  if(!output)return;
  const blob=new Blob([output],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=outputKind==="LOCAL"
    ?"csv-preflight-FREE-LOCAL-example.json":"csv-preflight-PAID-report.json";
  a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
reportStatus("Your free CSV scan stays in this browser. Paid analysis requires separate explicit opt-in and a 0.005 Base USDC wallet signature.");
