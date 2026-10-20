# Fictional 10-row crypto CSV mini-review: sample deliverable

**Version:** 2026-10-21 · **Status:** 100% SYNTHETIC demonstration, not a real customer order or paid delivery.

**Purpose.** This is an example of the *format* of a small, separately agreed technical review a buyer could receive for the same owner's existing advertised 5 native Circle USDC (Base mainnet) one-source, up-to-10-deidentified-row HashN offer. It shows evidence, limitations and exception handling, not tax accounting. It makes no claim of external paid customers, acceptance by Koinly or a certified audit.

**Public fictional input:** [synthetic-source-10rows.csv](./synthetic-source-10rows.csv). All source values, reference identifiers and timestamps were constructed solely for this demonstration. No client material, wallet address, transaction hash, personal details or prices from a real trade appear here.

**Reproducibility:** Executed the original browser-local `inspectNarrativeCSV` from [csv/narrative/core.mjs](https://github.com/livastic-vm2-primary-20260911/workflow-risk-usdc-studio/blob/main/csv/narrative/core.mjs) against this input. Exact generated artifacts: [derived-review-only.json](./derived-review-only.json) and [derived-candidate-review-only.csv](./derived-candidate-review-only.csv). No HTTP API call, payments or wallet signing were involved.

## 1. Source schema / candidate mapping

| Source column | Candidate purpose | Evidence and caveat |
|---|---|---|
| `Description` | Candidate direction, exact decimal quantity and uppercase ticker, where grammar is unambiguous | **Review only.** Extra text may be ignored; labels do not prove trades. |
| `Time` | Potential source timestamp reference | **NOT MAPPED**. No exchange time zone, transaction finality or import rules established. |
| `Reference` | Local record reconciliation identifier | **NOT EXPORTED**. Synthetic identifiers in the input are not transaction hashes. |
| `QuoteText` | Possible surrounding metadata | **NOT MAPPED**, never treated as price, fee, fiat proceeds or cost basis. |

Only the *review-only* candidate fields can be derived responsibly. The source does not provide evidence to complete Koinly Simple/Trades/Universal templates. No Koinly-formatted transaction file is generated.

## 2. Actual parser observation (10 logical data records)

| Source record (1-based, header included) | Observed result | Candidate quantity / ticker | Exception status |
|---|---|---|---|
| 2 | BUY_CANDIDATE | `1.4324467000 SOL` | Review original trade status, contract and fees. |
| 3 | SELL_CANDIDATE | `0.250000 BTC` | Review original transfer vs trade classification, fees and quote asset. |
| 4 | BUY_CANDIDATE | `2 SOL` | `TRAILING_CONTEXT_IGNORED_REVIEW_REQUIRED` — fictional `for 99 CAD` note is **not** a verified price or cost basis. |
| 5 | BUY_CANDIDATE | `0.000000000000000001 ETH` | Exact source decimal precision is retained as text, not approximated by a float. |
| 6 | SELL_CANDIDATE | `3 XRP` | `TRAILING_CONTEXT_IGNORED_REVIEW_REQUIRED` — reference suffix ignored, not a verified transaction ID. |
| 7 | BUY_CANDIDATE | `5 USDC` | Ticker alone does **not** establish Base vs other chain/token contract. |
| 8 | NOT_PARSED | — | A transfer narrative is **not** a proven buy or sell. Need authorized source data and ownership context. |
| 9 | NOT_PARSED | — | Refund marker: original purchase may be cancelled or reversed. Never invent the settled outcome. |
| 10 | NOT_PARSED | — | Formula-like text is rejected as data and never executed; no link is opened. |
| 11 | NOT_PARSED | — | Multiple actions in one description are unsafe to split without independently verified records. |

**Aggregate:** 10 synthetic source records; **6 candidate records that require review**, **4 unparsed**. The 6 candidates are neither confirmed sales nor six Koinly-ready rows. Every candidate is marked `REVIEW_REQUIRED_NOT_KOINLY_IMPORT`, or `REVIEW_TRAILING_CONTEXT_IGNORED_NOT_KOINLY_IMPORT`. A failed parse is a legitimate useful outcome, not a reason to fabricate a transaction.

## 3. Buyer review questions, not guesses

For each review candidate, a real authorized buyer would have to provide—or explicitly mark unknown—the genuine trade/transfer settlement evidence, original paid and received quantities, asset/network identifiers, fees, accurate source timestamp/time zone, and importer documentation. We would confirm whether an output is eligible for the selected importer **only after** those fields can be evidenced, and would never make up missing cost basis, P&L, tax class, chain identity or customer ownership.

For source records 8–11, the deliverable explicitly flags uncertainty. It does not delete them, guess they are taxable, or split reversals into fictional transfers. No private wallet history, API key, secret, real transaction or seed phrase is required to review this synthetic example.

## 4. Actual separately agreed buyer scope (nonbinding until accepted)

The same beneficial owner has an [existing public 5-native-Base-Circle-USDC technical offer](https://hashn.com/store/886ed287-aaca-434b-9f27-560a50bfbbb6/listings/koinly-csv-one-source-mapping-mini-review-5usdc.md), restricted to **one buyer-authorized deidentified source and up to 10 example rows** for candidate mapping, row integrity and explicit exceptions. HashN is a **contact directory for registered agents, not escrow or immediate paid checkout**. Humans can inquire via [existing owner email](mailto:onecursor1@gmail.com?subject=5%20USDC%20Koinly%20one-source%2010-row%20review%20inquiry), sharing only column headers and fictional descriptions.

A real paid engagement requires the *independent buyer's separate written agreement* on: legal rights to share sanitized data, mutually understood inputs and deliverables, real native Circle USDC on Base network/token/payee, payment/settlement conditions, handling of ambiguous records, acceptance and cancellation/refund rules, and a safe method to deliver the results. Do not send real client CSVs over an unsolicited email. The owner never guarantees tax, investment, transaction settlement or Koinly import acceptance. Buyer must not send wallet keys or approval transactions. This example has **0 paid customers, 0 purchases, 0 wallet transfers**.

If no competent, privacy-safe and lawful data transfer/contract can be arranged, we decline real processing rather than exposing client financial records.

## 5. Independent verification guide

Download only the **fictional** CSV, visit the [free browser-local inspector](https://livastic-vm2-primary-20260911.github.io/workflow-risk-usdc-studio/csv/narrative/) and select the synthetic source in your own browser. Column name `Description`; click **Analyze REVIEW-ONLY candidates — FREE**. Compare the 6/4 aggregate and code labels with the published [strict parser source](https://github.com/livastic-vm2-primary-20260911/workflow-risk-usdc-studio/blob/main/csv/narrative/core.mjs). The local candidate CSV should contain exactly source record identifiers, directions, quantity strings, ticker strings and review statuses; it should not contain `Reference`, `Time`, `QuoteText` or any original raw narrative.

This is a testable **illustrative pre-purchase scope**, not actual paid customer experience, a refund promise, financial accounting advice or proof the customer would choose to pay 5 USDC.
