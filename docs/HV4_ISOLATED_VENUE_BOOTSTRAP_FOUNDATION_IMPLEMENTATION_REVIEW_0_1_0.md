# HV-4 Isolated Venue Bootstrap Foundation — Candidate Review 0.1.0

## Review boundary

This record accompanies the implementation candidate only. It is not an acceptance record and does not update living routing.

```text
AUTHORIZED_BASE = 20590dff2222a6dc855fabb9f0c4f8cb37cc2670
IMPLEMENTATION_STATUS = UNDER_QUALIFICATION
REAL_SECOND_VENUE = NO
PRODUCTION_MUTATION = NO
```

## Project Lead pre-qualification review

The initial implementation draft correctly reused the HV-1 venue-context validator, HV-3 venue-package validator, and HV-2 deployment-profile compiler, but Project Lead review rejected it before qualification because independently valid venue/package and deployment objects were not explicitly bound to one another at the composition layer.

The repaired candidate requires an explicit `bindings` declaration containing the intended venue, package, and deployment identifiers. After all authoritative validators run, the composition layer compares those declarations to the validated identities and fails closed on mismatch.

The focused qualification suite includes a negative control that supplies the valid Fourth Street production deployment manifest under the Lantern Room deployment binding. That composition must be rejected.

## Scope review

The candidate changes only:

- the generic offline bootstrap composition module;
- one offline validation CLI;
- one Lantern Room synthetic deployment/bootstrap helper;
- focused HV-4 tests;
- HV-4 implementation documentation;
- this candidate-review record;
- the CI path classifier so these exact non-rendering HV-4 files do not trigger rendered qualification in future changes.

The CI workflow itself changes in this candidate, so this candidate's own PR remains eligible for rendered qualification as evidence that the workflow change did not damage the retained visual lane. No application presentation/runtime source is intentionally changed.

Final Project Lead acceptance remains contingent on deterministic Ubuntu and Windows qualification, any classifier-selected rendered qualification, semantic source review, exact changed-path review, and a fresh canonical-main race.
