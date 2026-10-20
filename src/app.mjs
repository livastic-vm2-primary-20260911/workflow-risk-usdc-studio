import {
  MERCHANT_URL, FREE_SAMPLE_URL, CHAIN_HEX, PRICE, SELLER, USDC, MAX_INPUT_BYTES,
  validateInput, decodeHeader, verifyChallenge, verifyFreeSample, payloadDigest,
  paymentAuthorization, buildPaymentHeader, parseSettlement, shortAddress
} from "./x402.mjs?v=20261020-freesample";

const el = id => document.getElementById(id);
const status = el("status");
const info = (text, kind = "") => {
  status.textContent = text; status.dataset.kind = kind;
};
const yaml = el("workflow");
const file = el("filename");
const sarif = el("sarif");
const preview = el("report");
const pay = el("pay");
const quoteButton = el("quote");
const connect = el("connect");
const download = el("download");
const previewButton = el("free-preview");
const sample = [
  "name: Safe CI",
  "on: [push, pull_request]",
  "permissions:",
  "  contents: read",
  "jobs:",
  "  checks:",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - name: Inspect code",
  '        run: echo "Static sample; no workflow executes here."'
].join("\n");

let quote = null, quoteDigest = null, quoteTime = 0;
let wallet = null, paidRequestAttempted = false, reportContent = null, reportKind = null;

function invalidate() {
  quote = null; quoteDigest = null; quoteTime = 0;
  pay.disabled = true; preview.textContent = "";
  download.hidden = true; reportContent = null; reportKind = null;
  if (!paidRequestAttempted) info("Input changed. Inspect a fresh unsigned quote before payment.");
}
yaml.addEventListener("input", invalidate);
file.addEventListener("input", invalidate);
sarif.addEventListener("change", invalidate);
el("example").addEventListener("click", () => {
  yaml.value = sample; file.value = "safe-ci.yml"; invalidate();
});

function body() {
  validateInput(yaml.value);
  if (!el("consent").checked)
    throw new Error("Confirm this is nonsecret data you may share with VM5");
  const filename = (file.value || "workflow.yml").trim();
  if (!/^[a-zA-Z0-9_.-]{1,94}$/.test(filename))
    throw new Error("Use a simple filename, 1–94 characters");
  return {workflowYaml: yaml.value, filename, includeSarif: sarif.checked};
}
const request = b => ({
  method: "POST", mode: "cors", cache: "no-store",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify(b)
});

previewButton.addEventListener("click", async () => {
  if (paidRequestAttempted) {
    info("A prior signed request may be outstanding. Do not obscure its state with an example.", "warning");
    return;
  }
  previewButton.disabled = true;
  quote = null; quoteDigest = null; quoteTime = 0; pay.disabled = true;
  try {
    const r = await fetch(FREE_SAMPLE_URL, {
      method:"GET", mode:"cors", cache:"no-store",
      headers:{"Accept":"application/json"}
    });
    if (!r.ok) throw new Error("Free example HTTP " + r.status);
    const body = await r.text();
    if (body.length > 90000) throw new Error("Free example response too large");
    const sample = verifyFreeSample(JSON.parse(body));
    reportKind = "example";
    reportContent = JSON.stringify(sample, null, 2);
    preview.textContent = reportContent;
    download.textContent = "Download FREE fictional JSON example";
    download.hidden = false;
    info("FREE FICTIONAL example displayed. Paid=false, chargedUSDC=0. No workflow uploaded, wallet connected, signature, or payment. This is not a report for your file.", "ready");
  } catch (e) {
    reportKind = null;
    reportContent = null;
    download.hidden = true;
    preview.textContent = "Free example unavailable; you can still use the local checker.";
    info("Free example preview failed: " + String(e?.message || e).slice(0,200) + ". No charge.", "warning");
  } finally {
    previewButton.disabled = false;
  }
});
quoteButton.addEventListener("click", async () => {
  if (paidRequestAttempted) {
    info("A signed attempt occurred. Do not start another payment without reconciliation.", "warning");
    return;
  }
  quoteButton.disabled = true; pay.disabled = true;
  try {
    const b = body();
    info("Requesting a live price. Your workflow is sent to the VM5 merchant WITHOUT signing or paying.");
    const res = await fetch(MERCHANT_URL, request(b));
    if (res.status !== 402) {
      info("No valid 402 quote returned (HTTP " + res.status +
        "). The input may be invalid or the service unavailable. No wallet action.", "warning");
      return;
    }
    const verified = verifyChallenge(decodeHeader(res.headers.get("PAYMENT-REQUIRED")));
    quote = verified;
    quoteTime = Date.now();
    quoteDigest = await payloadDigest(b.workflowYaml, b.filename, b.includeSarif);
    pay.disabled = !wallet;
    info("Verified LIVE x402 quote: exactly 0.20 Base USDC; Circle token " +
      shortAddress(USDC) + "; payee " + shortAddress(SELLER) +
      ". No payment made. Connect a Base wallet, then explicitly approve.", "ready");
  } catch (e) {
    info("Unsigned quote failed: " + String(e?.message || e).slice(0,220) + ". No payment.", "warning");
  } finally {
    quoteButton.disabled = false;
  }
});

