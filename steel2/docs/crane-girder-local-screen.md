# Runway girder local nominal-stress screen

This module is a preliminary post-processing screen for the crane runway girder members already included in the 3D frame FEM.

## Workflow

1. Complete crane rail transfer and run one synchronized crane load case in the 3D frame.
2. In **غربال تنش اسمی موضعی تیر حمال**, choose **ساخت الگوی شناسه اعضا از تحلیل اخیر**.
3. For every listed member ID, enter the actual section properties and source references from the approved fabrication/section drawings.
4. Run the screen. Both local member ends are evaluated independently.

## Required input for each member ID

All geometric properties use SI units:

- `A_m2`: gross area, m²
- `Sy_m3`, `Sz_m3`: elastic section moduli about the solver's local y and z axes, m³
- `Avy_m2`, `Avz_m2`: effective shear areas for the local y and z shear components, m²
- `J_m4`: Saint-Venant torsion constant, m⁴
- `torsionRadius_m`: radius used for the simplified torsional shear estimate, m
- `Fy_MPa`: yield stress, MPa
- `source`, `geometrySource`, `shearAreaMethod`, `torsionMethod`: traceable references and methods

The JSON object is keyed by the exact member IDs from the latest 3D result. The UI can generate a blank template for these IDs.

## Equations

For each end, using absolute values of the local end actions:

```
sigma = |N|/A + |My|/Sy + |Mz|/Sz
tau   = |Vy|/Avy + |Vz|/Avz + |T| r/J
sigma_vm = sqrt(sigma² + 3 tau²)
screen ratio = sigma_vm / Fy
```

The sum of absolute components is a simplified upper-bound screen. It does not calculate the actual stress distribution through an I-shaped section. The result is an elastic nominal-stress indicator only.

## Explicit exclusions

This module does not perform code resistance design, section classification, local or lateral-torsional buckling, web crippling, patch loading, local flange bending, stiffener design, weld/bolt design, fatigue, impact/dynamic response, warping torsion, second-order analysis, or imperfection analysis. It does not use resistance factors or code load combinations. `analysisEnabled` remains false.

Do not interpret a ratio below 1.0 as proof of safety or code compliance. Validate the section properties, axis convention, shear-area method, torsion model, load combinations, and all omitted limit states independently.
