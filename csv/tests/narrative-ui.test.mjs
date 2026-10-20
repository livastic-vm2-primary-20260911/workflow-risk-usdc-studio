import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const path = new URL("../narrative/index.html",import.meta.url);
const html = readFileSync(path,"utf8");
const app = readFileSync(new URL("../narrative/app.mjs",import.meta.url),"utf8");

test("new free narrative offer is linked by both existing main pages and sitemap",()=>{
 const root=readFileSync(new URL("../../index.html",import.meta.url),"utf8");
 const csv=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const site=readFileSync(new URL("../../sitemap.xml",import.meta.url),"utf8");
 const catalog=JSON.parse(readFileSync(new URL("../catalog.json",import.meta.url),"utf8"));
 assert.match(root,/csv\/narrative\//);
 assert.match(csv,/href="\.\/narrative\/"/);
 assert.match(site,/workflow-risk-usdc-studio\/csv\/narrative\//);
 assert.equal(catalog.freeNarrativeInspector.noUpload,true);
 assert.equal(catalog.freeNarrativeInspector.priceUSDC,"0");
 assert.equal(catalog.freeNarrativeInspector.notKoinlyImport,true);
});

test("privacy CSP forbids outgoing requests and authentication",()=>{
 assert.match(html,/connect-src 'none'/);
 assert.match(html,/form-action 'none'/);
 assert.match(html,/script-src 'self'/);
 assert.ok(!/<iframe\b|<form\b|<script[^>]+src="https?:/i.test(html));
 for(const word of ["fetch(","XMLHttpRequest","localStorage","eth_signTypedData","eth_sendTransaction","paymentAuthorization"]) {
   assert.equal(app.includes(word),false,word);
 }
});

test("real UI events on fictional local input only, no network, no wallet", async()=>{
 const ids=["source","column","summary","rows","state","download","file","example","analyze"];
 const els=new Map(ids.map(id=>[id,{
   id,value:"",checked:false,disabled:id==="download",textContent:"",
   listeners:{},children:[],
   addEventListener(name,fn){this.listeners[name]=fn},
   replaceChildren(){this.children=[]},
   appendChild(el){this.children.push(el)},
 }]));
 els.get("column").value="Description";
 const old={document:globalThis.document,fetch:globalThis.fetch};
 const events=[];
 try {
   globalThis.document={
     getElementById:id=>els.get(id),
     createElement:tag=>({tag,children:[],textContent:"",
       appendChild(e){this.children.push(e)},
     })
   };
   globalThis.fetch=()=>{events.push("OUTGOING_REQUEST");throw new Error("Unexpected network")};
   await import("../narrative/app.mjs?ui-test=20261021");
   els.get("example").listeners.click();
   assert.match(els.get("source").value,/Purchase of 1\.4324467000 SOL/);
   els.get("analyze").listeners.click();
   assert.match(els.get("state").textContent,/3 review-only candidates/);
   assert.equal(els.get("download").disabled,false);
   assert.equal(els.get("rows").children.length,4);
   assert.ok(!els.get("summary").textContent.includes("FICT-A01"));
   assert.ok(!els.get("summary").textContent.includes("HYPERLINK"));
   assert.deepEqual(events,[]);
 } finally {
   for(const [k,v] of Object.entries(old)){
     if(v===undefined)delete globalThis[k];else globalThis[k]=v;
   }
 }
});

test("input change invalidates all candidate downloads",()=>{
 assert.match(app,/source\.addEventListener\("input",clear\)/);
 assert.match(app,/column\.addEventListener\("input",clear\)/);
 assert.match(app,/download\.disabled=true/);
 assert.match(app,/if\(!current\|\|!current\.candidateRecords\)return/);
});

test("optional 49 USDC inquiry uses preexisting single-owner form without automatic upload",()=>{
 assert.ok(html.includes("1FAIpQLSe_N8anCGUDmWdNZLnGwFRfhYaaCsB18BKdYd_VsFZp1xWm3g/viewform"));
 assert.ok(html.includes("existing one-owner optional buyer inquiry form"));
 assert.ok(html.includes("completely fictional example"));
 assert.ok(html.includes("not private account exports"));
 assert.ok(!html.includes("pay now"));
});

test("buyer guide contextualizes Wealthsimple-like data without vendor endorsement or tax fiction",()=>{
 assert.match(html,/Wealthsimple-style description extraction guide/);
 assert.match(html,/this exact obstacle/);
 assert.match(html,/for CAD 300/);
 assert.match(html,/ignored and flagged/);
 assert.match(html,/no official Wealthsimple schema/);
});
test("agent catalog discloses trailing context is ignored and never a cost basis",()=>{
 const cat=JSON.parse(readFileSync(new URL("../catalog.json",import.meta.url),"utf8"));
 const info=cat.freeNarrativeInspector.trailingContext;
 assert.equal(info.trailingDetailsNotInterpreted,true);
 assert.equal(info.unsupportedReversalsRejected,true);
 assert.equal(info.notPriceOrFeeEstimation,true);
 assert.equal(info.sourcePrivateFieldsNeverDownloaded,true);
});
