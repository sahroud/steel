# ممیزی شکاف‌های فنی و وضعیت انطباق SAHROUD STEEL

### Reference suite count and CI status update — 2026-11-17

- The reference suite now contains 12 authored tests: six solver fixtures, four pressure/tributary-width transfer fixtures, and two triangular-gable resultant fixtures.
- The CI workflow path filter now includes `model-3d.js`, `load-transfer.js`, and `index.html` in addition to solver/tests.
- GitHub connector returned no PR-triggered workflow runs for the latest test commit, and combined commit status is empty. This is **not a passing result**; execution remains unverified and must be checked in the repository Actions UI or via a workflow-run listing endpoint that includes push-triggered runs.
- The test suite's roof tributary-width checks call the same helper now used by the geometry builder. They still do not build a complete shed or test the solver's assembled response to those loads.


### Gable wind equivalent actions — 2026-11-17

- Added `triangularGablePostEquivalentLoads` to `load-transfer.js`. It divides the complete triangular gable area into tributary cells for every post station, including both end stations; it calculates a base/top force pair for each support line.
- The equivalent force pairs preserve the signed resultant and the first moment about the base. The centroid calculation includes the eave height, so the equivalent actions are not incorrectly referenced only to the gable rise.
- Added two reference tests for complete area/force/moment conservation, edge tributaries, suction sign, and invalid eave geometry. The suite now contains 14 authored tests; execution is still unverified.
- **Not yet connected to the 3D model.** The current end-wall geometry creates separate, coincident end-wall head nodes at the eaves and does not explicitly share them with the main frame eave nodes. Applying the boundary tributary actions before resolving that connectivity would risk loading disconnected nodes and producing a misleading equilibrium result. The new helper is therefore a verified-by-formula calculation candidate, not an active design load path.
- Next required geometry step: explicitly share end-wall eave/ridge nodes with the main frame, map each end-wall post base/head to stable node IDs, then pass the calculated six-component nodal actions through the worker. Add a complete-model check for force and moment equilibrium before enabling this wind contribution.


### Triangular end-wall wind transferred into the 3D solver — 2026-11-17

- The gable equivalent-load helper now also calculates the transverse eccentricity moment about each post station. This is required because the two edge tributary strips have centroids offset from their boundary post lines; omitting this couple would conserve total force and overturning moment about the eaves but not the global moment about the vertical axis.
- The end-wall wind transfer is now assembled as six-component global nodal actions: signed Z forces at the base/head nodes and the corresponding Y-axis nodal couple at the base. Front-face positive pressure is +Z; rear-face positive pressure is -Z. Pressure values remain the existing signed net end-wall pressures in kPa.
- The worker now forwards `nodalLoads` to the 3D solver. The solver already accepts six-component nodal loads and includes their forces and moments in its global equilibrium residual.
- Geometry uses the shared-node registry (`addNode`) at coincident coordinates. The transfer now resolves every base/head by exact model coordinates and checks that base/head nodes connect to a column or end post/rafter before applying any action. Missing or disconnected nodes cause analysis to stop with an explicit error rather than silently dropping load.
- The load is applied only when the selected case is the direct wind case or a combination object carries a nonzero wind factor. The existing named combo presets do not yet carry wind factors; their wind-combination coverage remains an open item.
- Reference arithmetic check on the 12 m × 2 m gable, 6 m eave, 1.2 kPa pressure and four intervals: area 12 m², resultant 14.4 kN, global overturning moment 96 kN·m and global transverse moment -86.4 kN·m. The suite now contains 15 authored tests, including a direct solver check that a six-component nodal Y-couple participates in global moment equilibrium. All 15 test bodies were executed in a local JavaScript harness against the fetched solver/helper sources and passed; this is not a substitute for the repository's native `node --test` / GitHub Actions run. Source syntax and arithmetic invariants also passed. Full browser/model execution remains unverified.
- Important scope limit: this implementation uses a constant signed net pressure over the triangular gable region. It does not replace the official wind-pressure calculation or verify pressure coefficients, internal pressure, shielding, dominant openings, or code load combinations. Those inputs and factors still require authoritative code validation.


- Additional worker-level smoke check: executed the fetched `analysis-3d-worker.js` with a six-component nodal Y-couple. The worker returned success and the solver reported moment residual approximately (4.55\times10^{-13}) N·m, within numerical round-off. This verifies the worker-to-solver nodal-load forwarding path in isolation, not the complete generated shed.
- CI path filters now include `analysis-3d-worker.js`, `model-3d.js`, and `load-transfer.js` for both push and pull-request events, so future edits to the full transfer chain trigger the reference suite.


- Geometry smoke check: built the current 12 m × 36 m × 6 m shed geometry (2 m rise, 4 m end-post spacing) from the actual `model-3d.js` builder in a headless DOM stub. All eight front/rear base/head station pairs resolved to existing shared nodes and had the expected column/end-post/rafter connectivity. This confirms node mapping for that test geometry only; it is not a structural analysis run.


### 3D wind combination cases — 2026-11-18

- Added six selectable preliminary 3D wind cases, covering both wind signs for the three wind-containing factor patterns already present in the legacy combination controller: (0.8D+1.6W), (1.2D+1.6L_r+0.5S+0.8W), and (1.2D+1.6S+0.5L_r+0.8W).
- The factor definitions are centralized in `SteelLoadTransfer.preliminaryWindCombinations()` and consumed by the 3D load-case selector/analysis path. This avoids duplicating factor literals between UI and solver dispatch.
- Added two tests for all six case keys, both wind signs, the gravity/wind factor patterns, and immutability. The reference suite now contains 17 tests; all 17 passed in the local JavaScript harness after loading the actual solver and load-transfer modules.
- Syntax parsing passed for `model-3d.js`, `load-transfer.js`, `analysis-3d-worker.js`, `analysis-3d.js`, and the reference test file.
- These combinations mirror the existing controller's preliminary patterns; they are not a certification of Mabhas 6 factors or load applicability. Wind pressure derivation, internal/external pressure scenarios, load direction cases, and governing code edition still need authoritative validation.
- Full 3D end-to-end analysis of all six cases was not completed in this pass; the headless full-model solver attempt exceeded the execution time limit. No whole-shed analysis result is claimed.


