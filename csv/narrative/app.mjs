import {inspectNarrativeCSV, candidateReviewCSV} from "./core.mjs?v=20261021-narrative1";
const el=id=>document.getElementById(id);
const source=el("source");
const column=el("column");
const summary=el("summary");
const rows=el("rows");
const state=el("state");
const download=el("download");
const demo=[
 "Description,When,Reference",
 '"Purchase of 1.4324467000 SOL","2026-10-01 10:00:00","FICT-A01"',
 '"Sale of 0.250000 BTC","2026-10-02 11:00:00","FICT-A02"',
 '"Purchase of 2 SOL for 99 CAD","2026-10-03 12:00:00","FICT-A03"',
 '"=HYPERLINK(""http://invalid.local"")","2026-10-04 13:00:00","FICT-A04"',
].join("\r\n");
let current=null;
function clear() {
 current=null; rows.replaceChildren();
 summary.textContent="No candidate analysis yet.";
 download.disabled=true;
 state.textContent="Input changed. Local-only; inspect again. No upload or wallet action.";
}
source.addEventListener("input",clear);
column.addEventListener("input",clear);
el("example").addEventListener("click",()=>{
 source.value=demo; column.value="Description"; clear();
 state.textContent="Fictional sample loaded locally. Click Analyze for review-only candidates.";
});
el("file").addEventListener("change",async e=>{
 const selected=e.target.files?.[0];
 if(!selected)return;
 try {
   if(selected.size<3||selected.size>32768)throw new Error("LOCAL_FILE_MAX_32KB");
   source.value=await selected.text(); clear();
   state.textContent="File loaded into this browser only. No upload. Click Analyze.";
 }catch(err) {state.textContent="Local file rejected: "+String(err.message).slice(0,100)}
 finally {e.target.value=""}
});
el("analyze").addEventListener("click",()=>{
 try {
   const report=inspectNarrativeCSV(source.value,column.value);
   current=report;
   summary.textContent=JSON.stringify({
     kind:report.kind, uploaded:false, chargedUSDC:"0",
     sourceRecords:report.sourceRecords, candidateRecords:report.candidateRecords,
     unparsedRecords:report.unparsedRecords, reasonTotals:report.reasonTotals,
     limitations:report.limitations
   },null,2);
   rows.replaceChildren();
   for(const row of report.records.slice(0,100)) {
     const tr=document.createElement("tr");
     for(const value of [row.sourceRecord,row.status,row.kind||"—",
       row.quantity||"—",row.symbol||"—",row.code]) {
       const td=document.createElement("td");td.textContent=String(value);
       tr.appendChild(td);
     }
     rows.appendChild(tr);
   }
   download.disabled=report.candidateRecords===0;
   state.textContent=String(report.candidateRecords)+" review-only candidates in "+
     String(report.sourceRecords)+" rows. No remote request, wallet, upload or payment.";
 }catch(err) {
   clear();
   state.textContent="Input rejected: "+String(err.message).slice(0,120)+". No upload.";
 }
});
download.addEventListener("click",()=>{
 if(!current||!current.candidateRecords)return;
 const csv=candidateReviewCSV(current);
 const uri=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 const anchor=document.createElement("a");
 anchor.href=uri;
 anchor.download="crypto-narrative-REVIEW-ONLY.csv";
 anchor.click();
 setTimeout(()=>URL.revokeObjectURL(uri),1000);
});
state.textContent="Entirely local. Load fictional sample or choose your own file.";
