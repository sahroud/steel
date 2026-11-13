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
 test("ST37 thickness bands",()=>{const fn=root.SteelSections.getMaterialDefaults;const values=[10,30,50,70,90].map(t=>fn("ST37-2",t).Fy_MPa);return values.join(",")==="235,225,215,205,195"?"235/225/215/205/195 MPa across DIN thickness bands":false;});
 test("ST37 out-of-range guard",()=>root.SteelSections.getMaterialDefaults("ST37-2",110).Fy_MPa===null?"No default beyond 100 mm":false);
 test("ST52 thickness bands",()=>{const fn=root.SteelSections.getMaterialDefaults;const values=[10,30,50,70,90].map(t=>fn("ST52-3",t).Fy_MPa);return values.join(",")==="355,345,335,325,315"?"355/345/335/325/315 MPa across DIN thickness bands":false;});
 test("tapered-section module exposed",()=>typeof root.SteelTaperedSections?.resolveForMember==="function"?"Three-station member resolver available":false);
 test("tapered-section interpolation",()=>{const r=root.SteelTaperedSections.selfTest();return r.passed===5&&r.failed===0?"Geometry, midpoint interpolation, configurable segmentation and end-release tests pass":false;});
 test("tapered sections disabled by default",()=>root.SteelTaperedSections.getData().groups.column.enabled===false&&root.SteelTaperedSections.getData().groups.rafter.enabled===false?"Existing project sections remain unchanged unless explicitly enabled":false);
 test("tapered analysis segmentation",()=>{const r=root.SteelTaperedSections.selfTest();return r.passed===5&&r.failed===0?"Geometry, interpolation, disabled default, configurable segmentation and end-release preservation pass":false;});
 test("tension audit rejects net area above gross area",()=>{const r=root.SteelTensionDesignReadiness.audit({groups:{roofBrace:{Ag_cm2:10,An_cm2:11,Ae_cm2:9,U:0.9,connectionType:"welded",connectionDetailsReviewed:true,blockShearReviewed:true}}});return r.issues.some(x=>x.includes("An نمی‌تواند"))?"Invalid net area rejected":false;});
 test("tension audit does not claim resistance",()=>{const r=root.SteelTensionDesignReadiness.audit({groups:{}});return !("Pn" in r)&&!r.capacity?"No tensile capacity is produced by readiness audit":false;});
 test("tapered 3D axial convergence against analytical integral",()=>{
  if(!root.SteelFrame3D?.analyze)return false;
  const api=root.SteelTaperedSections,old=api.getData(),E=200e9,N=100000,L=6;
  try{
   api.setData({groups:{column:{enabled:true,stations:{start:{d:500,bf:200,tw:10,tf:16},mid:{d:400,bf:200,tw:10,tf:16},end:{d:300,bf:200,tw:10,tf:16}}}}});
   const area=d=>(2*200*16+(d-2*16)*10)*1e-6;
   const half=(a,b,len)=>Math.abs(a-b)<1e-12?len/a:len*Math.log(b/a)/(b-a);
   const exact=N/E*(half(area(500),area(400),L/2)+half(area(400),area(300),L/2));
   const errors=[];
   [4,8,16].forEach(n=>{
    const raw={nodes:[{id:"B",x:0,y:0,z:0},{id:"T",x:0,y:L,z:0}],members:[{id:"C",start:"B",end:"T",sectionKey:"column",type:"column"}]};
    const model=api.segmentModel(raw,{height:L,span:12},n).model,props={};
    model.members.forEach(m=>{props[m.id]=api.resolveForMember(m,model.nodes,{height:L,span:12},{E,G:77e9,A:.01,Iy:1e-5,Iz:1e-4,J:1e-6}).section;m.analysisLoad={uniformLocal:[0,0,0]};});
    const result=root.SteelFrame3D.analyze(model,{sectionResolver:m=>props[m.id],supports:[{nodeId:"B",fixedDofs:[0,1,2,3,4,5]}],nodalLoads:[{nodeId:"T",values:[0,-N,0,0,0,0]}]});
    const delta=Math.abs(result.displacements.find(x=>x.nodeId==="T").values[1]);
    errors.push(Math.abs(delta-exact)/exact*100);
   });
   return errors[0]>errors[1]&&errors[1]>errors[2]&&errors[1]<0.01?"4/8/16-segment axial displacement converges to analytical integral; 8-segment error "+errors[1].toFixed(4)+"%":false;
  }finally{api.setData(old);}
 });
 const result={passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks,scope:"Software/formula regression only; not independent benchmark, code verification, or design approval."};
 const host=document.getElementById("engineeringRegressionResults");if(host)host.innerHTML="<p>موفق: "+result.passed+" | ناموفق: "+result.failed+"</p><ul>"+checks.map(x=>"<li>"+(x.pass?"✓ ":"✗ ")+x.name+" — "+x.detail+"</li>").join("")+"</ul><div class='notice'>"+result.scope+"</div>";
 return result;
}
function init(){if(document.getElementById("engineeringRegressionPanel"))return;const main=document.querySelector("main");if(!main)return;const p=document.createElement("section");p.className="panel";p.id="engineeringRegressionPanel";p.innerHTML="<div class='panel-title'><h3>آزمون‌های بازگشتی محاسبات پایه</h3><span class='status'>آزمون نرم‌افزاری</span></div><div class='button-grid'><button class='btn secondary' id='btnEngineeringRegression' type='button'>اجرای آزمون‌ها</button></div><div id='engineeringRegressionResults'></div>";const footer=main.querySelector("footer");if(footer)footer.insertAdjacentElement("beforebegin",p);else main.appendChild(p);document.getElementById("btnEngineeringRegression").addEventListener("click",run);}
root.SteelEngineeringRegression={run};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})(typeof window!=="undefined"?window:globalThis);