- UI diagnostics were updated so the 3D analysis result reports the signed front/rear triangular-gable wind resultant when applied. The long-form warning no longer incorrectly claims that the triangular end-wall region is omitted; it now states that this region uses statically equivalent nodal actions and explicitly lists remaining wind-model limitations.
- Final local recheck after the UI change: syntax parsing passed for all five core JS/test files and all 17 reference tests passed in the local harness. The full native GitHub Actions run remains queued/unconfirmed; the previous observed run was still queued when last checked.


- Reduced-model end-to-end integration check completed on 2026-11-18 using the actual `model-3d.js`, `analysis-3d.js`, `analysis-3d-worker.js`, and `load-transfer.js` sources with a headless DOM/Worker harness. Test geometry: 4 m span × 4 m length, 3 m eave, 1 m rise; 32 nodes and 49 members; generic positive elastic section properties were supplied for harness purposes.
- Direct wind and all six newly added wind-combination cases solved successfully in this reduced model. Relative force residuals were between approximately (6.5\times10^{-15}) and (4.5\times10^{-14}); relative moment residuals were between approximately (1.4\times10^{-14}) and (9.9\times10^{-14}). Front/rear triangular-gable resultant signs reversed correctly with the selected wind direction and scaled by the selected wind factor.
- This is a meaningful integration smoke test of the complete software path, but it is **not** a validation of the 12 m × 36 m production project, actual section assignments, realistic stiffnesses, official wind pressures, or member design. A prior attempt to solve the full default-sized geometry in the constrained harness exceeded its execution time limit.


### Wind-zone pressure calculation refactor — 2026-11-18

- Added `SteelLoadTransfer.calculateWindZonePressures()` as the shared calculation function for the six entered roof/wall/end-wall Cp zones. It calculates basic pressure from the entered basic wind speed and returns both internal-pressure sign scenarios for each zone.
- `climate-load-engine.js` now delegates its zone calculation to this shared helper rather than maintaining a second copy of the pressure formula. Existing display labels and preliminary/unverified status remain unchanged.
- Added three reference tests for both internal-pressure signs, suction sign preservation, missing coefficient/Cp fail-closed behavior, and rejection of negative basic wind speed. The suite now contains 20 authored tests.
- **Not connected to the 3D member load path yet.** The 3D solver still consumes the existing signed manual `windLeft`, `windRight`, `windWall`, `windEndFront`, and `windEndBack` pressure inputs. The six-zone calculator remains a separate preliminary calculation/display until explicit selection of internal-pressure scenario, wind direction, and a complete mapping to the corresponding roof purlins, wall girts, end-wall girts, and triangular gable actions is implemented and tested.
- The GitHub Actions workflow is configured for push events on this branch, but the available status/run lookup returned no status records for the latest commit. Therefore the new 20-test suite has **not** been reported as passing; native Node/GitHub Actions execution remains unverified.

### Crane and second-order analysis source audit — 2026-11-18

- Reviewed the active `model-3d.js` geometry builder, 3D load-case dispatch, member-load assembly, `analysis-3d-worker.js`, and the current reference tests.
- The active 3D model does not generate runway girders, crane rails, crane wheels, crane brackets, or crane-specific load cases. The worker accepts general member loads and six-component nodal loads, but there is no crane-specific input contract or validated mapping of wheel positions/actions into the 3D frame.
- No crane wheel reactions, vertical impact allowance, transverse surge, longitudinal traction, wheel spacing, trolley position envelope, skewing, or runway-girder checks are presently assembled by this 3D workflow. These must come from documented crane supplier data and applicable code provisions; they must not be guessed from crane capacity alone.
- The current solver remains first-order linear elastic. No geometric stiffness/P-Delta iteration, eigenvalue buckling analysis, or code member-stability design is performed by the 3D solver. These remain explicit blockers to final structural design.
- Consequently, crane-enabled 3D analysis and stability design are not implemented or validated. The existing UI's crane choice must not be interpreted as evidence that crane actions are included in this 3D solver.


### Wind input validation hardening — 2026-11-18

- Hardened the shared six-zone wind-pressure helper: importance, exposure, topography, gust, directionality, and internal-gust multipliers must be finite and non-negative. Signed external and internal pressure coefficients remain signed inputs; internal pressure sign is represented by the two separate positive/negative scenarios.
- Invalid negative multipliers now fail closed (no zone pressures are returned), preventing a malformed amplification factor from silently reversing pressure direction.
- Added three reference tests: negative multiplier rejection, signed internal-pressure handling, and the zero-wind limiting case. The authored reference suite now contains 23 tests.
- This is input-validation hardening only. It does not establish official coefficient values, resolve opening/dominant-opening classifications, or connect the six-zone results to the active 3D member-load assembly. The 3D model still consumes manually entered signed net pressures for its wind load path.
- Native node test execution and GitHub Actions execution must be checked after this commit; no pass is claimed here.



### Six-zone wind member-mapping contract — 2026-11-18

- Added a pure load-transfer mapper that converts the selected internal-pressure scenario for each of six wind zones into member line loads using explicit tributary widths/heights.
- Roof left/right pressures remain separate, including two-sided ridge purlin tributaries; left/right longitudinal wall girts and front/rear end-wall girts are mapped independently.
- The mapper rejects incomplete zone results, unspecified internal-pressure scenario, invalid tributary dimensions, and missing required member groups.
- Scope limit: this is a tested mapping contract only. It is not yet wired into model-3d.js, triangular gable nodal actions, or the 3D solver. Existing manual wind inputs remain the active analysis path.

