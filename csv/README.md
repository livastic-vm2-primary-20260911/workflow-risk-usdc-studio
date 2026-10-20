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
