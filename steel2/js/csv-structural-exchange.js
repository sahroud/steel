/* SAHROUD STEEL — CSV structural exchange parser (proposal-only).
 * Explicit units and coordinate metadata are mandatory. No solver activation.
 */
(function(root){"use strict";
function csvRows(text){
 if(typeof text!=="string")throw new TypeError("CSV input must be text");
 const rows=[];let row=[],field="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
  else if(c==='"'){if(field.length)throw new Error("Quote inside unquoted field");quoted=true;}
  else if(c===","){row.push(field);field="";}
  else if(c==="\n"||c==="\r"){if(c==="\r"&&text[i+1]==="\n")i++;row.push(field);field="";if(row.some(v=>v.trim()!==""))rows.push(row);row=[];}
  else field+=c;
 }
 if(quoted)throw new Error("Unclosed quoted field");
 row.push(field);if(row.some(v=>v.trim()!==""))rows.push(row);
 if(!rows.length)return [];
 const headers=rows.shift().map(x=>x.trim());
 if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw new Error("CSV headers must be non-empty and unique");
 return rows.map((cells,index)=>{if(cells.length!==headers.length)throw new Error("CSV row "+(index+2)+" has "+cells.length+" cells; expected "+headers.length);const o={};headers.forEach((h,i)=>o[h]=cells[i]);return o;});
}
function buildProposal(input){
 const issues=[],warnings=[];
 if(!input||!["m","mm"].includes(input.lengthUnit))issues.push("lengthUnit must explicitly be m or mm");
 if(!input||typeof input.coordinateSystem!=="string"||!input.coordinateSystem.trim())issues.push("coordinateSystem/origin convention is required");
 if(!input||!input.nodesCsv||!input.membersCsv)issues.push("both node and member CSV tables are required");
 if(issues.length)return {success:false,issues,warnings,proposal:null,solverEligible:false,designApproved:false};
 let nr,mr;try{nr=csvRows(input.nodesCsv);mr=csvRows(input.membersCsv);}catch(e){return {success:false,issues:[e.message],warnings,proposal:null,solverEligible:false,designApproved:false};}
 const required=(rows,cols,label)=>{if(!rows.length){issues.push(label+" table is empty");return;}cols.forEach(k=>{if(!(k in rows[0]))issues.push(label+" missing column "+k);});};
 required(nr,["node_id","x","y","z"],"nodes");required(mr,["member_id","start_node","end_node","section_ref"],"members");
 if(issues.length)return {success:false,issues,warnings,proposal:null,solverEligible:false,designApproved:false};
 const factor=input.lengthUnit==="mm"?0.001:1,nodes=[],members=[],nodeIds=new Set(),memberIds=new Set();
 nr.forEach((r,i)=>{const id=String(r.node_id).trim(),v=[r.x,r.y,r.z].map(Number);if(!id)issues.push("node row "+(i+2)+" has empty node_id");else if(nodeIds.has(id))issues.push("duplicate node_id "+id);else nodeIds.add(id);if(v.some(x=>!Number.isFinite(x)))issues.push("node "+id+" has invalid coordinates");else nodes.push({id,x:v[0]*factor,y:v[1]*factor,z:v[2]*factor,sourceRow:i+2,raw:{x:r.x,y:r.y,z:r.z}});});
 mr.forEach((r,i)=>{const id=String(r.member_id).trim(),a=String(r.start_node).trim(),b=String(r.end_node).trim(),s=String(r.section_ref).trim();if(!id)issues.push("member row "+(i+2)+" has empty member_id");else if(memberIds.has(id))issues.push("duplicate member_id "+id);else memberIds.add(id);if(!s)issues.push("member "+id+" has empty section_ref");if(a===b)issues.push("member "+id+" has identical start/end node");if(!nodeIds.has(a)||!nodeIds.has(b))issues.push("member "+id+" references missing node "+(!nodeIds.has(a)?a:b));members.push({id,start:a,end:b,sectionRef:s,sourceRow:i+2});});
 const byId=new Map(nodes.map(n=>[n.id,n]));members.forEach(m=>{const a=byId.get(m.start),b=byId.get(m.end);if(a&&b&&Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<=1e-9)issues.push("member "+m.id+" has zero geometric length");});
 if(!input.source||typeof input.source.path!=="string"||!input.source.path.trim())warnings.push("source path missing; provenance is incomplete");
 if(members.some(m=>!m.sectionRef))warnings.push("one or more member section references are unresolved");
 const proposal={format:"SAHROUD-CSV-STRUCTURAL-PROPOSAL-1",coordinateSystem:input.coordinateSystem.trim(),source:input.source||null,lengthUnit:"m",originalLengthUnit:input.lengthUnit,nodes,members,unresolvedSections:Array.from(new Set(members.map(m=>m.sectionRef).filter(Boolean))),status:"pending_review",geometryActivation:false};
 return {success:issues.length===0,issues,warnings,proposal:issues.length?null:proposal,solverEligible:false,designApproved:false};
}
function selfTest(){
 const n="node_id,x,y,z\nN1,-1000,0,0\nN2,0,0,0",m='member_id,start_node,end_node,section_ref\nM1,N1,N2,"I 300x150"';
 const base={nodesCsv:n,membersCsv:m,lengthUnit:"mm",coordinateSystem:"Global XYZ; origin at N2",source:{path:"model/nodes.csv"}};
 const checks=[
 ["quoted CSV field parsed",buildProposal(base).proposal?.members[0].sectionRef==="I 300x150"],
 ["millimetres normalized to metres",buildProposal(base).proposal?.nodes[0].x===-1],
 ["signed coordinates preserved",buildProposal(base).proposal?.nodes[0].x===-1],
 ["missing unit rejected",!buildProposal({...base,lengthUnit:""}).success],
 ["missing coordinate system rejected",!buildProposal({...base,coordinateSystem:""}).success],
 ["duplicate node rejected",!buildProposal({...base,nodesCsv:n+"\nN1,1,2,3"}).success],
 ["missing node reference rejected",!buildProposal({...base,membersCsv:"member_id,start_node,end_node,section_ref\nM1,N1,N9,S1"}).success],
 ["zero length member rejected",!buildProposal({...base,nodesCsv:"node_id,x,y,z\nN1,0,0,0\nN2,0,0,0"}).success],
 ["malformed CSV row rejected",!buildProposal({...base,nodesCsv:n+"\nN3,1,2"}).success],
 ["proposal cannot unlock solver",buildProposal(base).solverEligible===false&&buildProposal(base).designApproved===false&&buildProposal(base).proposal.geometryActivation===false]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,failed:checks.filter(x=>!x[1]).map(x=>x[0]),tests:checks.map(x=>({name:x[0],pass:x[1]}))};
}

function auditProposal(proposal,options){
 const opt=options||{},issues=[],warnings=[];
 if(!proposal||!Array.isArray(proposal.nodes)||!Array.isArray(proposal.members))return {success:false,issues:["proposal must contain nodes and members arrays"],warnings,summary:null,solverEligible:false,designApproved:false};
 const tol=Number.isFinite(opt.coordinateToleranceM)&&opt.coordinateToleranceM>0?opt.coordinateToleranceM:1e-6;
 const ids=new Set(),degree=new Map(),adj=new Map(),coords=new Map();let duplicateCoordinatePairs=0;
 proposal.nodes.forEach(n=>{ids.add(n.id);degree.set(n.id,0);adj.set(n.id,[]);const key=[n.x,n.y,n.z].map(v=>Math.round(v/tol)).join("|");if(coords.has(key)){duplicateCoordinatePairs++;warnings.push("nodes "+coords.get(key)+" and "+n.id+" have coincident/near-coincident coordinates within "+tol+" m");}else coords.set(key,n.id);});
 const seenMembers=new Set();let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],orphan=[];
 proposal.nodes.forEach(n=>[n.x,n.y,n.z].forEach((v,i)=>{if(Number.isFinite(v)){min[i]=Math.min(min[i],v);max[i]=Math.max(max[i],v);}}));
 proposal.members.forEach(m=>{if(seenMembers.has(m.id))issues.push("duplicate member id "+m.id);seenMembers.add(m.id);if(!ids.has(m.start)||!ids.has(m.end)){issues.push("member "+m.id+" references missing node");return;}degree.set(m.start,(degree.get(m.start)||0)+1);degree.set(m.end,(degree.get(m.end)||0)+1);adj.get(m.start).push(m.end);adj.get(m.end).push(m.start);});
 degree.forEach((d,id)=>{if(d===0)orphan.push(id);});
 if(orphan.length)warnings.push("unconnected/orphan nodes: "+orphan.join(", "));
 const components=[],visited=new Set();
 proposal.nodes.forEach(n=>{if(visited.has(n.id))return;const stack=[n.id],part=[];visited.add(n.id);while(stack.length){const id=stack.pop();part.push(id);(adj.get(id)||[]).forEach(next=>{if(!visited.has(next)){visited.add(next);stack.push(next);}});}components.push(part);});
 if(components.length>1)warnings.push("geometry contains "+components.length+" disconnected components; this is informational and may be intentional");
 const lengths=proposal.members.map(m=>{const a=proposal.nodes.find(n=>n.id===m.start),b=proposal.nodes.find(n=>n.id===m.end);return a&&b?Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z):null;}).filter(Number.isFinite);
 const summary={nodeCount:proposal.nodes.length,memberCount:proposal.members.length,componentCount:components.length,componentNodeCounts:components.map(c=>c.length),orphanNodeIds:orphan,duplicateOrNearCoordinatePairs:duplicateCoordinatePairs,coordinateBoundsM:{min,max},memberLengthM:lengths.length?{min:Math.min(...lengths),max:Math.max(...lengths)}:null,coordinateToleranceM:tol};
 if(!proposal.nodes.length)issues.push("proposal has no nodes");
 if(!proposal.members.length)warnings.push("proposal has no members");
 return {success:issues.length===0,issues,warnings,summary,components,solverEligible:false,designApproved:false,geometryActivation:false};
}
function auditSelfTest(){
 const p={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:2,y:0,z:0},{id:"C",x:5,y:0,z:0},{id:"D",x:5,y:0,z:0},{id:"E",x:9,y:0,z:0}],members:[{id:"M1",start:"A",end:"B"},{id:"M2",start:"C",end:"D"}]};
 const r=auditProposal(p),checks=[
 ["counts reported",r.summary.nodeCount===5&&r.summary.memberCount===2],
 ["multiple components are warnings not fatal",r.success&&r.summary.componentCount===3],
 ["orphan nodes detected",r.summary.orphanNodeIds.join(",")==="E"],
 ["coincident coordinates warned",r.warnings.some(x=>x.includes("coincident"))],
 ["component sizes retained",r.summary.componentNodeCounts.join(",")==="2,2,1"],
 ["solver and approval remain blocked",r.solverEligible===false&&r.designApproved===false&&r.geometryActivation===false],
 ["empty proposal rejected",auditProposal({nodes:[],members:[]}).success===false]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,failed:checks.filter(x=>!x[1]).map(x=>x[0]),tests:checks.map(x=>({name:x[0],pass:x[1]}))};
}