## 2026-11-18 — بازبینی اتصال باد شش‌ناحیه‌ای

- مسیر فعال تحلیل اکنون دو حالت جدید فشار داخلی مثبت/منفی دارد که فشارهای شش سطح را از `SteelClimateLoadEngine.calculateWindZones()` می‌خواند.
- انتقال بار روی کپی اعضای مدل انجام می‌شود؛ بارهای ثقلی موجود حفظ می‌شوند و مقادیر باد قبلی برای اعضای نگاشت‌شده جایگزین می‌شوند، نه اینکه با آنها جمع شوند.
- فشار دیوار انتهایی در قسمت مثلثی نیز از همان نتیجه ناحیه‌ای گرفته می‌شود تا مسیر دستی قبلی هم‌زمان فعال نشود.
- اگر داده ناقص باشد، حالت ناحیه‌ای اجرا نمی‌شود.
- تست جدید آداپتور حفظ بارهای ثقلی، جایگزینی بار باد، علامت فشار وجه عقب و عدم تغییر مدل مبنا را پوشش می‌دهد.
- هنوز نتیجه CI آخرین commit در دسترس نیست؛ هیچ Pass اعلام نشده است.
- این مرحله تأیید آیین‌نامه‌ای نیست: Cpها، ضرایب Iw/Ce/Ct/Cg/Cgi/Cd و جهت‌گیری فشار باید از مراجع رسمی و مستندات پروژه کنترل شوند؛ سپس تعادل کلی نیرو/لنگر برای مدل کامل و سناریوهای باد تأیید شود.

## 2026-11-18 — اصلاح ممیزی جهت باد و دامنه انطباق

- ممیزی مجدد نشان داد دو حالت فشار داخلی، جایگزین چهار جهت مستقل باد نیستند. اصلاح شد: ورودی Cp برای هر یک از چهار جهت اصلی و شش سطح به‌صورت مجزا ذخیره می‌شود و هشت حالت تحلیل (چهار جهت × دو حالت فشار داخلی) اضافه شد.
- تابع محاسبه فشار اکنون وجود هر شش سطح و شناسه جهت معتبر را برای ready شدن الزامی می‌کند؛ mapper نیز نتیجه بدون جهت معتبر را نمی‌پذیرد.
- هنوز هیچ ضریب Cp، Ce، Ct، Cg، Cgi یا Cd به‌عنوان مقدار آیین‌نامه‌ای خودکار یا تأییدشده اعلام نمی‌شود.
- الزامات باز برای تکمیل باد: استخراج و پیاده‌سازی مستند جداول/روابط رسمی سرعت مبنا، Ce وابسته به ارتفاع و زبری، Ct توپوگرافی، Cp هر جهت و نواحی موضعی پوشش، Cgi/Cpi متناسب با طبقه‌بندی بازشوها، بررسی حالت‌های جزئی و پیچش در صورت شمول، باد سطح بهره‌برداری و کنترل تغییرمکان، و آستانه‌های روش دینامیکی.
- ترکیبات فعلی موسوم به preliminary wind combinations آزمایشی‌اند و تا تطبیق مستقیم هفت ترکیب LRFD و ده ترکیب ASD بند ۶-۲-۳ با متن رسمی نباید برای طراحی نهایی استفاده شوند.
- P-Delta، کنترل لغزش و واژگونی پی و بررسی بارهای جرثقیل همچنان گیت‌های جداگانه و باز هستند.
- CI آخرین شاخه در زمان این ممیزی queued بوده است؛ اجرای موفق/ناموفق ثبت نشده است.

## 2026-11-18 — تکمیل کنترل باد بهره‌برداری

- هشت حالت باد بهره‌برداری با فشار مقیاس‌شده 0.64 (تقریب سرعت 0.8 برابر سرعت مبنا) به مسیر تحلیل افزوده شد.
- تابع کنترل دریفت، بیشینه جابه‌جایی نسبی گره بالای ستون نسبت به پایه متناظر را در محور باد محاسبه و با 0.0025H مقایسه می‌کند.
- در صورت نبودن گره‌های متناظر یا خروجی جابه‌جایی، نتیجه «قابل ارزیابی نیست» است و قبولی صادر نمی‌شود.
- این کنترل هنوز جایگزین کنترل کامل بهره‌برداری، ارتعاش/شتاب، باد دینامیکی یا کنترل پروژه واقعی نیست.

### Test execution note — 2026-11-18

- Syntax parsing succeeded for the updated load-transfer, climate-load-engine, model-3d, and reference-test files.
- All 34 test callbacks were executed through an isolated JavaScript harness: 34 passed, 0 failed. This is not a substitute for the repository's native `node --test` or GitHub Actions run.
- GitHub Actions for final test commit `5288fb0198728e6e24185f2ffea28c4bff3ad568` remains queued; CI is not marked passed.


## 2026-11-18 — تفکیک دامنه باد MWFRS و C&C (مانع تأیید نهایی)

- ممیزی مسیر تحلیل نشان داد نگاشت شش فشار کلی سطح به پرلین‌ها و دیوارگیرها، به‌تنهایی روش مستقل طراحی اجزای پوششی (Components & Cladding) نیست. فشارهای کلی سطح نباید بدون تعیین روش، ناحیه موضعی لبه/گوشه و سطح مؤثر بارگیر به‌عنوان بار نهایی پرلین/گرت تأیید شوند.
- خروجی mapper نسخه 1.2.0 اکنون صریحاً `applicationScope=preliminary-global-surface-pressure`، `componentsCladdingStatus=not-independently-designed` و `codeComplianceStatus=not-established` را ثبت می‌کند. هشدار دامنه در نتیجه تحلیل سه‌بعدی نیز نمایش داده می‌شود.
- این اصلاح عمداً ضریب یا ناحیه موضعی حدسی تولید نمی‌کند و ادعای انطباق را محدود می‌سازد؛ تحلیل شش‌ناحیه‌ای فعلی صرفاً مقدماتی است و برای طراحی نهایی پرلین/دیوارگیر/پوشش کافی نیست.
- گام باز: پیاده‌سازی مستقل روش MWFRS و C&C بر اساس متن رسمی مبحث ششم ۱۳۹۸، تعیین نواحی لبه/گوشه و سطح مؤثر، و اتصال بارهای C&C به اجزای مربوط با آزمون تعادل نیرو/لنگر و مثال مرجع. تا آن زمان P2/P5 باز می‌مانند.


