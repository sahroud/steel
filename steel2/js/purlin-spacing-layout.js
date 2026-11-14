/* SAHROUD STEEL - Purlin spacing layout
   Selects the fewest equal bays whose actual spacing does not exceed
   the user-requested maximum. The ridge is one shared station.
*/
(function(root){
  "use strict";
  function calculate(slopeLengthM, requestedMaxSpacingM){
    if(!Number.isFinite(slopeLengthM)||slopeLengthM<=0||
       !Number.isFinite(requestedMaxSpacingM)||requestedMaxSpacingM<=0)
      return {ok:false,status:"insufficient_data",reason:"طول شیب و حداکثر فاصله مجاز پرلین باید مثبت و معتبر باشند."};
    const intervals=Math.max(1,Math.ceil(slopeLengthM/requestedMaxSpacingM-1e-10));
    const actualSpacingM=slopeLengthM/intervals;
    const stations=Array.from({length:intervals+1},(_,i)=>slopeLengthM*i/intervals);
    return {ok:true,status:"ok",intervals,actualSpacingM,requestedMaxSpacingM,
      maxSpacingM:actualSpacingM,stationCount:stations.length,stations,
      satisfiesMaximum:actualSpacingM<=requestedMaxSpacingM+1e-9,
      note:"کمترین تعداد فاصله مساوی انتخاب شده که از فاصله درخواستی بیشتر نشود؛ خط‌الرأس فقط یک ایستگاه مشترک دارد."};
  }
  function selfTest(){
    const tests=[];
    const add=(name,pass)=>tests.push({name,pass:!!pass});
    const a=calculate(10,1);
    add("1 m request produces exact 1 m spacing",a.ok&&a.intervals===10&&Math.abs(a.actualSpacingM-1)<1e-9);
    const b=calculate(10.4,1);
    add("spacing is nearest valid value below requested maximum",b.ok&&b.intervals===11&&b.actualSpacingM<=1&&b.actualSpacingM>0.94);
    add("minimum interval count is selected",b.ok&&b.intervals===Math.ceil(10.4));
    add("ridge is represented once",b.ok&&b.stations.filter(x=>Math.abs(x-10.4)<1e-9).length===1);
    add("invalid dimensions are rejected",!calculate(0,1).ok&&!calculate(10,0).ok);
    add("no station gap exceeds requested value",b.ok&&b.stations.slice(1).every((x,i)=>x-b.stations[i]<=1+1e-9));
    return {passed:tests.filter(x=>x.pass).length,failed:tests.filter(x=>!x.pass).length,tests};
  }
  root.SteelPurlinSpacingLayout={calculate,selfTest};
})(typeof window!=="undefined"?window:globalThis);
