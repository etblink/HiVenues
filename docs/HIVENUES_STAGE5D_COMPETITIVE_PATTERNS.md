# Stage 5D — familiar outside, rigorous inside

Study date: 2026-10-04. Governing charter: #398. Starting implementation: `a365d748f0f8d40dbf922fa9ffc7cd190248dee3`, tree `08eef1e426a711685ad6e1c1d51224fd654db5e2`. This is an A–C refinement, not D–E acceptance or permission to merge #397.

## Evidence boundary

Current official help and academy material supplies the editing/publishing comparison below. Direct public interaction additionally covered Squarespace's Altaloma template and mobile switch, Shopify's Local theme and mobile demo, and Webflow's Lighter template/read-only preview workspace. Webflow visibly separates Design/CMS/Insights, a page selector, device controls and Publish. Wix Studio's Start Creating and Framer's Start without AI led to sign-in; no account was created. Authenticated dashboards, paid features and real publishing were not exercised. Public template previews establish preview conventions, not editor save or deployment behavior. No proprietary artwork or styling was copied.

## Pattern matrix

| Interaction | Wix / Wix Studio [W] | Squarespace [S] | Webflow [B] | Shopify theme editor [T] | Framer [F] |
|---|---|---|---|---|---|
| First run / empty state | Template, blank or guided sitemap | Template / guided builder, demo pages | New site, template or AI builder | Default theme; add/try alternatives | Template, blank or agent |
| Site/project dashboard | Sites → Edit Site / dashboard | Sites, domains, subscriptions | Site cards → editor / settings | Online Store → current and draft themes | Projects; editor's named site context |
| Editor navigation | Page selector; tool panels | Pages panel; Edit page | Design / CMS; contextual page selector | Template selector; sections/settings | Canvas / CMS; Pages / Layers / Assets |
| Canvas vs settings | Canvas with contextual inspector | Page editing plus site styles | Large canvas; selected element controls | Preview; section tree and selected settings | Canvas with layer/property panels |
| Pages / structured content | Pages and CMS distinct | Layout and collection page types | Pages and CMS collections distinct | Templates and store resources distinct | Pages and CMS collections distinct |
| Save state | Autosave plus saved indication | Explicit Save; no general revision autosave | Autosave plus saved check | Explicit Save; context-dependent Publish | Saved editing versions; separate publish |
| Preview | Separate visitor mode | Full-page and device view | Preview mode; responsive controls | Theme preview with Draft/Live identity | Preview separate from publishing |
| Publish / update | Publish again to update | Public site: many saved changes go live | Publish summary; staging / production | Publish selected theme; confirm | Publish version; optional staging promotion |
| Destination / domain | Free URL or connected domain | Domains; primary domain | Specific domains in publish controls | Store primary/market domains | Base and custom domains |
| Draft vs live | Saved edits wait for Publish | Save may affect live; page drafts plan-limited | Designer, staging and production distinct | Draft theme vs current theme; access separate | Editing vs published; staged vs live versions |
| History / recovery | Site History; restore and republish | Session undo; deleted-page recovery limits | Backups; preview before restore | Duplicate/retain themes; session undo limited | Editing history vs published-version rollback |
| Responsive/mobile | Device/breakpoint controls | Desktop/mobile device view | Breakpoints and width controls | Desktop/mobile preview | Desktop/tablet/phone breakpoints |
| Site settings | Dashboard / site menu | Site-level panels separate from page | Site settings separate from element settings | Theme settings separate from store settings | Settings separate from canvas properties |
| Hosting / domains | Managed hosting; domain connection | Managed hosting; Domains panel | Publishing / site settings | Settings → Domains | Settings → domains, staging/versions |
| Advanced infrastructure | CMS/dev tools opened as needed | DNS/custom code in specific panels | Custom code and advanced publishing tools | Code/apps beyond routine theme controls | Advanced hosting/settings beyond canvas |

There is no universal rule that two navigation levels are bad: Webflow and Framer use them to distinguish genuinely different scopes. HiVenues' problem is overlapping scopes and ambiguous names, not the number two. Nor is autosave universal: Squarespace and Shopify document explicit save workflows. Do not invent autosave merely to display a fashionable status label.