## 2026-11-18 — تطبیق اولیه با متن مبحث ششم ۱۳۹۸ (فصل ۱۰، صفحات چاپی ۷۹ تا ۸۳)

- بررسی تصویر صفحات متن PDF با نشان منبع `inbr.ir` نشان می‌دهد ضریب Ce تابع ارتفاع مبنا و زبری/تراکم محیط است؛ برای مناطق پرتراکم و مناطق بینابینی روابط جداگانه وجود دارد. بنابراین ورود یک Ce ثابت برای تمام ارتفاع‌ها و تمام وجوه، جایگزین محاسبه ارتفاع مبنا و طبقه‌بندی محیط نیست.
- بند ۶-۱۰-۷ ضریب Ct را برای پستی‌وبلندی مؤثر زمین مطرح می‌کند؛ مقدار Ct=1 فقط در شرایط معمولی قابل فرض است، نه به‌صورت پیش‌فرض قطعی برای هر سایت.
- بند ۶-۱۰-۸ برای ساختمان‌های با ارتفاع بیش از ۲۰ متر یا نسبت ابعادی بیش از ۱، مسیر ضرایب جداگانه Cg و Cp را معرفی می‌کند؛ Cg برای نیروهای کلی سازه با Cg اجزای کوچک/پوشش متفاوت است و فشار داخلی نیز Cgi/Cpi مستقل دارد.
- بند ۶-۱۰-۹ برای ساختمان‌های با ارتفاع کمتر از ۲۰ متر و نسبت ارتفاع به عرض کمتر از ۱، استفاده مستقیم از ضرایب ترکیبی CgCp در شکل‌های ۶-۱۰-۴ تا ۶-۱۰-۱۰ را مقرر می‌کند و تصریح دارد Cg جداگانه دوباره منظور نشود.
- شکل ۶-۱۰-۳ و ضرایب ترکیبی مربوط به اجزای پوششی (C&C) از ضرایب سازه اصلی (MWFRS) مستقل‌اند؛ نوارهای کناری/گوشه و مساحت مؤثر عضو/اتصال باید در انتخاب ضریب C&C لحاظ شوند. بنابراین یک دفتر شش‌سطحی Cp بدون روش/مساحت/نواحی موضعی برای طراحی پرلین و پوشش کافی نیست.
- این تطبیق برای شناسایی شاخه روش و جداسازی دامنه‌هاست؛ جدول‌ها/شکل‌های کامل، تفسیر هندسه بام شیب‌دار سوله، نواحی و مساحت مؤثر هر عضو، بازشو غالب و روابط داخلی هنوز باید بندبه‌بند پیاده‌سازی و با مثال مستقل آزموده شوند. هیچ ضریب عددی از نمودارها حدس زده یا hard-code نشده است.


## 2026-11-18 — غربال روش ضرایب باد بر اساس هندسه

- بر اساس بندهای ۶-۱۰-۸ و ۶-۱۰-۹ مبحث ششم ویرایش ۱۳۹۸، تابع `classifyWindProcedure` به `load-transfer.js` افزوده شد. این تابع ارتفاع متوسط بام را از ارتفاع لبه به‌علاوه نصف خیز بام محاسبه و با بعد کوچک‌تر پلان مقایسه می‌کند.
- برای هندسه پیش‌فرض ۱۲×۳۶ متر، ارتفاع لبه ۶ متر و خیز ۲ متر، ارتفاع متوسط بام ۷ متر و نسبت آن به بعد کوچک‌تر پلان ۰٫۵۸۳ است؛ بنابراین شاخه غربال اولیه بند ۶-۱۰-۹ انتخاب می‌شود. در این شاخه باید ضرایب ترکیبی CgCp استفاده شوند و Cg جداگانه دوباره اعمال نشود.
- برای هندسه‌هایی که یکی از حدود ارتفاع ۲۰ متر یا نسبت ۱ را احراز نکنند، تابع روش کم‌ارتفاع را انتخاب نمی‌کند و نیاز به تعیین روش عمومی/سایر ضوابط را اعلام می‌کند.
- نتیجه غربال روش در خروجی نگاشت باد و گزارش تحلیل سه‌بعدی نمایش داده می‌شود. سه آزمون جدید برای هندسه پیش‌فرض، مرزها و ورودی ناقص اضافه شد؛ مجموعه فعلی ۳۷ تست است و هر ۳۷ callback در harness مستقل موفق شدند.
- محدودیت: این تابع فقط غربال اولیه روش است و ضرایب شکل‌ها/جدول‌ها را استخراج نمی‌کند؛ انتخاب نهایی روش باید با تمام شروط بند و هندسه واقعی کنترل شود. ضرایب C&C مستقل باقی می‌مانند. روش باد فعلی هنوز مقدماتی و وضعیت انطباق `not-established` است. اجرای native `node --test` و GitHub Actions باید جداگانه تأیید شود.


### 2026-11-18 — چارچوب هندسی سطح مؤثر باد C&C (بدون ضرایب)

