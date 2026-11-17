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
