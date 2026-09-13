# PM4 S9 Historical Pressure Evidence Map 0.1.0

Status: **S9.1 MEASUREMENT EVIDENCE MAP**  
Parent protocol: `docs/PM4_S9_MEASURED_QUALITY_RELEASE_PROTOCOL_0_1_0.md`  
Tracking: #238 / #200 / #160

## 1. Purpose

S9.0 froze three deep current-v3 release references and retained three older PM1 references only as targeted historical pressure controls:

```text
H1 = Fourth Street Bar
H2 = Juniper Works Cooperative
H3 = Harbor & Hearth / restaurant-private-events reference
```

This map prevents two opposite errors:

1. discarding valid accepted PM1 evidence merely because v3 now has a broader host model; or
2. silently treating historical v2 screenshots as proof of current-v3 release behavior.

Current release acceptance is carried by the S9 R1/R2/R3 matrix. H1/H2/H3 remain **historical pressure evidence** unless a later S9 finding specifically requires a minimum recapture.

The allowed dispositions are:

```text
REUSE_ACCEPTED_EVIDENCE
RECAPTURE_MINIMUM_STATE
NOT_APPLICABLE_AFTER_S5_REALIGNMENT
```

---

## 2. Controlling accepted historical artifact

The strongest accepted four-reference evidence is the canonical closure of Issue #198.

```text
CANONICAL_MAIN = 6f26056abb6f5cc230c3e818009e20dedfe6f1ba
CANONICAL_TREE = f64237d3b108f379be6facfa35f90e2006c4827c
MERGE_PR = #204
CANONICAL_CI = #743 / SUCCESS
VISUAL_ARTIFACT_ID = 10039022606
VISUAL_ARTIFACT_NAME = current-visual-evidence-6f26056abb6f5cc230c3e818009e20dedfe6f1ba
VISUAL_ARTIFACT_BYTES = 58014647
VISUAL_ARTIFACT_SHA256 = 0b6fb4d3d60965b7b6ac9491c25f8481e6a172cddffe46565fe38b82a64cfa45
```

The exact human-reviewed candidate immediately preceding that canonical merge was:

```text
HEAD = 5da56e3cfbfdf799210abb79f8ca996f29a716b4
TREE = f64237d3b108f379be6facfa35f90e2006c4827c
CI = #742 / SUCCESS
ARTIFACT_ID = 10038673318
ARTIFACT_SHA256 = 7337a8d7959048c1596ff9be3000450c649ea211a8362474a54b34d426cc6066
RENDERER_CAPTURES = 28
BLOCKING_ACCESSIBILITY_FINDINGS = 0
HORIZONTAL_OVERFLOW_FINDINGS = 0
```

The canonical tree exactly matched that reviewed tree. The accepted PM1 section-14 adjudication recorded:

- no `FAIL` or `NEEDS_WORK` dimension for any of the four references;
- required brand/composition/hierarchy/responsive/product-credibility dimensions at `FLAGSHIP`;
- every other dimension at least `STRONG`;
- both marketing questions answered `YES` for Fourth Street, Juniper, Restaurant, and live music;
- performance/SEO explicitly remained only reference-level readiness and was left for Issue #200 measured release work.

S9.1 therefore reuses this evidence only for the historical pressures named below. It does **not** inherit Issue #200 acceptance from it.

---

## 3. H1 — Fourth Street Bar

### Evidence role

H1 preserves pressure for:

- a real, non-synthetic business identity;
- host/venue brand dominance over platform identity;
- real photography and credible hospitality composition;
- visitor-first navigation/action hierarchy;
- optional Community capability appearing as an enrichment rather than universal product identity;
- proof that one shared system could serve a real reference rather than only synthetic fixtures.

### Disposition

| Pressure | Disposition | Evidence / rationale |
| --- | --- | --- |
| Real business identity and facts | `REUSE_ACCEPTED_EVIDENCE` | Canonical #198 / CI #743 / artifact `10039022606`; historical assertion only. |
| Brand dominance / composition / responsive credibility | `REUSE_ACCEPTED_EVIDENCE` | Final #198 review rated required core dimensions FLAGSHIP and answered both marketing questions YES. |
| Real photography/media truth | `REUSE_ACCEPTED_EVIDENCE` | Canonical #198 artifact plus accepted image dimension oracles. |
| Community as optional enrichment | `REUSE_ACCEPTED_EVIDENCE` | Historical Fourth Street control plus later S8 capability-gating semantics; not a claim that this old artifact proves current v3 social implementation. |
| Deep current-v3 physical-business breadth | `NOT_APPLICABLE_AFTER_S5_REALIGNMENT` | S5 froze zero pre-S6 conditional breadth blockers; current release pressure is carried by R1. |
| Distriator/payment/provider execution | `NOT_APPLICABLE_AFTER_S5_REALIGNMENT` | Separately privileged/provider-governed capability; historical bounded handoff remains provenance, not S9 baseline authority. |

### Recapture rule

No H1 recapture is required merely to begin S9. If a later S9 blocker specifically concerns a real-business-only behavior that R1 cannot falsify, recapture only the smallest Fourth Street state required to resolve that blocker.

---

## 4. H2 — Juniper Works Cooperative

### Evidence role

H2 preserves pressure for:

