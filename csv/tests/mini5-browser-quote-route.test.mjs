import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync(new URL("../mini-review-demo/index.html",import.meta.url),"utf8");
const styles=fs.readFileSync(new URL("../mini-review-demo/style.css",import.meta.url),"utf8");
const root=fs.readFileSync(new URL("../../README.md",import.meta.url),"utf8");
const form="https://docs.google.com/forms/d/e/1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g/viewform";

test("existing one-owner VM5 voluntary quote form is accessible from $5 buyer demo",()=>{
 assert.equal(page.split('href="'+form+'"').length-1,1);
 assert.match(page,/VM5 Delivery Lab/);
 assert.match(page,/5 USDC mini-review/);
 assert.match(page,/Open voluntary quote request \(Google Form\)/);
 assert.match(root,/same human owner's existing VM5.*Google Form/);
});
test("quote is a separate inquiry, never a payment request or accepted order",()=>{
 assert.match(page,/not a purchase or guaranteed reply/);
 assert.match(page,/not an escrow or automatic checkout/);
 assert.match(page,/No charge occurs by opening the form/);
 assert.match(page,/written scope, AI-assisted delivery, cancellation\/refund and payment terms/);
});
test("Google data processing and minimum privacy disclosed before visitor opens link",()=>{
 assert.match(page,/Contact email address/);
 assert.match(page,/processed by Google and the same one-owner VM5 sales desk/);
 assert.match(page,/No private exchange CSV files/);
 assert.match(page,/no wallet seeds/);
 assert.match(page,/no customer financial records/);
 assert.match(page,/no live API credentials/);
});
test("free inspector, human mail and original HashN listing retained",()=>{
 assert.match(page,/href="\.\.\/narrative\/"/);
 assert.match(page,/href="mailto:onecursor1@gmail.com\?subject=5%20USDC/);
 assert.match(page,/https:\/\/hashn\.com\/store\/886ed287-aaca-434b-9f27-560a50bfbbb6/);
 assert.match(page,/HashN is a contact directory for registered agents, not escrow or instant checkout/);
});
test("external form link isolated and no embedded script/network request",()=>{
 assert(page.includes('href="'+form+'" target="_blank" rel="noopener noreferrer"'));
 assert.match(page,/script-src 'none'/);
 assert.match(page,/connect-src 'none'/);
 assert.match(page,/form-action 'none'/);
 assert(!/<form\b|<script\b/gi.test(page));
 assert.match(styles,/\.optional-quote-route/);
});
test("not forced into 49-USDC tier or data upload to view example",()=>{
 assert.match(page,/1–10 fictional\/deidentified rows/);
 assert.match(page,/49 USDC larger technical pilot remains separate/);
 assert.match(page,/free original demo/);
 assert.match(page,/6 review-only candidates/);
 assert.match(page,/4 explicitly unparsed rows/);
});
