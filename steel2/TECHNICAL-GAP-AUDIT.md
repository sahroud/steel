# SAHROUD STEEL — Technical Gap Audit

Branch: `refactor/stepwise-shed-workflow`

## What exists (verified from current source)
- A 3D structural model builder in `js/model-3d.js`.
- A 3D frame solver in `js/analysis-3d.js`, using six degrees of freedom per node and a Web Worker.
- The solver is linear elastic, first-order. Its own header states that P-Delta, warping, shear deformation, buckling and code design checks are not part of this solver.
- The 3D load assembly applies member self-weight using section area and steel unit weight, and distributes entered gravity loads to frame members.
- Entered net wind pressures are mapped to roof purlins, longitudinal wall girts and end-wall girts.

## Confirmed issues and gaps to address before a final design claim

- **Roof gravity-load duplication corrected on this branch:** the model builder was assigning roof dead/live/snow area loads both to rafters and to roof purlins. Since purlins are modeled and transfer their reactions into rafters, this duplicates the roof surface loads. The updated builder applies these area loads through purlins when purlins exist; direct rafter area loading is retained only as a fallback when no roof purlin members exist. Member self-weight remains calculated separately.
- **Roof tributary-width convention still needs verification:** purlin tributary widths are currently generated along the sloped roof station spacing. The adopted load input convention (horizontal projected area versus actual roof surface area) must be explicitly defined and reconciled with the applicable code before finalizing the conversion.
1. **Crane system:** no crane load fields, crane runway/rail members, wheel loads, impact/side thrust, crane combinations or crane-specific checks were found in the `steel2` source search. This is a required development stream when the user selects a crane.
2. **Seismic actions:** the current 3D combination builder in `js/app.js` builds D, Lr, S and W combinations; seismic load cases and seismic combinations are not present in that builder.
3. **Wind coefficients:** `climate-load-engine.js` calculates/records pressure information but the final code coefficients are not automatically resolved into all member-level wind loads. Manual net pressure input remains a separate path.
4. **End-wall roof triangle:** the climate load engine explicitly notes that the triangular area below the ridge is not included in the current end-wall wind transfer.
5. **Analysis limitations:** the current 3D solver is linear first-order; geometric nonlinearity/P-Delta and other listed effects require a separate justified analysis/check route where applicable.
6. **Single-slope roof:** the current visible geometry form exposes span and ridge rise but no roof-type selector. The 3D geometry/load mapping uses a symmetric half-span/rise assumption; single-slope geometry is not yet verified or implemented.
7. **Foundation:** there is no integrated foundation/grade-beam design module in this page. The workflow now marks this stage explicitly incomplete instead of implying that it is available.
8. **Final drawings:** a final engineering issue package still requires checking that every drawing dimension, member mark, connection, support reaction and bill of quantities is sourced from the same accepted analysis/design model.

## Priority order
P0. Verify and repair 3D load paths and equilibrium for dead, snow, roof wind, longitudinal wall wind and end-wall wind.
P1. Implement roof type as a geometry-level option (gable / single-slope) and propagate it to model, loads, views and drawings.
P2. Implement crane system as an optional feature, activated only when selected, including wheel loads and applicable load combinations.
P3. Add seismic load cases and combinations when required by the adopted Iranian code/site parameters.
P4. Complete member stability/design checks and connection design against the adopted code edition.
P5. Implement foundation and grade-beam design from verified support reactions and geotechnical inputs.
P6. Generate coordinated drawings, calculation report and quantity takeoff.

## Safety rule
A generated model or a converged linear analysis is not, by itself, a code-compliant final design. Every design output must carry its assumptions, source, validation status and unresolved checks.


## P2 source-level verification — 2026-11-17

The following observations were verified directly in `js/model-3d.js`, `js/analysis-3d.js`, `js/app.js` and `js/climate-load-engine.js` on this branch. They are source-level findings, not yet numerical acceptance tests:

1. **Gravity path:** when any roof-purlin member exists, roof dead/live/snow area loads are set to zero on rafters and converted to line loads on roof purlins using each station's tributary width. This removes the previously identified direct duplication. Self-weight is separately added in the 3D analysis for every member using the resolved section area and 78.5 kN/m³. A numerical test must still compare applied area load, integrated member loads and reactions.
2. **Purlin tributary convention:** station spacing and tributary width are measured along the sloping roof length (`totalRoofSlope / roofRows`). The input registry describes loads as kN/m² but does not encode whether each is based on horizontal projection or actual roof surface. Therefore the current line-load conversion is not accepted until the load-area convention is explicitly chosen and tested against hand calculations.
3. **Wind application:** the 3D solver accepts signed net pressure inputs. Roof wind is converted to global components on purlins; longitudinal wall wind is applied to side wall girts; end-wall wind is applied to end girts. The climate coefficient calculator explicitly says its calculated zone pressures are not transferred into the 3D model. Thus the 3D wind case currently depends on separately entered manual net pressures, not the climate coefficient results.
4. **End-wall triangle:** end-wall girts receive pressure multiplied by tributary height, but the triangular region above the highest horizontal girt is not represented by an explicit distributed load on the gable chord/end posts. It remains an identified missing load path.
5. **Wind combinations:** the legacy combination helper in `app.js` factors roof wind and longitudinal wall wind but its `hasWind`/combination data path does not include front/rear end-wall wind fields. The 3D combination path reads the combination registry from `SteelLoads`; it requires a separate audit to prove whether end-wall actions and all wind directions are included. Do not assume complete wind combinations.
6. **Equilibrium reporting:** the 3D solver calculates global applied-force/reaction and moment residuals from assembled equivalent nodal loads, and reports an `ok` flag at a relative residual threshold of 1e-6. This is useful but is not an independent load-input audit: it cannot detect a load omitted before assembly or a duplicated load that is internally balanced. The next test must compare the source area loads to the assembled member loads and reactions.
7. **Boundary conditions:** base nodes and end-wall-base nodes are all assigned support constraints. The current UI chooses either all six DOFs fixed or only three translations fixed. The appropriateness of restraining every end-wall post base and the idealized base model must be compared with the intended foundation/connection details.
8. **Analysis scope:** the solver is a 3D linear elastic frame solver with six DOFs per node. It applies uniform local member loads and self-weight; its own limitations exclude P-Delta, buckling and code checks. A successful solve is not evidence of stability or code compliance.

### Required next tests before modifying the load algorithm

- Create a minimal one-bay/one-frame analytical fixture with known member sections and supports.
- For each gravity case, independently calculate total input surface load, expected line loads per purlin, total equivalent nodal load and support reaction sum.
- Run left/right asymmetric roof load cases, including a ridge purlin that collects both slopes, and check sign and magnitude.
- Check wind on each roof slope and each wall face independently, including reversed wind direction and front/rear end-wall cases.
- Add a separate triangular end-wall pressure integration test before implementing its transfer.
- Compare global equilibrium residuals and member/joint equilibrium; fail the test if any required load family is absent, not merely if the solver balances.

No load algorithm was changed in this audit update because the load-area convention and missing end-wall triangular load must first be resolved and covered by independent tests.
