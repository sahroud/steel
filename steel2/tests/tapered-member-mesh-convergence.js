/* SAHROUD STEEL — tapered-member mesh convergence benchmark.
 * A linearly tapered cantilever is solved with piecewise-constant midpoint sections.
 * The reference is the numerical Simpson integral of P*(L-x)^2/(E*Iz(x)).
 * This is a solver/discretization benchmark, not a code design or approval check.
 */
(function(root){
  "use strict";
  function run(){
    const api=root.SteelFrame3D;
    if(!api||typeof api.analyze!=="function")throw new Error("SteelFrame3D.analyze is not loaded.");
    const E=200e9,G=77e9,bf=0.25,tf=0.018,tw=0.010,L=8,P=10000;
    const depth=x=>0.55+0.85*x/L;
    function section(x){
      const d=depth(x),hw=d-2*tf;
      if(!(hw>0))throw new Error("Tapered section has invalid clear web depth.");
      const A=2*bf*tf+tw*hw;
      const Iz=2*(bf*Math.pow(tf,3)/12+bf*tf*Math.pow(d/2-tf/2,2))+tw*Math.pow(hw,3)/12;
      const Iy=2*(tf*Math.pow(bf,3)/12)+hw*Math.pow(tw,3)/12;
      const J=(2*bf*Math.pow(tf,3)+hw*Math.pow(tw,3))/3;
      return {E,G,A,Iy,Iz,J};
    }
    // Simpson integration of the exact variable-I Euler-Bernoulli cantilever response.
    const slices=20000,h=L/slices;
    const integrand=x=>Math.pow(L-x,2)/(E*section(x).Iz);
    let integral=integrand(0)+integrand(L);
    for(let i=1;i<slices;i++)integral+=(i%2?4:2)*integrand(i*h);
    const reference=-P*integral*h/3;
    const rows=[];
    for(const count of [2,4,8,16,32]){
      const nodes=Array.from({length:count+1},(_,i)=>({id:"T"+i,x:L*i/count,y:0,z:0}));
      const members=Array.from({length:count},(_,i)=>({id:"M"+i,start:"T"+i,end:"T"+(i+1),analysisLoad:{uniformLocal:[0,0,0]}}));
      const result=api.analyze({nodes,members},{
        supports:[{nodeId:"T0",fixedDofs:[0,1,2,3,4,5]}],
        nodalLoads:[{nodeId:"T"+count,values:[0,-P,0,0,0,0]}],
        sectionResolver:m=>section((Number(m.id.slice(1))+0.5)*L/count)
      });
      const actual=result.displacements.find(x=>x.nodeId==="T"+count).values[1];
      rows.push({segments:count,actualDeflection_m:actual,referenceDeflection_m:reference,
        relativeError:Math.abs((actual-reference)/reference),equilibriumOk:result.equilibrium.ok});
    }
    const tests=[
      {name:"all segment models satisfy solver equilibrium",ok:rows.every(x=>x.equilibriumOk)},
      {name:"mesh refinement reduces deflection error monotonically",ok:rows.every((x,i)=>i===0||x.relativeError<rows[i-1].relativeError)},
      {name:"8-segment example error below 2 percent",ok:rows.find(x=>x.segments===8).relativeError<0.02},
      {name:"16-segment example error below 0.5 percent",ok:rows.find(x=>x.segments===16).relativeError<0.005},
      {name:"32-segment example error below 0.15 percent",ok:rows.find(x=>x.segments===32).relativeError<0.0015}
    ];
    return {suite:"tapered-member-mesh-convergence",version:1,passed:tests.filter(x=>x.ok).length,
      failed:tests.filter(x=>!x.ok).length,total:tests.length,referenceMethod:"Simpson integration of P*(L-x)^2/(E*Iz(x))",
      geometry:{length_m:L,depthStart_m:depth(0),depthEnd_m:depth(L),flangeWidth_m:bf,flangeThickness_m:tf,webThickness_m:tw},
      referenceDeflection_m:reference,results:rows,tests,
      note:"One tapered cantilever benchmark only. Error thresholds here are regression targets for this example, not universal design tolerances."};
  }
  root.SahroudSteelTaperedMeshConvergence={run};
})(typeof window!=="undefined"?window:globalThis);