function parseSupplementalTables(proposal,input){
 const issues=[],warnings=[],result={supports:[],releases:[],sectionStations:[]};
 if(!proposal||!Array.isArray(proposal.nodes)||!Array.isArray(proposal.members))return {success:false,issues:["valid geometry proposal is required"],warnings,data:null,solverEligible:false,designApproved:false};
 const nodeIds=new Set(proposal.nodes.map(n=>n.id)),memberIds=new Set(proposal.members.map(m=>m.id));
 const dofs=["ux","uy","uz","rx","ry","rz"];
 function readTable(text,label,requiredHeaders){if(typeof text!=="string"||!text.trim())return [];let rows;try{rows=csvRows(text);}catch(e){issues.push(label+": "+e.message);return [];}if(!rows.length){issues.push(label+" table is empty");return [];}requiredHeaders.forEach(h=>{if(!(h in rows[0]))issues.push(label+" missing column "+h);});return rows;}
 if(input&&input.supportsCsv){
  const rows=readTable(input.supportsCsv,"supports",["node_id",...dofs]),seen=new Set();
  rows.forEach((r,i)=>{const id=String(r.node_id||"").trim();if(!nodeIds.has(id))issues.push("supports row "+(i+2)+" references unknown node "+id);if(seen.has(id))issues.push("duplicate support definition for node "+id);seen.add(id);const restraints={};dofs.forEach(k=>{const v=String(r[k]||"").trim().toUpperCase();if(!["FIXED","FREE"].includes(v))issues.push("supports row "+(i+2)+" "+k+" must be FIXED or FREE; springs are not supported");else restraints[k]=v;});result.supports.push({nodeId:id,restraints,sourceRow:i+2});});
 }
 if(input&&input.releasesCsv){
  const rows=readTable(input.releasesCsv,"releases",["member_id","end",...dofs]),seen=new Set();
  rows.forEach((r,i)=>{const id=String(r.member_id||"").trim(),end=String(r.end||"").trim().toUpperCase(),key=id+"|"+end;if(!memberIds.has(id))issues.push("release row "+(i+2)+" references unknown member "+id);if(!["I","J"].includes(end))issues.push("release row "+(i+2)+" end must be I or J");if(seen.has(key))issues.push("duplicate release definition "+key);seen.add(key);const releases={};dofs.forEach(k=>{const v=String(r[k]||"").trim().toUpperCase();if(!["RELEASED","CONNECTED"].includes(v))issues.push("release row "+(i+2)+" "+k+" must be RELEASED or CONNECTED");else releases[k]=v;});result.releases.push({memberId:id,end,releases,sourceRow:i+2});});
 }
 if(input&&input.sectionStationsCsv){
  if(!input.sectionDimensionUnit||!["mm","m"].includes(input.sectionDimensionUnit))issues.push("sectionDimensionUnit must explicitly be mm or m");
  const rows=readTable(input.sectionStationsCsv,"section stations",["member_id","station_ratio","d","bf","tw","tf"]),seen=new Set(),factor=input.sectionDimensionUnit==="mm"?0.001:1;
  rows.forEach((r,i)=>{const id=String(r.member_id||"").trim(),ratio=Number(r.station_ratio),key=id+"|"+ratio;if(!memberIds.has(id))issues.push("section station row "+(i+2)+" references unknown member "+id);if(!Number.isFinite(ratio)||ratio<0||ratio>1)issues.push("section station row "+(i+2)+" station_ratio must be within [0,1]");if(seen.has(key))issues.push("duplicate section station "+key);seen.add(key);const dims={};["d","bf","tw","tf"].forEach(k=>{const v=Number(r[k]);if(!Number.isFinite(v)||v<=0)issues.push("section station row "+(i+2)+" "+k+" must be positive");else dims[k]=v*factor;});result.sectionStations.push({memberId:id,stationRatio:ratio,dimensionsM:dims,originalUnit:input.sectionDimensionUnit,sourceRow:i+2});});
  const grouped=new Map();result.sectionStations.forEach(x=>{if(!grouped.has(x.memberId))grouped.set(x.memberId,[]);grouped.get(x.memberId).push(x.stationRatio);});
  grouped.forEach((stations,id)=>{stations.sort((a,b)=>a-b);if(stations[0]!==0||stations[stations.length-1]!==1)warnings.push("member "+id+" section stations do not include both 0 and 1 endpoints");});
 }
 if(!input||(!input.supportsCsv&&!input.releasesCsv&&!input.sectionStationsCsv))warnings.push("no supplemental tables supplied");
 return {success:issues.length===0,issues,warnings,data:issues.length?null:result,status:"pending_review",geometryActivation:false,solverEligible:false,designApproved:false};
}
function supplementalSelfTest(){
 const p={nodes:[{id:"N1"},{id:"N2"}],members:[{id:"M1"}]};
 const base={supportsCsv:"node_id,ux,uy,uz,rx,ry,rz\nN1,FIXED,FIXED,FIXED,FREE,FREE,FREE",releasesCsv:"member_id,end,ux,uy,uz,rx,ry,rz\nM1,I,CONNECTED,CONNECTED,CONNECTED,RELEASED,RELEASED,RELEASED",sectionStationsCsv:"member_id,station_ratio,d,bf,tw,tf\nM1,0,500,200,10,16\nM1,1,300,150,8,12",sectionDimensionUnit:"mm"};
 const r=parseSupplementalTables(p,base),checks=[
 ["valid restraints and releases parsed",r.success&&r.data.supports.length===1&&r.data.releases.length===1],
 ["section dimensions normalized to metres",r.data?.sectionStations[0].dimensionsM.d===0.5],
 ["unknown node rejected",!parseSupplementalTables(p,{...base,supportsCsv:base.supportsCsv.replace("N1,","NX,")}).success],
 ["unknown member rejected",!parseSupplementalTables(p,{...base,releasesCsv:base.releasesCsv.replace("M1,","MX,")}).success],
 ["invalid restraint token rejected",!parseSupplementalTables(p,{...base,supportsCsv:base.supportsCsv.replace("FIXED","SPRING")}).success],
 ["invalid station ratio rejected",!parseSupplementalTables(p,{...base,sectionStationsCsv:base.sectionStationsCsv.replace("M1,0,","M1,1.2,")}).success],
 ["missing section unit rejected",!parseSupplementalTables(p,{...base,sectionDimensionUnit:""}).success],
 ["supplemental proposal cannot activate solver",r.solverEligible===false&&r.designApproved===false&&r.geometryActivation===false]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,failed:checks.filter(x=>!x[1]).map(x=>x[0]),tests:checks.map(x=>({name:x[0],pass:x[1]}))};
}