- تابع calculateRectangularEffectiveWindArea به js/load-transfer.js اضافه شد.
- تابع فقط مساحت هندسی وصله مستطیلی را از عرض بارگیر و طول بارگذاری صریح محاسبه می‌کند و مبنای سطح را بین سطح شیبدار و سطح تصویرشده به‌صورت اجباری ثبت می‌کند.
- خروجی دارای verificationStatus: geometry-only-not-code-verified و pressureReady: false است؛ منبع ضریب تهی می‌ماند و هیچ فشار یا ضریب C&C تولید نمی‌شود.
- این محاسبه هنوز انتخاب ناحیه لبه/گوشه، تعیین مرزهای ناحیه، کنترل حدود سطح مؤثر در شکل‌های مبحث ششم، توزیع بار در اتصال یا انتقال بار به مدل سه‌بعدی را انجام نمی‌دهد.
- سه آزمون جدید برای محاسبه مساحت، رد ورودی ناقص و حفظ مبنای سطح افزوده شد. آزمون‌ها پس از این commit هنوز در native Node/GitHub Actions اجرا و تأیید نشده‌اند.
- تصمیم: قبول محدود برای ثبت هندسه بارگیر؛ رد برای استفاده به‌عنوان فشار باد طراحی یا تأیید C&C.


### 2026-11-18 — سطح مؤثر چندضلعی نامنظم برای C&C

- تابع calculatePolygonEffectiveWindArea به load-transfer.js اضافه شد؛ مساحت و مرکز هندسی چندضلعی ساده (شامل چندضلعی مقعر) با فرمول shoelace محاسبه می‌شود.
- مختصات غیرمحدود، رأس متوالی تکراری، چندضلعی خودمتقاطع، مساحت صفر و مبنای سطح نامشخص رد می‌شوند.
- zoneId در صورت ورود صرفاً برچسب کاربر است و هرگز به‌عنوان ناحیه آیین‌نامه‌ای تأییدشده تلقی نمی‌شود؛ coefficientSource تهی و pressureReady برابر false باقی می‌ماند.
- سه آزمون برای مساحت/مرکز چندضلعی مقعر، خودتقاطع/هندسه تباهیده و ورودی ناقص افزوده شد. آزمون CI پس از commit در انتظار اجرا/نتیجه است.
- این تابع فقط هندسه بارگیر را تکمیل می‌کند؛ تعیین نوارهای لبه/گوشه، کنترل حدود سطح مؤثر آیین‌نامه، تولید فشار، توزیع بار به تکیه‌گاه‌ها و اتصال به مدل سه‌بعدی همچنان باز است.


## 2026-11-18 — اعتبارسنجی تکمیلی چندضلعی سطح بارگیر C&C

- در بازبینی الگوریتم shoelace مشخص شد که آزمون تقاطع اضلاع، اضلاع مجاور را عمداً از بررسی زوجی حذف می‌کند؛ این رفتار برای رأس‌های معمولی درست است، اما یک برگشت هم‌خط می‌تواند باعث هم‌پوشانی دو ضلع مجاور شود و از کنترل زوجی عبور کند.
- اعتبارسنجی جدید در هر رأس، برگشت هم‌خط با هم‌پوشانی مثبت را رد می‌کند؛ ادامه هم‌خط در جهت مستقیم همچنان مجاز است.
- دو آزمون افزوده شد: رد هم‌پوشانی اضلاع مجاور و ناوردایی مساحت/مرکز هندسی در برابر معکوس‌کردن ترتیب رأس‌ها.
- شمار آزمون‌های ثبت‌شده در فایل مرجع به ۴۵ رسید. این تعداد صرفاً شمار آزمون‌های تعریف‌شده است؛ اجرای native Node یا CI موفق هنوز تأیید نشده است.
- commit کد: `77234868ae9482b71f16a32e4866c621d40d5caf`؛ commit آزمون و HEAD فعلی شاخه: `a8bf77703847afec0c3a3ed4d15ed79bc2d2eaac`.
- اجرای workflow برای HEAD فعلی هنوز در فهرست runهای PR-triggered دیده نمی‌شود؛ بنابراین وضعیت CI را موفق یا حتی در حال اجرا اعلام نمی‌کنیم.
- محدودیت پابرجا: هیچ مرز ناحیه C&C یا ضریب باد ساخته نشده است. محاسبه هندسی همچنان `pressureReady=false` و `geometry-only-not-code-verified` است.


## 2026-11-18 — هم‌پوشانی چندضلعی سطح بارگیر با ناحیه باد (هندسه مقدماتی)

- تابع `calculatePolygonWindZoneOverlap` افزوده شد. ورودی آن footprint عضو و چندضلعی ناحیه باد است؛ هر دو باید ساده و معتبر و دارای مبنای سطح یکسان (تصویرشده یا شیبدار) باشند.
- چندضلعی‌های مقعر با ear clipping به مثلث تقسیم و اشتراک مثلث‌ها با برش محدب محاسبه می‌شود؛ خروجی مساحت هم‌پوشانی و نسبت آن به مساحت footprint را ارائه می‌کند.
- کنترل صریح مبنای سطح برای footprint و zone اضافه شد. هندسه نامعتبر یا مثلث‌بندی ناموفق fail-closed است.
- خروجی همچنان `pressureReady=false`، `coefficientSource=null` و `geometry-only-not-code-verified` دارد؛ `zoneId` فقط برچسب ورودی است و هیچ ناحیه/ضریب آیین‌نامه‌ای را تأیید نمی‌کند.
- دو آزمون برای هم‌پوشانی دقیق یک footprint مقعر و ناحیه مستطیلی، و ناحیه جدا از footprint/ناسازگاری مبنای سطح تعریف شد. شمار آزمون‌های تعریف‌شده فایل مرجع اکنون ۴۷ است؛ اجرا و موفقیت آن‌ها هنوز تأیید نشده است.
- محدودیت: هنوز نواحی واقعی C&C از شکل رسمی استخراج نشده‌اند؛ هم‌پوشانی چند ناحیه با هم، پوشش کامل/عدم‌پوشش footprint، تخصیص فشار، انتقال بار و تعادل نیرو/لنگر در مراحل بعدی لازم است.


