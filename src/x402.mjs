/*
 * x402 v2 exact EIP-3009 client helpers (no dependencies).
 * Paid execution REMAINS at the existing VM5 merchant API.
 * This static site never handles a private key or settles payments itself.
 */
export const MERCHANT_URL = "https://vm5-openapi-x402.onrender.com/v1/workflow-risk";
export const FREE_SAMPLE_URL = "https://vm5-openapi-x402.onrender.com/v1/workflow-risk-sample";
export const CHAIN = "eip155:8453";
export const CHAIN_HEX = "0x2105";
export const USDC = "0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913";
export const SELLER = "0x6b01efA0705E91a7aca54271510bf9e594717f34";
export const PRICE = "200000"; // 0.20 USDC, 6 decimals. Never silently raise.
export const MAX_INPUT_BYTES = 48000;
const ADDRESS = /^0x[a-f0-9]{40}$/i;
const HASH = /^0x[a-f0-9]{64}$/i;
const SIGNATURE = /^0x[a-f0-9]{130}$/i;

function check(condition, reason) {
  if (!condition) throw new Error(reason);
}
function normAddress(v) {
  check(typeof v === "string" && ADDRESS.test(v), "Invalid wallet address");
  return v.toLowerCase();
}
export function validateInput(yaml) {
  check(typeof yaml === "string", "Workflow YAML must be text");
  const bytes = new TextEncoder().encode(yaml).length;
  check(bytes >= 10 && bytes <= MAX_INPUT_BYTES, "Workflow must be 10–48,000 UTF-8 bytes");
  check(!yaml.includes("\u0000"), "NUL bytes are not allowed");
  return bytes;
}
export function decodeHeader(headerValue) {
  check(typeof headerValue === "string" && headerValue.length >= 10 &&
        headerValue.length < 16000, "Missing or oversized x402 header");
  const padded = headerValue.replace(/-/g, "+").replace(/_/g, "/");
  check(/^[A-Za-z0-9+/]*={0,2}$/.test(padded), "Invalid x402 header encoding");
  try {
    return JSON.parse(atob(padded));
  } catch {
    throw new Error("Unparseable x402 payment-required header");
  }
}
export function verifyChallenge(challenge) {
  check(challenge && typeof challenge === "object" &&
        challenge.x402Version === 2, "Expected x402 v2 quote");
  check(challenge.resource?.url === MERCHANT_URL,
        "Unexpected paid resource; no payment will be signed");
  check(Array.isArray(challenge.accepts) && challenge.accepts.length === 1,
        "Unexpected payment options; no payment will be signed");
  // The existing merchant legitimately advertises the standard x402
  // Bazaar DISCOVERY extension. It does not alter the asset, amount, payee,
  // or EIP-3009 signature. Echo only this recognized metadata verbatim.
  // Reject unknown extensions rather than silently weakening checkout rules.
  const extensions = challenge.extensions ?? {};
  check(extensions && typeof extensions === "object" && !Array.isArray(extensions) &&
        Object.keys(extensions).every(k => k === "bazaar"),
        "Unsupported payment extensions");
  if (extensions.bazaar) {
    const b = extensions.bazaar;
    check(b && typeof b === "object" && !Array.isArray(b) &&
          b.info && typeof b.info === "object" && b.schema &&
          typeof b.schema === "object" &&
          b.info.input?.type === "http" &&
          b.info.input?.method === "POST" &&
          b.info.input?.bodyType === "json" &&
          JSON.stringify(b).length <= 5000,
          "Unexpected Bazaar discovery metadata");
  }
  const p = challenge.accepts[0];
  check(p.scheme === "exact" && p.network === CHAIN,
        "Unsupported chain or settlement method");
  check(p.amount === PRICE, "Unexpected price; refuses to authorize");
  check(normAddress(p.asset) === USDC.toLowerCase(),
        "Unexpected payment token; only native Circle USDC accepted");
  check(normAddress(p.payTo) === SELLER.toLowerCase(),
        "Unexpected payee; refuses to authorize");
  check(Number.isSafeInteger(p.maxTimeoutSeconds) &&
        p.maxTimeoutSeconds >= 30 && p.maxTimeoutSeconds <= 600,
        "Unsupported payment expiry");
  check(p.extra && p.extra.name === "USD Coin" && p.extra.version === "2" &&
        (!p.extra.assetTransferMethod || p.extra.assetTransferMethod === "eip3009"),
        "Unsupported EIP-3009 token domain");
  return Object.freeze({challenge, payment: p, merchant: MERCHANT_URL,
    amountAtomic: PRICE, amountUsdc: "0.20", payTo: SELLER,
    asset: USDC, network: CHAIN});
}
export async function payloadDigest(yaml, filename = "workflow.yml", includeSarif = true) {
  validateInput(yaml);
  const s = JSON.stringify({workflowYaml: yaml, filename, includeSarif});
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(h, x => x.toString(16).padStart(2, "0")).join("");
}
export function paymentAuthorization(quote, address, nowSeconds, randomBytes32) {
  check(quote && quote.payment && quote.challenge, "Verified merchant quote required");
  verifyChallenge(quote.challenge);
  const from = normAddress(address);
  check(Number.isSafeInteger(nowSeconds) && nowSeconds > 1600000000,
        "Invalid local time");
  check(randomBytes32 instanceof Uint8Array && randomBytes32.length === 32,
        "A cryptographically secure 32-byte nonce is required");
  const nonce = "0x" + Array.from(randomBytes32, b => b.toString(16).padStart(2,"0")).join("");
  const auth = {
    from,
    to: SELLER,
    value: PRICE,
    validAfter: String(nowSeconds - 60),
    validBefore: String(nowSeconds + Math.min(quote.payment.maxTimeoutSeconds, 300) - 5),
    nonce
  };
  const typed = {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" }
      ],
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    },
    primaryType: "TransferWithAuthorization",
    domain: {
      name: quote.payment.extra.name,
      version: quote.payment.extra.version,
      chainId: 8453,
      verifyingContract: USDC
    },
    message: auth
  };
  return {authorization: auth, typed};
}
export function buildPaymentHeader(quote, authorization, signature) {
  verifyChallenge(quote.challenge);
  check(typeof signature === "string" && SIGNATURE.test(signature),
        "Invalid typed-data wallet signature");
  check(authorization && authorization.to?.toLowerCase() === SELLER.toLowerCase() &&
        authorization.value === PRICE && HASH.test(authorization.nonce) &&
        ADDRESS.test(authorization.from), "Authorization mismatch");
  const payload = {
    x402Version: 2,
    resource: quote.challenge.resource,
    accepted: quote.payment,
    payload: {signature, authorization},
    extensions: quote.challenge.extensions ?? {}
  };
  return btoa(JSON.stringify(payload));
}
export function parseSettlement(headerValue) {
  if (!headerValue) return {confirmed:false,reason:"No PAYMENT-RESPONSE header"};
  const parsed = decodeHeader(headerValue);
  if (parsed.success !== true || parsed.network !== CHAIN ||
      !HASH.test(parsed.transaction ?? "")) {
    return {confirmed:false,reason:"Settlement proof invalid or incomplete"};
  }
  return {confirmed:true,transaction:parsed.transaction, network:CHAIN};
}
export function verifyFreeSample(payload) {
  check(payload && typeof payload === "object" && !Array.isArray(payload),
        "Invalid free sample");
  check(payload.exampleOnly === true && payload.paid === false &&
        payload.chargedUSDC === "0", "An example cannot claim real payment");
  check(payload.sampleReport && typeof payload.sampleReport === "object" &&
        !Array.isArray(payload.sampleReport) &&
        payload.sampleReport.staticOnly === true,
        "Unexpected sample report shape");
  check(payload.paidEndpoint === "POST " + new URL(MERCHANT_URL).pathname &&
        payload.network === CHAIN,
        "Free sample linked to unexpected paid merchant");
  return payload;
}
export function shortAddress(address) {
  return normAddress(address).slice(0, 8) + "…" + normAddress(address).slice(-6);
}
