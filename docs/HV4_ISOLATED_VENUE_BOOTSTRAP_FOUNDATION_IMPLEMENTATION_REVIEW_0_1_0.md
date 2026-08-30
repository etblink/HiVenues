# HV-4 Isolated Venue Bootstrap Foundation — Candidate Review 0.1.0

## Review boundary

This is a historical Project Lead record of the implementation candidate while it was being qualified. It is not an acceptance record and does not define living routing or current acceptance status.

```text
AUTHORIZED_BASE = 20590dff2222a6dc855fabb9f0c4f8cb37cc2670
REVIEW_PHASE_RECORDED = PRE_ACCEPTANCE_QUALIFICATION
REAL_SECOND_VENUE = NO
PRODUCTION_MUTATION = NO
```

## Project Lead review findings

### Rejected draft: missing composition-level deployment binding

The initial implementation draft correctly reused the HV-1 venue-context validator, HV-3 venue-package validator, and HV-2 deployment-profile compiler, but Project Lead review rejected it before qualification because independently valid venue/package and deployment objects were not explicitly bound to one another at the composition layer.

The repaired candidate requires an explicit `bindings` declaration containing the intended venue, package, and deployment identifiers. After all authoritative validators run, the composition layer compares those declarations to the validated identities and fails closed on mismatch.

The focused qualification suite includes a negative control that supplies the valid Fourth Street production deployment manifest under the Lantern Room deployment binding. That composition must be rejected.

### Qualification repair: hostile secret fixture vs repository scanner

The first qualification attempt failed at the repository-wide secret scan because a negative test contained a literal PEM private-key header. This was classified as a test-fixture conflict, not a reason to weaken the scanner or remove the HV-4 rejection test.

The fixture was repaired to construct the fake PEM marker only at runtime. The repository secret scanner therefore remains unchanged and hostile, while HV-4 still proves that recognizable private-key material is rejected before review output.

### Rejected draft: credentials embedded inside URL strings

Later semantic review found that the accepted HV-2 deployment compiler intentionally validates `runtime.source` as HTTPS but does not itself treat URL userinfo or secret-like query parameters as an HV-2 concern. A bootstrap document could therefore have preserved an independently valid HTTPS deployment source containing credentials even though HV-4 promises secret-free input and review output.

The HV-4 layer was tightened without changing HV-2 globally. URL-valued strings are now rejected when they contain username/password userinfo or query-parameter names that indicate token, credential, authorization, signature, password, API-key, private-key, SSH-key, or secret material. Rejection errors identify the location but do not echo the credential value.

Focused negative tests cover both userinfo credentials and an `access_token` query parameter.

### Documentation truthfulness repair

Project Lead review also rejected an implementation-guide status line that would have said `IMPLEMENTATION_CANDIDATE__NOT_ACCEPTED` after canonical acceptance. The guide now describes its durable document role and delegates acceptance truth to a separate acceptance record and living routing.

## Scope review

The candidate changes only:

- the generic offline bootstrap composition module;
- one offline validation CLI;
- one Lantern Room synthetic deployment/bootstrap helper;
- focused HV-4 tests;
- HV-4 implementation documentation;
- this historical candidate-review record;
- the CI path classifier so these exact non-rendering HV-4 files do not trigger rendered qualification in future changes.

The CI workflow itself changes in this candidate, so this candidate's own PR remains eligible for rendered qualification as evidence that the workflow change did not damage the retained visual lane. No application presentation/runtime source is intentionally changed.

Final Project Lead acceptance remains contingent on deterministic Ubuntu and Windows qualification of the final exact tree, classifier-selected rendered qualification, semantic source review, exact changed-path review, tree/provenance verification, and a fresh canonical-main race.