## 2026-11-18 — ممیزی مجموعه نواحی باد نسبت به سطح بارگیر

- تابع `auditPolygonWindZoneCoverage` اضافه شد تا چندضلعی‌های نواحی ورودی را نسبت به footprint یک عضو بررسی کند.
- وضعیت‌های هندسی تفکیک شدند: پوشش کامل بدون هم‌پوشانی، نواحی هم‌پوشان، و پوشش ناقص/دارای بخش خارج از footprint.
- در صورت وجود هم‌پوشانی بین نواحی، مساحت پوشش‌نیافته عمداً `null` است؛ چون جمع مساحت‌ها در این حالت معیار معتبر پوشش نیست.
- یک خطای طبقه‌بندی کشف و اصلاح شد: ناحیه‌ای که کاملاً بیرون footprint بود قبلاً می‌توانست وضعیت «پوشش کامل» بگیرد. اکنون مساحت خارج از footprint در اعتبار partition دخالت داده می‌شود.
- آزمون‌های پوشش کامل، شکاف، هم‌پوشانی و ناحیه خارج از footprint افزوده شدند. تعداد آزمون‌های تعریف‌شده در فایل مرجع: 50.
- آزمون‌های هدفمند تابع با اجرای مستقل JavaScript بررسی شدند و چهار وضعیت بالا خروجی مورد انتظار دادند. این بررسی معادل اجرای کامل node:test یا CI نیست.
- همچنان `pressureReady=false` است؛ نواحی رسمی، ضرایب، C&C و انتقال بار تأیید نشده‌اند.


## 2026-11-18 — ساخت footprint عضو از هندسه سه‌بعدی و عرض بارگیر صریح

- تابع `buildMemberTributaryFootprint` به `load-transfer.js` افزوده شد. ابتدا/انتهای واقعی عضو و بردار سه‌بعدی عرض بارگیر را دریافت می‌کند و footprint مستطیلی را در دستگاه مختصات محلی عضو می‌سازد.
- طول عضو و عرض بارگیر از بردارها محاسبه می‌شوند؛ بردار عرض باید بر محور عضو عمود باشد. طول صفر، عرض صفر، مختصات نامعتبر، بردار غیرعمود و مبنای سطح نامشخص fail-closed هستند.
- تابع هیچ فاصله پرلین، عرض بارگیر یا جهت سقفی را حدس نمی‌زند. بردار عرض باید از مدل واقعی و در همان مبنای `projected` یا `sloped-surface` استخراج شود؛ footprint محلی تا وقتی در دستگاه مشترک به نواحی تبدیل نشده، مستقیماً قابل مقایسه با zoneهای جهانی نیست.
- آزمون مرجع جدید افزوده شد؛ شمار آزمون‌های تعریف‌شده از ۵۰ به ۵۱ رسید. parse نحوی و اجرای هدفمند تابع با ورودی شیبدار، مساحت ۱۰ مترمربع، چهار رأس و رد بردار غیرعمود موفق بود. این بررسی، اجرای کامل ۵۱ آزمون یا GitHub Actions نیست.
- این helper هنوز به تولید عضوهای `model-3d.js` متصل نشده است. گام بعدی باید دستگاه مختصات مشترک برای footprint و zoneها تعریف کند و بردار عرض را از فاصله واقعی اعضای مجاور/لبه‌ها استخراج کند؛ تا آن زمان `pressureReady=false` باقی می‌ماند.


## 2026-11-18 — اتصال هندسه ایستگاه‌های واقعی پرلین به footprint سقف

- مدل‌ساز سه‌بعدی اکنون برای هر قطعه عضو `roofPurlin`، footprint سطح بارگیر را از گره‌های واقعی ابتدا/انتها و ایستگاه‌بندی واقعی پرلین‌ها تولید می‌کند.
- دستگاه مختصات هر وجه سقف `u` از لبه بام تا تاج و `z` در امتداد طول سالن است؛ مساحت footprint در مبنای سطح شیبدار محاسبه می‌شود.
- عرض بارگیر از فاصله ایستگاه‌های واقعی سقف و مرزهای نیم‌فاصله‌ای استخراج و در لبه بام/تاج clip می‌شود؛ سطح بارگیر پرلین تاج به دو footprint مستقل چپ و راست تفکیک می‌شود.
- گره مفقود، هندسه عضو غیرطولی یا ابعاد صفر باعث توقف ساخت footprint می‌شود. خروجی در `model.windFootprints` و `SteelStructuralModel.getData().windFootprints` قابل دسترسی است.
- دو آزمون مرجع جدید اضافه شد؛ شمار آزمون‌های تعریف‌شده 53 است. اجرای مستقل helper روی fixture دووجهی چهار footprint با مساحت ۳ مترمربع تولید کرد و ورودی با گره مفقود را رد کرد. این آزمون مستقل هنوز معادل اجرای کامل Node test suite یا CI نیست.
- footprintها در دستگاه محلی هر وجه هستند و هنوز به چندضلعی‌های رسمی C&C متصل نشده‌اند؛ zoneهای چپ و راست باید با همان دستگاه محلی تعریف شوند. فشار طراحی و انطباق همچنان `pressureReady=false` و تأییدنشده باقی می‌ماند.

- تکمیل همین گام: برای هر footprint، رأس‌های جهانی سه‌بعدی نیز با هندسه span/rise/height و پیش‌آمدگی واقعی مدل تولید می‌شوند؛ دستگاه محلی هر وجه حفظ شده تا نواحی C&C همان وجه با آن مقایسه شوند. آزمون fixture سازگار با هندسه، تبدیل نقطه تاج را کنترل می‌کند. این تبدیل فعلاً برای هندسه دوشیب مدل‌ساز موجود است؛ تک‌شیب هنوز در مدل‌ساز هندسه مستقل ندارد.