connect.addEventListener("click", async () => {
  try {
    if (!window.ethereum || typeof window.ethereum.request !== "function")
      throw new Error("Use an injected EVM wallet; do not paste a private key.");
    const accounts = await window.ethereum.request({method:"eth_requestAccounts"});
    if (!Array.isArray(accounts) || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0] || ""))
      throw new Error("No wallet address returned");
    const chain = await window.ethereum.request({method:"eth_chainId"});
    if (String(chain).toLowerCase() !== CHAIN_HEX)
      throw new Error("Switch your wallet manually to Base Mainnet (chain 8453), then connect again.");
    wallet = accounts[0];
    el("wallet-address").textContent = "Connected: " + shortAddress(wallet);
    pay.disabled = !quote || paidRequestAttempted;
    info("Wallet connected. Connecting did not authorize or charge any USDC.");
  } catch (e) {
    wallet = null; pay.disabled = true;
    info("Wallet connection: " + String(e?.message || e).slice(0,220), "warning");
  }
});
window.ethereum?.on?.("accountsChanged", () => {
  wallet = null; pay.disabled = true;
  el("wallet-address").textContent = "Wallet changed; reconnect before paying";
});
window.ethereum?.on?.("chainChanged", () => {
  wallet = null; pay.disabled = true;
  el("wallet-address").textContent = "Network changed; reconnect before paying";
});

pay.addEventListener("click", async () => {
  if (paidRequestAttempted) return;
  pay.disabled = true; quoteButton.disabled = true;
  let signed = false;
  try {
    if (!quote || !wallet) throw new Error("Verified quote and Base wallet are required");
    if (Date.now() - quoteTime >= 180000)
      throw new Error("Quote older than three minutes; check a new one before paying");
    const chain = await window.ethereum.request({method:"eth_chainId"});
    if (String(chain).toLowerCase() !== CHAIN_HEX)
      throw new Error("Wallet is not on Base Mainnet");
    const accounts = await window.ethereum.request({method:"eth_accounts"});
    if (!Array.isArray(accounts) || accounts[0]?.toLowerCase() !== wallet.toLowerCase())
      throw new Error("Wallet changed since quote");
    const b = body();
    if (quoteDigest !== await payloadDigest(b.workflowYaml,b.filename,b.includeSarif))
      throw new Error("Input has changed; do not pay for a stale quote");
    verifyChallenge(quote.challenge);
    if (quote.payment.amount !== PRICE || quote.payment.payTo.toLowerCase() !== SELLER.toLowerCase())
      throw new Error("Price or merchant changed");

    info("Wallet will ask you to sign ONE 0.20 USDC EIP-3009 authorization. Verify amount and payee.", "warning");
    const nonce = new Uint8Array(32);
    crypto.getRandomValues(nonce);
    const {authorization, typed} = paymentAuthorization(quote, wallet, Math.floor(Date.now()/1000), nonce);
    // Wallet keeps full key custody; NO eth_sendTransaction, approve, or private-key prompt.
    const signature = await window.ethereum.request({
      method: "eth_signTypedData_v4", params: [wallet, JSON.stringify(typed)]
    });
    signed = true;
    const header = buildPaymentHeader(quote, authorization, signature);
    paidRequestAttempted = true; // never silently replay a signed payment
    info("Payment signature created; sending ONE authorized request. Never resend after an ambiguous timeout.", "warning");
    const r = await fetch(MERCHANT_URL, {
      ...request(b),
      headers: {"Content-Type":"application/json", "PAYMENT-SIGNATURE":header}
    });
    if (!r.ok) {
      info("Paid request returned HTTP " + r.status +
        ". Settlement may be uncertain; DO NOT retry until verified with the merchant.", "warning");
      return;
    }
    const responseText = await r.text();
    let obj;
    try { obj = JSON.parse(responseText); } catch { throw new Error("Non-JSON paid response"); }
    reportKind = "paid";
    reportContent = JSON.stringify(obj,null,2);
    preview.textContent = reportContent.slice(0,220000);
    download.textContent = "Download merchant report JSON";
    download.hidden = false;
    let settle;
    try { settle = parseSettlement(r.headers.get("PAYMENT-RESPONSE")); }
    catch { settle = {confirmed:false,reason:"Malformed settlement header"}; }
    if (settle.confirmed) {
      info("Report delivered. x402 settlement response claims success: " + settle.transaction +
        " (Base). Independently verify onchain finality; this is not bank cash.", "success");
    } else {
      info("Report returned by merchant but onchain settlement is NOT verified (" +
        settle.reason + "). Do not pay again.", "warning");
    }
  } catch (e) {
    info("Payment flow stopped: " + String(e?.message || e).slice(0,260) +
      (signed ? ". A signature may be outstanding; DO NOT retry." : ". No signed payment was submitted."),
      "warning");
  } finally {
    pay.disabled = true;
    quoteButton.disabled = paidRequestAttempted || signed;
  }
});
download.addEventListener("click", () => {
  if (!reportContent) return;
  const blob = new Blob([reportContent],{type:"application/json"});
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = reportKind === "paid"
    ? "workflow-risk-report.json"
    : "workflow-risk-FREE-FICTIONAL-example.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(u),1000);
});
el("count").textContent = "Limit: " + MAX_INPUT_BYTES.toLocaleString("en-US") + " UTF-8 bytes";
info("Start with the free checker, or paste a NONSECRET workflow and inspect an unsigned x402 quote.");