## HiVenues reassessment, frozen before refinement

Operator evidence 73–78 is separate from the original independent first-use freeze, which remains unchanged.

- Expectation: Content should contain the site's structured content. Result: a story/contact form with creation shortcuts, while existing Activities and Offers live in another menu. This is an information architecture defect.
- Expectation: Edit website opens a focused canvas. Result: four workspace destinations, save strip, status strip, four tool menus, then canvas/page review navigation. Site management competes with editing before a task is chosen.
- Expectation: typing a headline makes it unsaved. Result: both the global Saved indicator and inspector prose imply it is saved. Evidence `78-pattern-dirty` records this without committing the test text.
- Expectation: a local-only action should say what it can do. Review website is vague; Save a copy states the available action without implying a public update.
- Positive: the preview identifies draft versus immutable copy; local-only limitation appears before approval; the primary journey already separates content approval, destination consequences and observed result. Preserve these.
- Automation note: event 77 used an incorrect input selector; its timeout is not a product defect. Event 78 uses the visible Headline field and establishes the save-state defect.

## Adopt, adapt, reject

| Decision | Concrete HiVenues application |
|---|---|
| Adopt focused editor | Remove the four-tab workspace strip. Keep one editor tool hierarchy: Page, Activities, Offers, Design, Settings. Activities/Offers list existing entries and their Add actions. |
| Adopt named site menu | Place name opens Edit website, Website & hosting, History and Your places. Show current context. History remains discoverable without occupying a permanent editing tab. |
| Adopt specific content labels | Rename the generic Content screen Story & visit details. Keep it under Page and directly reachable from its canvas content. Do not add a fake general-purpose CMS or unsupported arbitrary-page builder. |
| Adopt contextual settings | Separate visual Design controls from participation/account Settings; keep infrastructure out of both. |
| Adopt truthful save feedback | Explicit Save; unsaved/saving/saved/failure feedback. Protect typed edits against navigation and replacement. Never mark a failed or stale save successful. Autosave needs a separate concurrency/recovery design. |
| Adapt device vocabulary | Desktop layout / Mobile layout for the existing responsive canvas control. This is a layout check, not a claim of exact device or public-site emulation. Full Preview remains separate. |
| Adopt one publishing entry | Publish website / Update website on capable Studio; Save a copy locally. Keep clear progress, reviewed changes and the chosen address. |
| Adapt immutable approval | Save the exact reviewed copy explicitly, then confirm what happens at the chosen destination. Reuse identical content without duplicating it. No extra lifecycle vocabulary. |
| Adapt live status | Website & hosting shows verified address, last check and discrepancies. Installed successfully is still Public check pending until exact public evidence exists. |
| Adapt progressive disclosure | Routine: venue, canvas, content and preview. On publish: copy + destination + consequences. On connection: provider-neutral server/domain checks. On troubleshooting: exact identity and diagnostics. Authority checks stay mandatory when relevant. |
| Reject save-means-live | Do not adopt Squarespace's public-save behavior or infer a live outcome from a theme/site publish label. HiVenues edits remain draft until exact approval and execution. |
| Reject infrastructure simplification that changes truth | No automatic authority grants, silent domain selection, fake hosted preview URL, optimistic verified badge, automatic rollback or simulated public proof. |
| Retain recovery distinction | Restore draft and Roll back website remain distinct. Moving the History entry does not redesign D–E or broaden rollback eligibility. |

## Official sources

All accessed 2026-10-04. The matrix is a scoped synthesis, not a claim that every product, plan or editor generation behaves identically.

