# Workflow Risk Studio — free checks and actual 0.20 Base USDC x402 API

One **user-facing static web page** for one already-live, genuinely priced
service owned by the same single real person operating VM2 and VM5. It does not
launch a second merchant, proxy a payment, monetize compute capacity, or change
the existing VM5 Render deployment, payee address, x402 middleware or wallet.

- Free client-side checker:
  https://livastic-vm2-primary-20260911.github.io/workflow-risk-check/
- **Existing paid merchant**:
  POST https://vm5-openapi-x402.onrender.com/v1/workflow-risk
- Actual first-party HTTP 402 challenge verified, 2026-10-20: x402 v2,
  Base eip155:8453, exact EIP-3009, native Circle USDC on Base,
  200000 atomic units = **0.20 USDC**.
- Merchant wallet pinned from the actual public quote:
  0x6b01efA0705E91a7aca54271510bf9e594717f34.
- This frontend is static, has no npm dependencies, no tracker and no user
  account. It never asks for or stores a private key, seed phrase or card.
- **Privacy-first quote (2026-10-21):** the browser sends ONLY a fixed public
  synthetic workflow when requesting a free 402 quote. Customer YAML is validated
  and hashed locally, NEVER uploaded during price inspection. Customer YAML is
  transmitted only after separate upload consent and signed paid authorization.
  If signing fails or is rejected, the real YAML is not sent.
- Input for a paid report must be buyer-owned or authorized nonsecret YAML,
  <=48KB. A free 402 price request uses our fixed public synthetic example,
  NOT customer input, and never pays. The free checker is local-first.
- The browser wallet flow is **opt-in**: connect an injected EIP-1193 wallet,
  inspect the 402, then click a separate explicit purchase button. Client
  refuses changed network/asset/payee/amount/chain/transfer methods.
  Only a fixed-amount, expiring EIP-712 EIP-3009 typed-data authorization
  can be signed via a wallet extension. No eth_sendTransaction, ERC20
  approve(), unlimited allowance or server-side private key.
- The signed request is sent at most once in a page view. An unknown HTTP
  error or missing settlement receipt causes a warning; it is not retried.
- This frontend does not verify wallet balance, simulate chain finality or
  independently prove payment. The user should verify onchain independently.
- We have **NOT** signed a real buyer payment or demonstrated successful
  end-to-end wallet settlement. We did verify the real unsigned HTTP402
  quote and browser CORS headers, and ran 61 offline quote/signature and sample-safety tests including Bazaar discovery metadata.

The page also offers a FREE fictional JSON report preview directly from
the merchant's public /v1/workflow-risk-sample route, without submitting
user YAML, connecting a wallet or authorizing any charge. The sample is
explicitly marked exampleOnly=true, paid=false and chargedUSDC="0";
it is neither a report on your file nor a billable service.

## New: CSV Preflight Studio, 0.005 USDC optional report

The same public Pages site also has a separate CSV quality checker:

https://livastic-vm2-primary-20260911.github.io/workflow-risk-usdc-studio/csv/

The CSV frontend uses a browser-local structural parser for free (bounded
32,768 UTF-8 bytes, 500 data rows, 40 columns). It reports row/column
positions and counts for duplicates, missing cells, inconsistent row width
and formula-like spreadsheet inputs. It does not upload data or execute
CSV formulas when used in free mode.

For permitted nonsecret CSV, a separate explicit opt-in can send a JSON
request to the already-existing VM5 x402 POST /v1/csv-preflight. A real
x402-v2 EIP-3009 HTTP 402 quote proves the service currently requests
only 5,000 atomic native Circle Base USDC units (0.005 USDC). This is not
an automatically purchased report. The wallet-signature and paid delivery
flow is still unverified with independent outside buyers. The static UI
and merchant both belong to the same human economic owner.

This UI is a new public sales surface. It is not a confirmed buyer order,
paid transaction or new money. The underlying paid API already existed.

## Optional existing-owner 5 USDC quote intake

The 100% fictional ten-row mini-review example now links the **same human owner's existing VM5 Delivery Lab Google Form**, so a genuine independent buyer can ask for a narrowly scoped 5 native Circle Base USDC technical report even without a configured local mail application. This is not a new brand, seller account, payment, escrow or customer. The static site keeps the existing unsent local mailto and registered-agent HashN contact link, and it never submits a form itself. Buyers should prefix the voluntary free-text request with "5 USDC mini-review" and provide **only fictional, non-sensitive** format data; never upload raw crypto transactions, exchange statements, tax records, private wallets, seeds or customer information. Google and the same one-owner VM5 team process the reply email and written answers if the user actually submits the external form. Scope, fees, cancellation/refund, AI assistance and jurisdictional eligibility must be accepted by the buyer before any real 5 USDC payment or technical deliverable. A form click or submission is not revenue; no independent purchase or response has yet been verified.

## Validation

    npm test
    python3 -m http.server 8800

Visit http://localhost:8800 only for visual development. Real wallet
signing requires an HTTPS secure origin and a compatible wallet; do not
test actual payments using any wallet controlled by the owner of the
merchant. The local test suite never calls the internet, a wallet, or
any real payment system.

## Actual buyer flow

1. Use the free checker for sensitive workflows, or paste a nonsecret,
   self-owned YAML input. You can inspect price without enabling upload consent.
2. Click Inspect unsigned quote — this sends ONLY a public synthetic example,
   never your real YAML, and contains no PAYMENT-SIGNATURE. The local
   browser hashes your chosen YAML to lock subsequent paid input. The fixed
   example was verified against the real merchant's HTTP402 response. The UI
   accepts only the exact official price/token/chain/payee and expires
   quotes after three minutes.
3. Check consent for uploading your NONSECRET YAML ONLY during the eventual
   paid call. Connect an injected Base-mainnet wallet. No keys are typed into
   the page. Confirm one and only one EIP-712 0.20 USDC signature.
4. If approved, exactly one signed POST is sent. A successful JSON body is
   displayed and can be downloaded. Settlement receipts and finality are
   separate from the JSON result.
5. If interrupted, DO NOT assume a charge failed; reconcile before
   considering another payment.

The code is licensed MIT. Product expectations and limitations are visible
in the page. No DeFi yield, trading, investment, security certification,
penetration testing or guaranteed ROI is offered.

## Autonomous or agent buyers

For programmatic clients, use the official x402 v2 client with a buyer's
own safeguarded wallet and a separate spend cap. Official reference:
https://www.npmjs.com/package/@x402/fetch
Merchant specification: https://vm5-openapi-x402.onrender.com/openapi.json
Never paste or commit any private key, API password or signing secret into
this frontend, a chat, source control or an untrusted remote service.
The paid input contract is JSON with keys workflowYaml, filename, includeSarif.

VM2 original root: /srv/multi-vm-agent/workspace/make_money.
VM5 owns paid merchant and any deployment or cash ledger. One economic owner
across VM1, VM2, VM3 and VM5; no circular self-purchases or revenue double
counting. Existing deliberate stop of raw CPU/GPU/VPS rented compute and
DePIN/Golem/AIOZ remains binding.