- آزمون شیب غیرصفر نیز افزوده شد: برای دهانه ۴ متر، rise=۱ متر و پیش‌آمدگی ۰٫۸ متر، نقطه تاج در مختصات جهانی دقیقاً (۲،۴،۰) به‌دست آمد؛ تعداد آزمون‌های تعریف‌شده اکنون 54 است.


## 2026-11-18 — اصلاح ممیزی هم‌پوشانی نواحی باد
- هم‌پوشانی زوج نواحی اکنون فقط در اشتراک هم‌زمان footprint عضو و هر دو ناحیه محاسبه می‌شود؛ هم‌پوشانی خارج از سطح عضو دیگر به‌اشتباه عضو را overlapping اعلام نمی‌کند.
- آزمون جدید: دو ناحیه در داخل footprint بدون هم‌پوشانی، اما خارج از آن هم‌پوشان‌اند؛ مساحت هم‌پوشانی داخل footprint صفر گزارش شد. آزمون‌های تعریف‌شده: 55.
- این تغییر ممیزی هندسی است؛ وضعیت خارج‌بودن بخشی از ناحیه از footprint همچنان جداگانه هشدار/عدم‌اعتبار ایجاد می‌کند و فشار طراحی تولید نمی‌شود.


## 2026-11-18 — بازبینی مسیر انتقال باد سقف تا تکیه‌گاه
- فشار شش‌ناحیه‌ای انتخاب‌شده، پس از تعیین جهت باد و سناریوی فشار داخلی، به بار خطی پرلین‌های سقف با عرض بارگیر چپ/راست تبدیل می‌شود.
- تحلیل سه‌بعدی بار پرلین را به‌صورت بار گسترده روی عضو اعمال می‌کند؛ اعضای پرلین در هر قاب به گره‌های مشترک با رفتر متصل‌اند، بنابراین واکنش‌های انتهایی پرلین از طریق گره مشترک وارد رفتر می‌شوند.
- رفتر به‌صورت قطعات قاب با گره‌های مشترک تا ستون مدل شده است؛ مسیر از ستون به گره پایه و تکیه‌گاه حل‌گر ادامه می‌یابد. این توصیف مسیر هندسی/تحلیلی مدل است، نه تأیید مقاومت ورق، پیچ، کلیپس، اتصال رفتر-ستون، صفحه‌ستون، بولت و فونداسیون.
- بار باد دیوارهای جانبی به دیوارگیرهای طولی و باد دیوار انتهایی به تیرهای انتهایی و برای بخش مثلثی به بارهای گره‌ای معادل ستونک‌ها منتقل می‌شود؛ برای انتقال نهایی به خاک باید مهاربندی طولی/سقفی، اتصالات، واکنش‌های پایه و طراحی پی به‌صورت مستقل کنترل شوند.
- سازنده footprint واقعی پرلین برای ممیزی هندسه C&C وجود دارد، اما هنوز به فشارهای رسمی موضعی لبه/گوشه و بارگذاری مستقل پوشش/پیچ متصل نیست. mapper شش‌ناحیه‌ای صریحاً componentsCladdingStatus=not-independently-designed و codeComplianceStatus=not-established برمی‌گرداند.
- CI مربوط به commit c00e32c با ۵۵ تست اجرا شد و ۴ تست شکست خورد: برابری دقیق اعشاری مساحت ۷٫۲، دو الگوی regex پیام خطای چندضلعی، و انتظار اشتباه عرض footprint لبه در fixture. فایل آزمون برای رفع این چهار مورد اصلاح شد؛ نتیجه CI commit اصلاحی هنوز باید بررسی شود.
- گیت‌های باز: آزمون انتهابه‌انتهای بار پرلین→رفتر→ستون→پایه با تعادل؛ کنترل پایداری و آزادسازی واقعی اتصال پرلین؛ طراحی اتصالات و صفحه‌ستون/مهاری؛ تحلیل P-Delta؛ طراحی فونداسیون و خاک؛ C&C رسمی و تعادل تمام سناریوهای باد.


### Member-specific local axes are shared by solver and load transformation — 2026-11-18

- The 3D load assembly now passes each member's optional `referenceAxis` to the same `makeTransform` routine used by the solver. This keeps global-to-local distributed-load conversion consistent with the element stiffness transformation whenever a member-specific orientation is supplied.
- Members without an explicit `referenceAxis` retain the solver's existing default-axis behavior; no unverified orientation is inferred or assigned to purlins, girts, braces, or other groups.
- This is a consistency fix, not evidence that production member orientations have been fully specified. Actual section installation axes and restraint details remain to be verified from fabrication/design data. No new end-to-end structural validation or CI pass is claimed.


### Load-vector, solver and equilibrium audit share member-specific local axes — 2026-11-18

- A shared `globalVectorToLocal` helper now uses the solver's `makeTransform` routine; the production 3D load assembler calls it rather than duplicating axis projection logic.
- The independent global resultant audit now reconstructs local distributed loads using each member's `referenceAxis`, matching the element stiffness transformation.
- Invalid/zero reference-axis vectors are rejected. Members without an explicit axis retain the documented default behavior; this does not certify that their physical section orientation is known.
- Added regression fixtures for a vertical member with a non-default local roll, round-trip global/local vector reconstruction, agreement between the independent resultant audit and solver load audit, and malformed-axis rejection.
- The fixtures are authored but have not been executed in this environment; CI is not confirmed. Production geometry still needs verified orientation metadata for each section family.


### 2026-11-18 — هم‌راستاسازی ممیزی برآیند بار با محور اختصاصی عضو

