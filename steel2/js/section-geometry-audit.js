/* SAHROUD STEEL — geometric cross-check for prismatic symmetric welded I-sections.
 * Dimensions in mm; outputs in cm²/cm³/cm⁴. Sharp-corner idealization only.
 * Does not overwrite user section properties or certify tapered members.
 */
(function(root){
"use strict";
const $=id=>document.getElementById(id);
const keys=[["column","ستون"],["rafter","رفتر"]];
let data={schemaVersion:1,groups:{}},last={};
const fields=[["d","ارتفاع کل d (mm)"],["bf","عرض بال bf (mm)"],["tw","ضخامت جان tw (mm)"],["tf","ضخامت بال tf (mm)"]];
function calculateISection(v){
 const d=Number(v.d),bf=Number(v.bf),tw=Number(v.tw),tf=Number(v.tf);
 if(![d,bf,tw,tf].every(x=>Number.isFinite(x)&&x>0))throw Error("همه ابعاد باید عدد مثبت باشند.");
 if(d<=2*tf||bf<=tw)throw Error("ابعاد نامعتبر است: باید d>2tf و bf>tw باشد.");
 const hw=d-2*tf;
 const A=2*bf*tf+hw*tw;
 const Ix=(bf*Math.pow(d,3)-(bf-tw)*Math.pow(hw,3))/12;
 const Iy=(2*tf*Math.pow(bf,3)+hw*Math.pow(tw,3))/12;
 const Sx=Ix/(d/2),Sy=Iy/(bf/2);
 const J=(2*bf*Math.pow(tf,3)+hw*Math.pow(tw,3))/3;
 return {A_cm2:A/100,Ix_cm4:Ix/1e4,Iy_cm4:Iy/1e4,SxTop_cm3:Sx/1e3,SxBottom_cm3:Sx/1e3,Sy_cm3:Sy/1e3,J_cm4:J/1e4,webHeight_mm:hw,assumptions:["مقطع I متقارن و منشوری","گوشه‌های تیز؛ بدون لحاظ شعاع نورد، پخ یا جوش","J برآورد نوارهای نازک باز؛ بدون ثابت تابیدگی Cw","برای رفتر متغیرالعمق/تیرورق شیبدار، این مدل به‌تنهایی کافی نیست"]};
}
function read(){
 keys.forEach(([k])=>{const row={};fields.forEach(([f])=>row[f]=$( "sga_"+k+"_"+f)?.value===""?null:Number($("sga_"+k+"_"+f)?.value));data.groups[k]=row;});
 return getData();
}
function getData(){return JSON.parse(JSON.stringify(data));}
function setData(v){if(!v||typeof v!=="object")return;data={schemaVersion:1,groups:{}};keys.forEach(([k])=>{const x=v.groups?.[k]||{};data.groups[k]={};fields.forEach(([f])=>data.groups[k][f]=x[f]===undefined||x[f]===null||x[f]===""?null:Number(x[f]));});render();}
function fmt(n,d=2){return Number(n).toLocaleString("fa-IR",{maximumFractionDigits:d});}
function compare(group,calc){
 const sec=window.SteelSections?.read?.(),ref=sec?.[group];if(!ref)return [];
 const pairs=[["A_cm2","A"],["Ix_cm4","Ix"],["Iy_cm4","Iy"],["SxTop_cm3","SxTop"],["SxBottom_cm3","SxBottom"],["Sy_cm3","Sy"]];
 return pairs.filter(([a])=>Number(ref[a])>0).map(([a,b])=>{const x=Number(ref[a]),y=calc[a];return {name:a,entered:x,calculated:y,deltaPct:(y-x)/x*100};});
}
function run(){
 read();const out=[];
 keys.forEach(([k,label])=>{try{const c=calculateISection(data.groups[k]);last[k]=c;const cmp=compare(k,c);out.push("<h4>"+label+"</h4><p>A="+fmt(c.A_cm2)+" cm² | Ix="+fmt(c.Ix_cm4)+" cm⁴ | Iy="+fmt(c.Iy_cm4)+" cm⁴</p><p>Sx="+fmt(c.SxTop_cm3)+" cm³ | Sy="+fmt(c.Sy_cm3)+" cm³ | J≈"+fmt(c.J_cm4)+" cm⁴</p>");if(cmp.length)out.push("<table class='data-table'><thead><tr><th>خاصیت</th><th>ثبت‌شده</th><th>محاسبه هندسی</th><th>اختلاف %</th></tr></thead><tbody>"+cmp.map(x=>"<tr><td>"+x.name+"</td><td>"+fmt(x.entered,3)+"</td><td>"+fmt(x.calculated,3)+"</td><td>"+fmt(x.deltaPct,2)+"</td></tr>").join("")+"</tbody></table>");else out.push("<p>خواص ثبت‌شده برای مقایسه موجود نیست.</p>");}catch(e){out.push("<h4>"+label+"</h4><p style='color:#b45309'>"+e.message+"</p>");}});
 const host=$("sectionGeometryAuditResults");if(host)host.innerHTML=out.join("")+"<div class='notice'>این محاسبه فقط کنترل هندسی مقطع I متقارن منشوری است. اختلاف خواص باید بررسی شود؛ هیچ مقداری خودکار جایگزین داده اصلی نمی‌شود. برای رفترهای متغیرعمق، مقاطع نامتقارن، ورق تقویتی و مقاطع سردنورد از این مدل استفاده نکنید.</div>";
 return {results:last};
}
function render(){
 const host=$("sectionGeometryAuditContent");if(!host)return;
 host.innerHTML="<div class='notice'>ابعاد مقطع I متقارن منشوری را بر حسب میلی‌متر وارد کنید. خروجی با خواص ثبت‌شده در پنل مقاطع مقایسه می‌شود؛ داده اصلی تغییر نمی‌کند.</div>"+
 keys.map(([k,label])=>"<details class='sub-panel' open><summary>"+label+" — هندسه مقطع I</summary><div class='form-grid'>"+fields.map(([f,l])=>"<div class='field'><label for='sga_"+k+"_"+f+"'>"+l+"</label><input id='sga_"+k+"_"+f+"' type='number' min='0' step='0.1' value='"+(data.groups[k]?.[f]??"")+"'></div>").join("")+"</div></details>").join("")+
 "<div class='button-grid'><button class='btn primary' type='button' id='btnSectionGeometryAudit'>محاسبه و مقایسه خواص</button></div><div id='sectionGeometryAuditResults'></div>";
 $("btnSectionGeometryAudit").addEventListener("click",run);
}
function init(){if($("sectionGeometryAuditPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="sectionGeometryAuditPanel";p.innerHTML="<div class='panel-title'><h3>کنترل مستقل هندسه مقاطع I</h3><span class='status'>ابزار تطبیق خواص</span></div><div id='sectionGeometryAuditContent'></div>";const anchor=$("steelSectionsPanel");if(anchor?.parentNode)anchor.parentNode.insertBefore(p,anchor.nextSibling);else main.appendChild(p);render();}
root.SteelSectionGeometry={calculateISection,getData,read,setData,run,getLast:()=>JSON.parse(JSON.stringify(last))};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