- non-bar, non-nightlife vocabulary;
- practical/operational information density;
- programs/equipment/workshop semantics;
- materially different composition and interaction language;
- proof that HiVenues historically escaped a bar-skin-only visual model.

### Disposition

| Pressure | Disposition | Evidence / rationale |
| --- | --- | --- |
| Non-bar vocabulary / identity | `REUSE_ACCEPTED_EVIDENCE` | Canonical #198 / CI #743 / artifact `10039022606`; explicit synthetic provenance retained. |
| Workshop-shaped composition | `REUSE_ACCEPTED_EVIDENCE` | Final #198 review rated brand dominance, above-fold composition, hierarchy, responsive composition, and credibility at accepted thresholds. |
| Operational status presentation | `REUSE_ACCEPTED_EVIDENCE` | Historical Juniper Equipment/program evidence in canonical artifact. |
| Deep v3 program/equipment resource authoring | `NOT_APPLICABLE_AFTER_S5_REALIGNMENT` | Legitimate conditional breadth is parked in #224 and is not a PM4 blocker absent new evidence. |
| Rebuilding Juniper as a full v3 duplicate journey | `NOT_APPLICABLE_AFTER_S5_REALIGNMENT` | Current generalization is pressure-tested by R1/R2/R3; duplicate journey would add cost without a new acceptance question. |

### Recapture rule

No H2 recapture is required merely to preserve PM1 generality pressure. If S9 later reveals that R1/R2/R3 can pass only because operational/non-hospitality information density was lost, recapture the smallest Juniper state needed to adjudicate that finding.

---

## 5. H3 — Harbor & Hearth / restaurant-private-events reference

### Evidence role

H3 preserves pressure for:

- premium editorial hospitality rather than nightlife styling;
- menu readability as page content;
- reservation/action visibility without inventing transaction authority;
- gallery/private-events visual pressure;
- generous editorial spacing and typography;
- materially different composition from Fourth Street/live music.

### Disposition

| Pressure | Disposition | Evidence / rationale |
| --- | --- | --- |
| Editorial hospitality composition | `REUSE_ACCEPTED_EVIDENCE` | Canonical #198 / CI #743 / artifact `10039022606`. |
| Menu readability / visitor-goal clarity | `REUSE_ACCEPTED_EVIDENCE` | Final #198 review passed IA, typography, CTA, responsive and credibility thresholds. |
| Synthetic provenance / honest credibility | `REUSE_ACCEPTED_EVIDENCE` | Final #198 review explicitly retained fictional/demo disclosure and answered both marketing questions YES. |
| Restaurant media quality ceiling | `REUSE_ACCEPTED_EVIDENCE` | Final review rated media treatment `STRONG`, explicitly not FLAGSHIP, and recorded why that still satisfied #198. This remains a historical limitation, not hidden evidence. |
| Deep v3 menu/private-events/Gallery implementation | `NOT_APPLICABLE_AFTER_S5_REALIGNMENT` | These remain conditional #224 breadth, not automatic release blockers. |
| Native reservation execution | `NOT_APPLICABLE_AFTER_S5_REALIGNMENT` | External/provider execution remains separately governed; a CTA must not imply privileged transaction authority. |

### Recapture rule

No H3 recapture is required merely to replay the old restaurant matrix. If current S9 evidence shows a universal editorial/composition deficiency not pressure-tested by R1/R2/R3, recapture only the minimum restaurant state required to decide that finding.

---

## 6. Historical live-music control

The old PM1 live-music reference is not a fourth historical control in S9 because its universal pressure is absorbed by current deep reference R1.

```text
OLD_PM1_LIVE_MUSIC_FULL_REPLAY = NOT_APPLICABLE_AFTER_S5_REALIGNMENT
CURRENT_OWNER = R1_MIGRATED_PHYSICAL_LIVE_MUSIC
```

The #198 artifact remains valuable historical provenance for how far the older renderer had already pushed show/ticket/event-detail composition. It does not replace the current R1 measured baseline.

---

## 7. Evidence validity boundary

The accepted #198 artifact predates substantial v3 work. Therefore:

```text
HISTORICAL_PRESSURE_EVIDENCE = VALID
CURRENT_V3_RELEASE_BEHAVIOR_PROOF = NO
CURRENT_S9_PERFORMANCE_SEO_PROOF = NO
CURRENT_S9_STUDIO_PROOF = NO
CURRENT_S9_SOCIAL_PROOF = NO
```

Current behavior must be established by S9 R1/R2/R3 measurement and the accepted S4/S6/S7/S8 v3 evidence chain.

This map deliberately avoids a byte-identity claim between historical v2 presentation and current v3 presentation.

---

## 8. Baseline conclusion

```text
H1_FOURTH_STREET = REUSE_ACCEPTED_EVIDENCE__HISTORICAL_PRESSURE_ONLY
H2_JUNIPER = REUSE_ACCEPTED_EVIDENCE__HISTORICAL_PRESSURE_ONLY
H3_RESTAURANT = REUSE_ACCEPTED_EVIDENCE__HISTORICAL_PRESSURE_ONLY
IMMEDIATE_HISTORICAL_RECAPTURE_COUNT = 0
S5_DEFERRED_BREADTH_REOPENED = NO
CURRENT_RELEASE_MATRIX = R1 + R2 + R3
```

A later S9 finding may justify `RECAPTURE_MINIMUM_STATE`, but no historical control is recaptured speculatively during the untouched baseline.
