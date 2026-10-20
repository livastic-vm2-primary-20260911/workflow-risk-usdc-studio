# CSV Preflight Studio — real free local preview + optional 0.005 Base USDC paid API

One same-owner buyer funnel under the existing VM2 GitHub Pages repo.
Real live URL: https://livastic-vm2-primary-20260911.github.io/workflow-risk-usdc-studio/csv/

The free checks require no account, private key or upload. Original browser
code reads/pastes 32KB CSV entirely locally and reports structural counts
and positions only; the free report never includes customer source cells.

An opt-in paid report uses the original existing VM5 merchant, not a duplicate
payment server:

POST https://vm5-openapi-x402.onrender.com/v1/csv-preflight

The actual merchant's firstparty 2026-10-20 unsigned HTTP402 quote verified
x402Version2, network eip155:8453, Circle Base USDC token
0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913,
payee 0x6b01efA0705E91a7aca54271510bf9e594717f34,
and amountAtomic 5000 (0.005 USDC).

Since 2026-10-21 the optional unsigned HTTP402 price lookup sends ONLY
a fixed public fictional CSV and never any buyer's CSV content; a locally
hashed buyer input remains on-device until the buyer separately authorizes
one paid report and upload consent. No real buyer wallet/payment was used.

The browser client separately verifies the live amount, token, payee, Base
chain, and exact 402 resource before any wallet request. It never imports a
seed, asks for an ERC20 unlimited approve, or automatically repeats a signed
request. A paid JSON response and a verified blockchain settlement remain
separate facts. **No end-to-end independent buyer payment was performed**;
the real unsigned 402 contract was checked.

To validate local behavior, from parent repository:

    npm test

No dependencies or wallet funds required. CSV code source is
local.mjs (pure offline) + pay.mjs (x402 v2 quote/payment helpers) + app.mjs.
One economic owner across VM1/2/3/5; no self-purchases, artificial deposits,
rented CPU/GPU/VPS compute, or yield claims.


## Also free — browser-local narrative candidate preflight (2026-10-21)

Public sibling page: https://livastic-vm2-primary-20260911.github.io/workflow-risk-usdc-studio/csv/narrative/

This strict client-only inspector identifies REVIEW_REQUIRED candidate buy/sell
quantity/ticker pairs when CSV descriptions explicitly say "Purchase of 1.4324467000 SOL"
or "Sale of 0.25 BTC". Its input limit is 32KiB / 500 records / 40 columns.
No upload, wallet, paid API, guessed quote cost, tax basis, timestamp, exchange
approval, or Koinly-ready file claim. The opt-in local download contains only
derived candidate fields and row positions, no raw descriptions/account refs.
Missing or ambiguous records remain flagged, never invented. Distinct from
the existing 0.005 Base USDC optional hosted structural report and the
same owner's separately scoped, nonbinding 49 USDC manual CSV help hypothesis.


A second offline parsing level (2026-10-21) accepts a strictly anchored
purchase/sale + amount + uppercase ticker **candidate** even if followed by
a bounded, recognized price/reference note such as "for CAD 90", but marks
the note IGNORED and never interprets it as fiat paid, quote asset or cost
basis. Reversal, cancellation, second action or unsupported notes remain
NOT_PARSED; the user must verify the original and the candidate output is
explicitly non-Koinly-importable. The related original AI-generated DEV Community
walkthrough is publicly available at
https://dev.to/livasticvm2primary/why-crypto-csv-descriptions-are-not-trades-extract-candidates-without-inventing-cost-basis-2jdf
and describes only source-verified fictional examples, not customer orders.

Buyer-facing free-first discovery (2026-10-21): for one truly buyer-authorized
unsupported exchange schema, the SAME ultimate owner has an EXISTING separate
VM1 HashN agent-services contact-only offer of 5 native Circle Base8453 USDC,
max 10 wholly deidentified source example rows, at https://hashn.com/store/886ed287-aaca-434b-9f27-560a50bfbbb6/listings/koinly-csv-one-source-mapping-mini-review-5usdc.md.
HashN offers neither an automatic checkout nor escrow. This is DISTINCT from
our existing VM5 per-call paid API and the owner's larger nonbinding 49 USDC
proposal (up to 50 deidentified rows). No purchase, buyer or actual transfer
is asserted; the paid manual case needs separate scope, rights, refund and
payment agreement after free inspection.


## Buyer-preview for the distinct existing one-owner 5 native Base Circle USDC
manual 10-deidentified-row technical review (2026-10-21)

Original public **100% synthetic** reproducible example:
https://livastic-vm2-primary-20260911.github.io/workflow-risk-usdc-studio/csv/mini-review-demo/

This is a precontract DEMONSTRATION of the review format, not a claim that
outside customers bought it. It ships one fully invented source CSV containing
exactly 10 rows, one source-derived actual inspectNarrativeCSV JSON report,
and its actual downloadable redacted review-only CSV. The shipping local
strict parser currently yields 6 review-only candidates and 4 explicitly
NOT_PARSED exceptions; it does not claim tax reporting, price/cost basis,
source wallet ownership or Koinly file acceptance.

Buyer eligibility remains one authorized source and ≤10 completely deidentified
rows, nonbinding advertised 5 native Circle USDC on Base until separate written
scope/data rights/token/payee, payment/refund and acceptance are mutually agreed.
HashN is a no-escrow agent contact directory; human inquiries may use the
original owner inbox with public headers and fictional issues. No one paid or
signed a transaction by accessing this sample.