- W1: [Wix Studio editor tour](https://www.wix.com/studio/academy/tutorials/how-to-get-started-in-the-wix-studio-editor)
- W2: [Studio saving, previewing and publishing](https://support.wix.com/en/article/studio-editor-saving-previewing-and-publishing-your-site)
- W3: [Managing sites in a workspace](https://support.wix.com/en/article/wix-studio-managing-sites-in-a-workspace)
- W4: [Wix Editor saving, previewing and publishing](https://support.wix.com/en/article/wix-editor-saving-previewing-and-publishing-your-site)
- S1: [Pages panel](https://support.squarespace.com/hc/en-us/articles/217644727-The-Pages-panel)
- S2: [Is my site live?](https://support.squarespace.com/hc/en-us/articles/206536837-Is-my-site-live)
- S3: [Lost content and recovery limits](https://support.squarespace.com/hc/en-us/articles/206543417-Troubleshooting-lost-content)
- S4: [Account dashboard](https://support.squarespace.com/hc/en-us/articles/115010428047-Access-your-account-dashboard)
- S5: [Device view](https://support.squarespace.com/hc/en-us/articles/206545667-Device-view)
- S6: [Connecting a third-party domain](https://support.squarespace.com/hc/en-us/articles/205812378-Connecting-a-third-party-domain-to-your-Squarespace-site)
- B1: [Intro to Webflow](https://help.webflow.com/hc/en-us/articles/33961260162323-Intro-to-Webflow)
- B2: [Publishing workflow](https://help.webflow.com/hc/en-us/articles/46651740529811-Publishing-workflow)
- B3: [Save and restore backups](https://help.webflow.com/hc/en-us/articles/33961244069395-Save-and-restore-backups)
- B4: [Dashboard](https://help.webflow.com/hc/en-us/articles/33961328364691)
- T1: [Theme editor features](https://help.shopify.com/en/manual/online-store/themes/customizing-themes/theme-editor/features-overview)
- T2: [Publishing themes](https://help.shopify.com/en/manual/online-store/themes/managing-themes/publishing-themes)
- T3: [Adding and previewing themes](https://help.shopify.com/en/manual/online-store/themes/adding-themes)
- T4: [Store settings and domains](https://help.shopify.com/en/manual/intro-to-shopify/initial-setup/setup-business-settings)
- F1: [Current Framer interface lesson, September 15, 2026](https://www.framer.com/academy/lessons/framer-interface)
- F2: [Staging and versions, updated September 15, 2026](https://www.framer.com/help/articles/staging-and-versions/)
- F3: [Editing version history](https://www.framer.com/academy/lessons/version-history) — older lesson explicitly warns that some UI differs following June 2026 changes; used for recovery distinction, not exact current pixel placement.
- F4: [Site and page settings](https://www.framer.com/academy/lessons/framer-fundamentals-site-and-page-settings)

## Implementation boundary

Presentation templates, CSS, bounded transient UI behavior and qualification selectors only, plus the server-derived local action label. Keep the same canonical stores, routes, revision/digest checks, Release identities, deployment services, authority boundaries, read-back requirements, rollback restrictions and persistence. No real provider, DNS, TLS, Hive or payment actions.

The existing Studio client island gains transient dirty-form detection, discard protection and honest failure feedback. Its explicit size budget changes from fewer than 150 lines to fewer than 180 lines (172 at initial refinement); it still owns no durable host state, does not autosave and adds no second client island. Behavioral browser checks cover cancellation and persistence rather than relying on the line budget as proof.

## Applied and reviewed

The recommendations above were applied to the running A–C candidate. Existing guided creation, place cards, draft/copy preview identity and the continuous publishing journey were retained. Operator events 79–95 record refinement and re-evaluation, including a caught-and-fixed inspector navigation guard, desktop and 320 px editing, mobile Story & visit details, local copy approval, and a separately labelled offline destination confirmation and installation. The latter ends at **Public check pending**; no external transport or public proof is involved.

Final local qualification: lint, secret scan, CSS build and deterministic tests pass (577 pass, one Windows-only skip). Product browser qualification passes 101 screenshots/audits with zero blocking accessibility, horizontal overflow, incomplete-image, unauthorized-control, external-request or unexpected-console findings. New behavioral coverage verifies discard cancellation retains input, a failed save retains input and canonical content, and successful retry reports Saved. The automated fixture's Hive actions are synthetic. Original independent first-use evidence remains unchanged across all 124 recorded hashes.

This is a narrower and more familiar editing hierarchy, not completion of the remaining recovery work. The connection/DNS flow, full History restore/rollback redesign and lifecycle/recovery work remain D–E owner-review scope. Explicit save is intentional; the added unsaved protection covers the canvas inspector and Story & visit details form. Other setup forms have not been globally redesigned in this pass.