function compareProposals(candidate,reference,options){
 const opt=options||{},issues=[],warnings=[],tol=Number.isFinite(opt.coordinateToleranceM)&&opt.coordinateToleranceM>0?opt.coordinateToleranceM:0.001;
 if(!candidate||!reference||!Array.isArray(candidate.nodes)||!Array.isArray(reference.nodes)||!Array.isArray(candidate.members)||!Array.isArray(reference.members))return {success:false,issues:["candidate and reference proposals with nodes/members are required"],warnings,report:null,solverEligible:false,designApproved:false};
 const refNodes=new Map(reference.nodes.map(n=>[n.id,n])),refMembers=new Map(reference.members.map(m=>[m.id,m])),canNodes=new Map(candidate.nodes.map(n=>[n.id,n])),canMembers=new Map(candidate.members.map(m=>[m.id,m]));
 const nodeMatches=[],memberMatches=[],unmatchedCandidateNodes=[],unmatchedReferenceNodes=[],unmatchedCandidateMembers=[],unmatchedReferenceMembers=[];
 let maxNodeDeviation=0,orientationReversals=0,sectionMismatches=0;
 candidate.nodes.forEach(n=>{const r=refNodes.get(n.id);if(!r){unmatchedCandidateNodes.push(n.id);return;}const delta=Math.hypot(n.x-r.x,n.y-r.y,n.z-r.z);maxNodeDeviation=Math.max(maxNodeDeviation,delta);nodeMatches.push({id:n.id,deviationM:delta,withinTolerance:delta<=tol});});
 reference.nodes.forEach(n=>{if(!canNodes.has(n.id))unmatchedReferenceNodes.push(n.id);});
 candidate.members.forEach(m=>{const r=refMembers.get(m.id);if(!r){unmatchedCandidateMembers.push(m.id);return;}const same=m.start===r.start&&m.end===r.end,reverse=m.start===r.end&&m.end===r.start;if(reverse)orientationReversals++;if(!same&&!reverse)issues.push("member "+m.id+" endpoint IDs differ from reference");if(m.sectionRef!==r.sectionRef)sectionMismatches++;memberMatches.push({id:m.id,orientation:same?"same":reverse?"reversed":"different",sectionMatch:m.sectionRef===r.sectionRef});});
 reference.members.forEach(m=>{if(!canMembers.has(m.id))unmatchedReferenceMembers.push(m.id);});
 const outside=nodeMatches.filter(x=>!x.withinTolerance);
 if(outside.length)warnings.push(outside.length+" matched nodes exceed coordinate tolerance "+tol+" m");
 if(unmatchedCandidateNodes.length||unmatchedReferenceNodes.length)warnings.push("candidate/reference node inventories differ");
 if(unmatchedCandidateMembers.length||unmatchedReferenceMembers.length)warnings.push("candidate/reference member inventories differ");
 if(orientationReversals)warnings.push(orientationReversals+" members have reversed I/J orientation relative to reference");
 if(sectionMismatches)warnings.push(sectionMismatches+" matched members have different section references");
 const report={candidateNodeCount:candidate.nodes.length,referenceNodeCount:reference.nodes.length,candidateMemberCount:candidate.members.length,referenceMemberCount:reference.members.length,matchedNodeCount:nodeMatches.length,matchedMemberCount:memberMatches.length,maxNodeDeviationM:maxNodeDeviation,coordinateToleranceM:tol,nodesOutsideTolerance:outside.map(x=>x.id),unmatchedCandidateNodes,unmatchedReferenceNodes,unmatchedCandidateMembers,unmatchedReferenceMembers,orientationReversedMemberIds:memberMatches.filter(x=>x.orientation==="reversed").map(x=>x.id),sectionMismatchMemberIds:memberMatches.filter(x=>!x.sectionMatch).map(x=>x.id)};
 return {success:issues.length===0,issues,warnings,report,nodeMatches,memberMatches,status:"comparison_only",geometryActivation:false,solverEligible:false,designApproved:false};
}
function comparisonSelfTest(){
 const a={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:2,y:0,z:0}],members:[{id:"M",start:"A",end:"B",sectionRef:"S1"}]};
 const b={nodes:[{id:"A",x:0,y:0,z:0},{id:"B",x:2.01,y:0,z:0},{id:"C",x:4,y:0,z:0}],members:[{id:"M",start:"B",end:"A",sectionRef:"S2"},{id:"N",start:"A",end:"C",sectionRef:"S3"}]};
 const r=compareProposals(a,b,{coordinateToleranceM:0.001}),checks=[
 ["matching nodes identified",r.report.matchedNodeCount===2],
 ["coordinate deviation measured",Math.abs(r.report.maxNodeDeviationM-0.01)<1e-9],
 ["outside tolerance identified",r.report.nodesOutsideTolerance.includes("B")],
 ["unmatched reference node identified",r.report.unmatchedReferenceNodes.includes("C")],
 ["reversed member orientation identified",r.report.orientationReversedMemberIds.includes("M")],
 ["section mismatch identified",r.report.sectionMismatchMemberIds.includes("M")],
 ["unmatched member identified",r.report.unmatchedReferenceMembers.includes("N")],
 ["comparison cannot activate solver",r.geometryActivation===false&&r.solverEligible===false&&r.designApproved===false]
 ];
 return {passed:checks.filter(x=>x[1]).length,total:checks.length,failed:checks.filter(x=>!x[1]).map(x=>x[0]),tests:checks.map(x=>({name:x[0],pass:x[1]}))};
}

root.SteelCSVStructuralExchange=Object.freeze({csvRows,buildProposal,selfTest,auditProposal,auditSelfTest,parseSupplementalTables,supplementalSelfTest,compareProposals,comparisonSelfTest});
})(typeof window!=="undefined"?window:globalThis);
