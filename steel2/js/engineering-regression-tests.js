/* SAHROUD STEEL — deterministic software regression checks.
 * These are formula/software tests, not code-compliance or structural validation.
 */
(function(root){
"use strict";
function run(){
 const checks=[];
 const test=(name,fn)=>{try{const detail=fn();checks.push({name,pass:detail!==false,detail:detail===undefined?"OK":detail});}catch(e){checks.push({name,pass:false,detail:e.message});}};
 test("I-section geometry positive",()=>{const x=root.SteelSectionGeometry.calculateISection({d:300,bf:150,tw:8,tf:12});return x.A_cm2>0&&x.Ix_cm4>x.Iy_cm4&&x.J_cm4>0?"A/I/J positive; major-axis inertia exceeds minor-axis inertia":false;});
 test("I-section symmetry",()=>{const x=root.SteelSectionGeometry.calculateISection({d:300,bf:150,tw:8,tf:12});return Math.abs(x.SxTop_cm3-x.SxBottom_cm3)<1e-10?"Top/bottom elastic moduli equal":false;});
 test("I-section invalid geometry rejected",()=>{try{root.SteelSectionGeometry.calculateISection({d:20,bf:10,tw:8,tf:11});return false;}catch(e){return "Invalid geometry rejected";}});
 test("material grade defaults exposed",()=>typeof root.SteelSections.getMaterialDefaults==="function"?"Material property helper available":false);
 const result={passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks,scope:"Software/formula regression only; not independent benchmark, code verification, or design approval."};
 const host=document.getElementById("engineeringRegressionResults");if(host)host.innerHTML="<p>موفق: "+result.passed+" | ناموفق: "+result.failed+"</p><ul>"+checks.map(x=>"<li>"+(x.pass?"✓ ":"✗ ")+x.name+" — "+x.detail+"</li>").join("")+"</ul><div class='notice'>"+result.scope+"</div>";
 return result;
}
function init(){if(document.getElementById("engineeringRegressionPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="engineeringRegressionPanel";p.innerHTML="<div class='panel-title'><h3>آزمون‌های بازگشتی محاسبات پایه</h3><span class='status'>آزمون نرم‌افزاری</span></div><div class='button-grid'><button class='btn secondary' id='btnEngineeringRegression' type='button'>اجرای آزمون‌ها</button></div><div id='engineeringRegressionResults'></div>";const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);document.getElementById("btnEngineeringRegression").addEventListener("click",run);}
root.SteelEngineeringRegression={run};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