- در بازبینی مجدد کد اجرایی مشخص شد `calculateGlobalLoadResultants` با وجود ثبت آزمون محور اختصاصی، `makeTransform` را بدون `member.referenceAxis` فراخوانی می‌کرد؛ بنابراین آزمون موجود برای عضو قائم با محور مرجع `[0,1,0]` باید این اختلاف را آشکار کند.
- فراخوانی ممیزی اصلاح شد تا همان محور اختصاصی عضو را که حل‌گر و تبدیل بار جهانی به محلی استفاده می‌کنند، به کار ببرد.
- آزمون رگرسیون موجود در `tests/analysis-3d-reference.test.js` همین حالت را کنترل می‌کند؛ با این حال اجرای آزمون و CI پس از اصلاح هنوز تأیید نشده است.
- commit اصلاح: `f23347de037e70702be9f57afb0bcfaf378fe347`.
- وضعیت فعلی CI برای این commit: هیچ workflow run یا status check گزارش نشده؛ نتیجه را نامشخص/تأییدنشده نگه می‌داریم.


### 2026-11-18 — ممیزی صریح جهت‌گیری اعضای مدل تولیدی

- تابع SteelFrame3D.auditMemberOrientation(model) افزوده شد تا جهت هندسی هر عضو را از مختصات گره‌ها استخراج کند، اما محور مرجع حل‌گر را با جهت نصب واقعی مقطع یکی فرض نکند.
- وضعیت هر عضو یکی از این موارد است: invalid-member-geometry، reference-axis-unverified، section-roll-unverified یا verified.
- برای تأیید، هم referenceAxis اختصاصی و معتبر و هم sectionOrientationVerified:true لازم است. این پرچم باید بعداً فقط از اطلاعات مستند نقشه ساخت/نصب یا مشخصات مقطع تأمین شود؛ مقداردهی خودکار انجام نشده است.
- ممیزی در مدل تولیدی، داده خروجی getData() و نتیجه تحلیل درج می‌شود. این مرحله تحلیل خطی موجود را متوقف نمی‌کند، اما readyForCodeDesign:false را برای اعضای فاقد جهت‌گیری مستند گزارش می‌کند.
- آزمون‌های واحد افزوده‌شده، پیش‌فرض حل‌گر را تأییدنشده می‌شمارند، نیاز به شواهد چرخش مقطع را کنترل می‌کنند و هندسه صفرطول/گسسته را پرچم می‌زنند.
- این ممیزی به معنی تعیین محور فیزیکی پرلین Z، قیدها یا مهاربندها نیست؛ جهت نصب واقعی هنوز باید از داده سازنده/نقشه اجرایی وارد شود. آزمون‌ها و CI پس از commit هنوز اجرا و تأیید نشده‌اند.


### 2026-11-18 — نتیجه اجرای CI و اصلاح سازگاری ممیزی جهت‌گیری

- نخستین CI پس از افزودن ممیزی جهت‌گیری، ۹۱ از ۹۶ آزمون را گذراند و ۵ مورد شکست خورد.
- چهار شکست ناشی از این بود که fixtureهای قدیمی، سازنده مدل را بدون بارگذاری کامل حل‌گر فراخوانی می‌کردند؛ ساخت هندسه نباید صرفاً به‌دلیل در دسترس نبودن ممیزی اختیاری متوقف شود. سازنده اکنون در این حالت گزارش ممیزی unavailable و تأییدنشده می‌دهد و ساخت هندسه را ادامه می‌دهد.
- شکست پنجم از fixture نادرست آزمون تقدم محور عضو ناشی بود: بردار مرجع انتخاب‌شده عملاً به fallback حل‌گر می‌رسید و دو دستگاه مختصات یکسان می‌شدند. بردار مرجع آزمون به برداری غیرموازی با محور عضو اصلاح شد.
- CI بعدی برای commit 86af0e38768d3334b3a6fa5f474e1201ae3b7450 فقط همان شکست پنجم را نشان داد؛ اصلاح fixture در commit c4fdd1c85a2a1065c9fcc7d0882a6fcd346db601 ثبت شد.
- GitHub Actions run 377 روی commit کد/آزمون c4fdd1c85a2a1065c9fcc7d0882a6fcd346db601 موفق شد: syntax checks موفق و ۹۶ از ۹۶ آزمون پاس شدند. commitهای بعدی فقط اسناد ممیزی و نقشه راه را تغییر داده‌اند؛ هیچ فایل کد/آزمونی پس از این اجرای موفق تغییر نکرده است.


### 2026-11-18 — تشخیص محور مرجع نامعتبر و تفکیک جهت اعضای واقعی

- ممیزی جهت‌گیری اکنون محور مرجع غیرمتناهی/بدشکل را از محور مرجعِ اصلاً واردنشده جدا می‌کند.
- اگر محور مرجع با محور طولی عضو تقریباً موازی باشد (قدر مطلق کسینوس زاویه بیش از ۰٫۹۵)، عضو با وضعیت `reference-axis-parallel-to-member` گزارش می‌شود؛ زیرا تبدیل مختصات حل‌گر در این حالت به محور جایگزین fallback می‌کند و آن بردار نمی‌تواند roll را تعیین کند.
- گزارش گروهی، تعداد اعضای قائم، طولی، عرضی و مورب/مایل، شناسه همه اعضا و شناسه اعضای تأییدنشده را ثبت می‌کند تا تعیین منبع داده برای هر گروه قابل پیگیری باشد.
- این قابلیت فقط ممیزی هندسه و کیفیت metadata است؛ هیچ referenceAxis یا چرخش مقطعی را خودکار تعیین نمی‌کند و readyForCodeDesign تا تأیید مستند همه اعضا false می‌ماند.
- سه آزمون رگرسیون برای محور موازی، محور بدشکل و خلاصه جهت گروه‌ها افزوده شده است. نتیجه CI این تغییرات تا اجرای workflow جدید تأییدنشده است.
