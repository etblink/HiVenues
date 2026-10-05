# Faithful authoring — Slice 0: document fidelity

Status: implementation for owner review under #398. This is an opt-in, read-only
architecture proof, not a replacement Studio or usability acceptance. The owner
approved Slice 0 only. Slices 1–5 and Stage 5D D–E remain gated.

## Lineage and scope

Branch `feature/era7-faithful-authoring-slice0` starts at the assessed, failed
candidate `28eaf662df350e23ed02c25bde17bf78b311fa04` (tree
`9e7dc9d616938d59d0a5735f88c7f26207d5ffc2`). PRs #399 and #397 remain historical,
unmerged evidence. This proof does not repair first launch, create an editor,
introduce semantic selection, or change publishing/recovery behavior.

The Rendering & Authoring Architecture Doctrine remains authoritative: durable
HostGraph, validation, stale guards, immutable approval, deployment authority,
public evidence and rollback remain server-owned. No domain, store, deployment
engine, signing or public-truth model is replaced.

## Running the proof

Use the existing local state, never reseed the operator's workspace:

```sh
HIVENUES_AUTHORING_PROOF=1 npm start
```

Open `/hivenues/studio/<existing-place-slug>/authoring-proof` on the loopback
listener. The installed launcher and default Studio do not enable or link this
entry. Public-ingress mode refuses the flag. Without it, proof routes and the
private Preview document mode return 404. All proof controls perform GETs only.

## Shared document contract

`draft-document.js` resolves one current server snapshot through the existing
Direction and territory templates. Both `authoring-document` and the explicit
Preview `?document=1` consumer call this same renderer and capability adapter.
Revision and digest are mandatory; a changed draft returns 409, never a silently
substituted document. Links to supported draft pages retain that pin.

There is no new composition or second HostGraph projection. The post-render
adapter removes execution/navigation authority, not content sections. Ordinary
Preview keeps its current wrapper and behavior; public rendering stays on the
immutable live Release. The proof shell, labels and controls live outside the
host document. No private manifest or mutation/approval token is injected.

Comparison identity includes snapshot, route, time/capability inputs and actual
document width **and height**. The proof uses fixed 1200×800, 1200×600, 390×720 and
390×568 CSS-pixel viewports. Parent chrome never reduces or rescales those sizes.

## Capability audit

| Capability | Ordinary Preview today | Isolated private document |
| --- | --- | --- |
| Draft content and internal links | Draft rendering; private route base | Same canonical content; allowlisted, snapshot-pinned draft links |
| Review banner/operator CSS | Included inside the document | Omitted; proof controls stay in parent |
| Community navigation | Hidden by `previewMode` on all three home compositions | Canonical visitor link visible; destination inert |
| Support navigation/CTA | Hidden by `previewMode` when otherwise available | Canonical visitor link visible; destination inert |
| Activity RSVP controls | Review-only message instead of visitor controls | Canonical form structure; controls disabled, actions removed |
| Activity lifecycle | Preview notice takes the visitor control's place even when closed | Canonical open/closed state, including cancelled/completed cases |
| Contact/protocol links | Existing visitor destination | Visible link preserved; destination removed |
| ICS/calendar | Draft-derived download | No downloads; `document=1` rejected on ICS route |
| Consequence pages | Read-only disclosure with Preview wrapper | Same visitor disclosure; no embedded review chrome |
| Scripts, HTMX, external navigation | Existing Preview behavior | Removed; enforced again by response CSP |
| Provider/social live routes | No draft equivalent | Not invented or represented as qualified draft pages |

Supported document pages are Home, Activities and Activity details, Offers,
Stories and Story details, Gallery, People and Profile details, About/visit,
plus all seven mechanic disclosures. Availability follows the existing territory
inventory: schema 1 does not acquire schema-2 content. Empty collections do not
create invented pages or duplicate sections.

Community, updates, community member/discussion and support runtime routes depend
on Release/provider context and have no current draft renderer. Their links can
be shown faithfully; their dynamic page states are **not** covered by this proof.
Any future editor support needs an explicit capability/context design and its own
gate. No Hive/provider call or public read-back is simulated as real evidence.

## Isolation and keyboard boundary

The same-origin iframe has `sandbox="allow-same-origin"` only. Its response also
has CSP `sandbox allow-same-origin`, `script-src 'none'`, `form-action 'none'`,
`connect-src 'none'`, no nested frames/objects/base URL, self/data images and self
styles/fonts. No scripts, forms, popups, downloads or top navigation are granted.
The response sandbox remains effective when opening the document directly or
removing the HTML sandbox attribute. Never add `allow-scripts` to make selection
convenient. Parent access is trusted Studio code, not a boundary against a
compromised Studio itself.

The dedicated `hivenues-authoring-proof.js` island has a hard **<60-line** budget
(40 lines in this slice). It handles focus entry, Escape return and an inert-action
message only. It has no fetch, persistent storage, editing, graph mirror or
authority knowledge, and is admitted solely on the proof shell. Existing island
budgets are unchanged. Normal Tab/Shift+Tab traverse the frame boundary. The
named frame has an accessible title and the parent reports its read-only state.
Without JavaScript, sandbox/navigation restrictions remain; native Tab still
works. Screen reader, operating-system mobile and cross-browser qualification are
not claimed by the Chromium keyboard proof.

Separate documents isolate host CSS from shell selectors, inheritance and styles.
The existing host stylesheets are used unmodified. Arbitrary future host scripts,
external media or embedded widgets are not admitted by this proof's policy.

## Qualification and known limitations

`test/authoring-document-fidelity.test.js` covers twelve synthetic in-memory
specimens: Poster/Editorial/Hospitality × schema 1/2 × sparse/dense. Across 165
supported route contexts it compares both private consumers byte-for-byte and
compares canonical body structure, text, ordering and object multiplicity against
the existing public renderer under the same seeded graph. The latter ignores only
execution/navigation attributes and whitespace, preventing a shared duplicate or
omission from passing merely because both private consumers agree.

`npm run test:authoring-document` runs the actual app and Chromium. It captures
210 paired viewport screenshots, compares PNG bytes, complete body markup,
semantic object counts and full-document geometry, and verifies image loading.
All content routes get desktop and phone coverage; Home also gets short desktop
and phone heights. All seven disclosures receive HTTP coverage; their shared
template receives representative visual coverage in every specimen. It checks
focus traversal, CSS isolation, inert actions, script/form blocking even after
HTML sandbox removal, zero external/mutating requests and unchanged synthetic
state. Browser evidence identifies the exact HEAD/tree and any tracked diff.

Narrow Activity headings overflow in four dense cases: Poster schema 2's supper
detail and Editorial schema 1's three Activity lifecycle variants. The browser
gate explicitly compares their geometry against the canonical visitor renderer.
They must be recorded as existing host responsive defects, not hidden with iframe
clipping or silently repaired in a rendering-seam proof. Matching fidelity does
not establish polished mobile authoring or final product acceptance.

The capability adapter must stay covered whenever templates change. Future
semantic selection needs server-issued occurrence identity and its own focus,
stale-state and authority qualification. This slice supplies no editing APIs and
does not establish those later properties. Owner review is required before Slice 1.
