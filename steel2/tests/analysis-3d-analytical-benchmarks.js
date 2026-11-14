/* SAHROUD STEEL — analytical benchmark suite for the 3D frame solver.
 * Load this after js/analysis-3d.js in a browser or Node-like global context.
 * References are closed-form Euler-Bernoulli / axial-bar solutions.
 * This suite is not an independent certification or a building-code check.
 */
(function(root){
  "use strict";
  function run(){
    const api=root.SteelFrame3D;
    if(!api||typeof api.analyze!=="function")throw new Error("SteelFrame3D.analyze is not loaded.");
    const E=200e9,G=77e9,A=0.01,Iy=8e-5,Iz=2e-5,J=1e-5;
    const section={E,G,A,Iy,Iz,J};
    const close=(a,b,tol)=>Number.isFinite(a)&&Math.abs(a-b)<=Math.max(Math.abs(b)*tol,1e-12);
    const base={sectionResolver:()=>section};
    const tests=[];
    const record=(name,actual,expected,tol,extra)=>{
      const ok=close(actual,expected,tol);
      tests.push({name,ok,actual,expected,...(extra||{})});
    };
    const node=(id,x,y=0,z=0)=>({id,x,y,z});
    const member=(id,start,end,load)=>({id,start,end,type:"benchmark",analysisLoad:{uniformLocal:load||[0,0,0]}});
    // 1) Cantilever with a transverse tip force: delta = P L^3 / (3 E Iz).
    try{
      const L=3,P=-1000;
      const model={nodes:[node("FIX",0),node("TIP",L)],members:[member("CANT","FIX","TIP")]};
      const r=api.analyze(model,{...base,supports:[{nodeId:"FIX",fixedDofs:[0,1,2,3,4,5]}],nodalLoads:[{nodeId:"TIP",values:[0,P,0,0,0,0]}]});
      const actual=r.displacements.find(x=>x.nodeId==="TIP").values[1];
      const expected=P*Math.pow(L,3)/(3*E*Iz);
      record("cantilever-tip-deflection",actual,expected,1e-7,{equilibriumOk:r.equilibrium.ok,expectedReactionN:-P});
      tests[tests.length-1].ok=tests[tests.length-1].ok&&r.equilibrium.ok;
    }catch(e){tests.push({name:"cantilever-tip-deflection",ok:false,error:String(e.message||e)});}
    // 2) Two axial elements in series: total extension = P L / (E A).
    try{
      const L=4,P=1000;
      const model={nodes:[node("A0",0),node("A1",L/2),node("A2",L)],members:[member("AX1","A0","A1"),member("AX2","A1","A2")]};
      const supports=[
        {nodeId:"A0",fixedDofs:[0,1,2,3,4,5]},
        {nodeId:"A1",fixedDofs:[1,2,3,4,5]},
        {nodeId:"A2",fixedDofs:[1,2,3,4,5]}
      ];
      const r=api.analyze(model,{...base,supports,nodalLoads:[{nodeId:"A2",values:[P,0,0,0,0,0]}]});
      const actual=r.displacements.find(x=>x.nodeId==="A2").values[0];
      const expected=P*L/(E*A);
      record("two-element-axial-extension",actual,expected,1e-7,{equilibriumOk:r.equilibrium.ok,memberCount:r.memberCount});
      tests[tests.length-1].ok=tests[tests.length-1].ok&&r.equilibrium.ok;
    }catch(e){tests.push({name:"two-element-axial-extension",ok:false,error:String(e.message||e)});}
    // 3) Simply supported two-element beam under UDL:
    // midspan deflection = 5 w L^4 / (384 E Iz).
    try{
      const L=6,q=-1000,w=Math.abs(q);
      const model={nodes:[node("S0",0),node("SM",L/2),node("S2",L)],
        members:[member("SB1","S0","SM",[0,q,0]),member("SB2","SM","S2",[0,q,0])]};
      const supports=[
        {nodeId:"S0",fixedDofs:[0,1,2,3,4]},
        {nodeId:"S2",fixedDofs:[1,2,3,4]}
      ];
      const r=api.analyze(model,{...base,supports});
      const actual=r.displacements.find(x=>x.nodeId==="SM").values[1];
      const expected=-5*w*Math.pow(L,4)/(384*E*Iz);
      record("two-element-simply-supported-udl-midspan-deflection",actual,expected,2e-6,{equilibriumOk:r.equilibrium.ok,expectedVerticalReactionEachEnd:w*L/2});
      tests[tests.length-1].ok=tests[tests.length-1].ok&&r.equilibrium.ok;
      const ry=r.reactions.reduce((s,x)=>s+(x.values[1]||0),0);
      record("simply-supported-udl-total-vertical-reaction",ry,w*L,1e-7,{equilibriumOk:r.equilibrium.ok});
      tests[tests.length-1].ok=tests[tests.length-1].ok&&r.equilibrium.ok;
    }catch(e){tests.push({name:"simply-supported-udl-midspan-deflection-and-reactions",ok:false,error:String(e.message||e)});}
    const passed=tests.filter(t=>t.ok).length;
    return {suite:"analytical-reference-benchmarks",version:1,passed,failed:tests.length-passed,total:tests.length,
      referenceBasis:"closed-form axial bar and Euler-Bernoulli beam equations",
      note:"These analytical benchmarks test selected linear-elastic solver responses. They do not validate a complete portal frame, tapered members, second-order effects, code compliance, or an entire shed model.",
      tests};
  }
  root.SahroudSteelAnalyticalBenchmarks={run};
})(typeof window!=="undefined"?window:globalThis);
