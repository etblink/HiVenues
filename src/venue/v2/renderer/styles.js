'use strict';

const { createV2DeploymentAgnosticVenueSource } = require('../source');

function renderV2ThemeStylesheet(input) {
  const source = createV2DeploymentAgnosticVenueSource(input);
  const colors = source.site.brand.design.colors;
  const entries = {
    canvas: colors.canvas,
    surface: colors.surface,
    'surface-raised': colors.surfaceRaised,
    'surface-strong': colors.surfaceStrong,
    border: colors.border,
    text: colors.text,
    'text-muted': colors.textMuted,
    'text-subtle': colors.textSubtle,
    accent: colors.accent,
    'accent-hover': colors.accentHover,
    'accent-text': colors.accentText,
    'focus-ring': colors.focusRing,
    info: colors.info,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };
  const variables = Object.entries(entries)
    .map(([key, value]) => `  --v2-${key}: ${value};`)
    .join('\n');
  return `:root {\n${variables}\n}\n`;
}

function responsiveRules(prefix, query) {
  const selectors = [
    [`v2-${prefix}-layoutvariant--split`, 'display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);align-items:center'],
    [`v2-${prefix}-layoutvariant--stacked`, 'display:grid;grid-template-columns:1fr'],
    [`v2-${prefix}-layoutvariant--compact-stacked`, 'display:grid;grid-template-columns:1fr;gap:1rem'],
    [`v2-${prefix}-layoutvariant--feature`, 'display:grid;grid-template-columns:1fr;position:relative'],
    [`v2-${prefix}-layoutvariant--grid`, 'display:grid'],
    [`v2-${prefix}-layoutvariant--list`, 'display:block'],
    [`v2-${prefix}-alignment--center`, 'text-align:center'],
    [`v2-${prefix}-alignment--start`, 'text-align:left'],
    [`v2-${prefix}-columns--1`, '--v2-columns:1'],
    [`v2-${prefix}-columns--2`, '--v2-columns:2'],
    [`v2-${prefix}-columns--3`, '--v2-columns:3'],
    [`v2-${prefix}-columns--4`, '--v2-columns:4'],
    [`v2-${prefix}-density--compact`, '--v2-local-gap:.8rem'],
    [`v2-${prefix}-density--standard`, '--v2-local-gap:1.25rem'],
    [`v2-${prefix}-density--generous`, '--v2-local-gap:2rem'],
    [`v2-${prefix}-textmeasure--narrow`, '--v2-text-measure:34rem'],
    [`v2-${prefix}-textmeasure--standard`, '--v2-text-measure:44rem'],
    [`v2-${prefix}-textmeasure--wide`, '--v2-text-measure:58rem'],
  ].map(([className, rules]) => `.${className} > .v2-component__inner { ${rules}; }`);

  selectors.push(
    `.v2-${prefix}-mediaposition--start .v2-component__media { order:-1; }`,
    `.v2-${prefix}-mediaposition--end .v2-component__media { order:2; }`,
    `.v2-${prefix}-aspectrecipeid--aspect-landscape-wide .v2-component__media .v2-media { aspect-ratio:16/9; }`,
    `.v2-${prefix}-aspectrecipeid--aspect-landscape .v2-component__media .v2-media { aspect-ratio:4/3; }`,
    `.v2-${prefix}-aspectrecipeid--aspect-square .v2-component__media .v2-media { aspect-ratio:1; }`,
    `.v2-${prefix}-aspectrecipeid--aspect-portrait .v2-component__media .v2-media { aspect-ratio:3/4; }`,
  );

  const body = selectors.join('\n');
  return query ? `@media ${query} {\n${body}\n}\n` : `${body}\n`;
}

function renderV2PublicStylesheet() {
  return `
* { box-sizing: border-box; }
html { background: var(--v2-canvas); color: var(--v2-text); scroll-behavior: smooth; }
body {
  margin: 0;
  min-width: 0;
  background:
    radial-gradient(circle at 20% -10%, color-mix(in srgb, var(--v2-accent) 14%, transparent), transparent 32rem),
    var(--v2-canvas);
  color: var(--v2-text);
  font-family: inherit;
  line-height: 1.55;
  text-rendering: optimizeLegibility;
}
a { color: inherit; text-decoration-thickness: .08em; text-underline-offset: .18em; }
a:hover { color: var(--v2-accent-hover); }
a:focus-visible, button:focus-visible {
  outline: 3px solid var(--v2-focus-ring);
  outline-offset: 3px;
}
img { display: block; max-width: 100%; }
.v2-shell, .v2-component__inner {
  width: min(1180px, calc(100% - 2rem));
  margin-inline: auto;
}
.v2-skip-link {
  position: fixed;
  z-index: 100;
  top: .75rem;
  left: .75rem;
  transform: translateY(-180%);
  background: var(--v2-accent);
  color: var(--v2-accent-text);
  padding: .8rem 1rem;
  border-radius: .5rem;
}
.v2-skip-link:focus { transform: translateY(0); }
.v2-site-header {
  position: relative;
  z-index: 5;
  border-bottom: 1px solid var(--v2-border);
  background: color-mix(in srgb, var(--v2-surface) 94%, transparent);
  backdrop-filter: blur(14px);
}
.v2-site-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  min-height: 76px;
}
.v2-wordmark {
  flex: 0 1 auto;
  font-weight: 850;
  letter-spacing: -.025em;
  text-decoration: none;
  font-size: clamp(1.05rem, 2vw, 1.35rem);
}
.v2-nav {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: .25rem;
  flex-wrap: wrap;
}
.v2-nav__link {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  padding: .55rem .8rem;
  border-radius: 999px;
  text-decoration: none;
  color: var(--v2-text-muted);
}
.v2-nav__link[aria-current="page"] {
  color: var(--v2-text);
  background: var(--v2-surface-raised);
}
main { min-height: 60vh; }
.v2-component { padding-block: var(--v2-section-space, 4.5rem); }
.v2-component + .v2-component { border-top: 1px solid color-mix(in srgb, var(--v2-border) 65%, transparent); }
.v2-component__inner { --v2-local-gap: 1.25rem; --v2-columns: 3; --v2-text-measure: 44rem; }
.v2-component__inner > * + * { margin-top: var(--v2-local-gap); }
.v2-component__copy { max-width: var(--v2-text-measure, 44rem); }
.v2-display, h1, h2, h3, h4 {
  margin: 0;
  line-height: 1.08;
  text-wrap: balance;
  letter-spacing: -.025em;
}
.v2-display, h1 { font-size: clamp(2.5rem, 7vw, 6.5rem); }
h2 { font-size: clamp(2rem, 4.3vw, 4rem); }
h3 { font-size: clamp(1.2rem, 2.1vw, 1.75rem); }
h4 { font-size: 1rem; }
p { margin: 0; }
.v2-kicker {
  color: var(--v2-accent);
  font-size: .78rem;
  font-weight: 850;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.v2-lede {
  max-width: var(--v2-text-measure, 44rem);
  color: var(--v2-text-muted);
  font-size: clamp(1.05rem, 1.8vw, 1.3rem);
  line-height: 1.65;
}
.v2-note { color: var(--v2-text-subtle); font-size: .92rem; }
.v2-action {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: .45rem;
  padding: .68rem 1rem;
  border: 1px solid var(--v2-border);
  border-radius: var(--v2-control-radius, .75rem);
  text-decoration: none;
  font-weight: 800;
}
.v2-action--primary {
  background: var(--v2-accent);
  color: var(--v2-accent-text);
  border-color: var(--v2-accent);
}
.v2-action--primary:hover { background: var(--v2-accent-hover); color: var(--v2-accent-text); border-color: var(--v2-accent-hover); }
.v2-action--secondary { background: var(--v2-surface-raised); }
.v2-actions { display: flex; flex-wrap: wrap; gap: .65rem; margin-top: 1rem; }
.v2-media {
  overflow: hidden;
  width: 100%;
  background: var(--v2-surface-raised);
  border-radius: var(--v2-media-radius, 1rem);
  border: 1px solid var(--v2-border);
}
.v2-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: var(--v2-focal-x, 50%) var(--v2-focal-y, 50%);
}
.v2-fit--contain img { object-fit: contain; }
.v2-aspect--landscape-wide { aspect-ratio: 16/9; }
.v2-aspect--landscape { aspect-ratio: 4/3; }
.v2-aspect--square { aspect-ratio: 1; }
.v2-aspect--portrait { aspect-ratio: 3/4; }
.v2-hero {
  min-height: min(72vh, 760px);
  gap: clamp(1.75rem, 5vw, 5.5rem);
}
.v2-hero > .v2-component__copy { align-self: center; }
.v2-hero .v2-component__media { min-width: 0; }
.v2-recipe--hero-immersive-media > .v2-hero,
.v2-recipe--hero-poster > .v2-hero {
  position: relative;
  min-height: min(76vh, 820px);
  overflow: hidden;
  border-radius: var(--v2-panel-radius, 1.25rem);
}
.v2-recipe--hero-immersive-media .v2-component__media,
.v2-recipe--hero-poster .v2-component__media {
  position: absolute;
  inset: 0;
}
.v2-recipe--hero-immersive-media .v2-media,
.v2-recipe--hero-poster .v2-media { height: 100%; border: 0; border-radius: inherit; }
.v2-recipe--hero-immersive-media .v2-component__copy,
.v2-recipe--hero-poster .v2-component__copy {
  position: relative;
  z-index: 2;
  align-self: end;
  max-width: min(760px, 88%);
  padding: clamp(1.35rem, 4vw, 3.5rem);
  margin: clamp(1rem, 4vw, 2.5rem);
  border-radius: var(--v2-panel-radius, 1.25rem);
  background: color-mix(in srgb, var(--v2-surface-strong) 92%, transparent);
  box-shadow: 0 22px 80px rgba(0,0,0,.24);
}
.v2-recipe--hero-poster .v2-display { text-transform: uppercase; letter-spacing: -.045em; }
.v2-recipe--hero-editorial-split > .v2-hero { min-height: min(58vh, 620px); }
.v2-recipe--hero-text-led > .v2-hero { min-height: 52vh; align-content: center; }
.v2-resource-list {
  display: grid;
  grid-template-columns: repeat(var(--v2-columns, 1), minmax(0, 1fr));
  gap: var(--v2-local-gap, 1.25rem);
}
.v2-list-card, .v2-business-card, .v2-empty-state, .v2-menu-section {
  padding: clamp(1rem, 2.5vw, 1.55rem);
  border: 1px solid var(--v2-border);
  border-radius: var(--v2-panel-radius, 1rem);
  background: var(--v2-surface);
}
.v2-list-card { min-width: 0; }
.v2-list-card > * + * { margin-top: .7rem; }
.v2-list-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  color: var(--v2-text-subtle);
  font-size: .82rem;
}
.v2-state, .v2-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: .22rem .55rem;
  border: 1px solid var(--v2-border);
  border-radius: 999px;
  font-size: .75rem;
  font-weight: 800;
  text-transform: capitalize;
}
.v2-state[data-state="available"], .v2-state[data-state="scheduled"] { border-color: var(--v2-success); }
.v2-state[data-state="limited"], .v2-state[data-state="full"] { border-color: var(--v2-warning); }
.v2-state[data-state="maintenance"], .v2-state[data-state="cancelled"], .v2-state[data-state="offline"] { border-color: var(--v2-danger); }
.v2-gallery {
  display: grid;
  grid-template-columns: repeat(var(--v2-columns, 3), minmax(0,1fr));
  gap: var(--v2-local-gap, 1.25rem);
  margin-top: 1.8rem;
}
.v2-gallery__item { min-width: 0; margin: 0; }
.v2-gallery__item figcaption { margin-top: .55rem; color: var(--v2-text-subtle); font-size: .86rem; }
.v2-recipe--gallery-feature-grid .v2-gallery__item:first-child { grid-column: span 2; }
.v2-visit {
  display: grid;
  grid-template-columns: minmax(0,1.2fr) minmax(260px,.8fr);
  gap: clamp(1.25rem, 4vw, 4rem);
  align-items: start;
}
.v2-business-card {
  display: grid;
  gap: .65rem;
  font-style: normal;
}
.v2-menu { margin-top: 2rem; }
.v2-menu + .v2-menu { margin-top: 3rem; }
.v2-menu__title { color: var(--v2-accent); margin-bottom: 1rem; }
.v2-menu-section + .v2-menu-section { margin-top: 1rem; }
.v2-menu-items { display: grid; grid-template-columns: repeat(var(--v2-columns,1), minmax(0,1fr)); gap: .9rem; margin-top: 1rem; }
.v2-menu-item { padding-block: .75rem; border-top: 1px solid var(--v2-border); }
.v2-menu-item__title { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
.v2-menu-item p { color: var(--v2-text-muted); margin-top: .35rem; }
.v2-community-entry {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 2rem;
  padding: clamp(1.25rem, 4vw, 3rem);
  border: 1px solid var(--v2-border);
  border-radius: var(--v2-panel-radius, 1.25rem);
  background: var(--v2-surface-raised);
}
.v2-event-detail { padding-block: clamp(2rem, 6vw, 5rem); }
.v2-back-link { display: inline-flex; min-height: 44px; align-items: center; margin-bottom: 1.5rem; }
.v2-event-detail__grid {
  display: grid;
  grid-template-columns: minmax(0,1.15fr) minmax(280px,.85fr);
  gap: clamp(2rem, 6vw, 6rem);
  align-items: center;
}
.v2-event-detail__copy > * + * { margin-top: 1rem; }
.v2-event-detail__time { color: var(--v2-accent); font-weight: 800; }
.v2-site-footer {
  border-top: 1px solid var(--v2-border);
  background: var(--v2-surface);
  color: var(--v2-text-muted);
}
.v2-site-footer__inner {
  min-height: 160px;
  padding-block: 2rem;
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 2rem;
}
.v2-site-footer p { margin-top: .35rem; }
.v2-page-intro { padding-block: 3rem 1rem; }

.v2-type--system-sans { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.v2-type--editorial { font-family: Georgia, "Times New Roman", serif; }
.v2-type--editorial .v2-nav, .v2-type--editorial .v2-kicker, .v2-type--editorial .v2-action, .v2-type--editorial .v2-state { font-family: ui-sans-serif, system-ui, sans-serif; }
.v2-type--grotesk-display { font-family: "Arial Narrow", "Segoe UI", ui-sans-serif, system-ui, sans-serif; }
.v2-type--grotesk-display h1, .v2-type--grotesk-display h2 { font-weight: 900; letter-spacing: -.055em; }
.v2-type--poster { font-family: "Arial Black", Impact, ui-sans-serif, system-ui, sans-serif; }
.v2-type--poster p, .v2-type--poster .v2-note, .v2-type--poster .v2-list-card { font-family: ui-sans-serif, system-ui, sans-serif; }
.v2-type--poster h1, .v2-type--poster h2 { text-transform: uppercase; letter-spacing: -.05em; }
.v2-density--compact { --v2-section-space: 3rem; }
.v2-density--standard { --v2-section-space: 4.5rem; }
.v2-density--generous { --v2-section-space: 6.5rem; }
.v2-shape--crisp { --v2-control-radius: .25rem; --v2-panel-radius: .35rem; --v2-media-radius: .2rem; }
.v2-shape--soft { --v2-control-radius: .7rem; --v2-panel-radius: 1rem; --v2-media-radius: .9rem; }
.v2-shape--rounded { --v2-control-radius: 999px; --v2-panel-radius: 1.75rem; --v2-media-radius: 1.5rem; }
.v2-surface--flat .v2-list-card, .v2-surface--flat .v2-business-card, .v2-surface--flat .v2-menu-section { box-shadow: none; }
.v2-surface--layered .v2-list-card, .v2-surface--layered .v2-business-card, .v2-surface--layered .v2-menu-section { box-shadow: 0 12px 40px rgba(0,0,0,.08); }
.v2-surface--elevated .v2-list-card, .v2-surface--elevated .v2-business-card, .v2-surface--elevated .v2-menu-section { box-shadow: 0 20px 60px rgba(0,0,0,.18); }

${responsiveRules('d', '')}
${responsiveRules('t', '(max-width: 1024px)')}
${responsiveRules('m', '(max-width: 640px)')}

/* Poster rows consume the existing event recipe and responsive media classes. */
.v2-recipe--list-poster-rows .v2-resource-list { grid-template-columns: 1fr; }
.v2-event-card--poster {
  display: grid;
  grid-template-columns: clamp(7rem, 15vw, 11rem) minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(1rem, 3vw, 2rem);
}
.v2-event-card--poster > * { margin: 0; min-width: 0; }
.v2-event-card__copy { overflow-wrap: anywhere; }
.v2-event-card__copy > * + * { margin-top: .7rem; }
.v2-event-card__copy h3 { font-size: clamp(1.5rem, 3vw, 2.5rem); }
.v2-event-card__copy h3 a { text-decoration: none; }
.v2-event-card__copy h3 a:hover { text-decoration: underline; }
.v2-event-card__artwork .v2-media { border-radius: var(--v2-media-radius, 1rem); }
.v2-event-card--poster > .v2-actions { flex-direction: column; max-width: 14rem; overflow-wrap: anywhere; }
.v2-event-card--text-only { grid-template-columns: minmax(0, 1fr) auto; }
@media (max-width: 760px) {
  .v2-event-card--poster { grid-template-columns: clamp(5.5rem, 24vw, 9rem) minmax(0, 1fr); align-items: start; }
  .v2-event-card--poster > .v2-actions { grid-column: 1 / -1; flex-direction: row; max-width: none; }
  .v2-event-card--poster > .v2-actions .v2-action { flex: 1 1 7rem; }
  .v2-event-card--text-only { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 760px) {
  .v2-site-header__inner { align-items: flex-start; flex-direction: column; padding-block: .8rem; gap: .45rem; }
  .v2-nav { width: 100%; justify-content: flex-start; overflow-x: visible; flex-wrap: wrap; gap: .15rem .25rem; padding-bottom: 0; }
  .v2-nav__link { flex: 0 0 auto; }
  .v2-visit, .v2-event-detail__grid { grid-template-columns: 1fr; }
  .v2-community-entry { align-items: flex-start; flex-direction: column; }
  .v2-site-footer__inner { flex-direction: column; }
  .v2-recipe--gallery-feature-grid .v2-gallery__item:first-child { grid-column: auto; }
}
@media (max-width: 640px) {
  .v2-shell, .v2-component__inner { width: min(100% - 1.25rem, 1180px); }
  .v2-component { padding-block: clamp(2.6rem, 10vw, 4rem); }
  .v2-display, h1 { font-size: clamp(2.35rem, 13vw, 4.2rem); }
  h2 { font-size: clamp(1.8rem, 9vw, 3rem); }
  .v2-resource-list, .v2-gallery, .v2-menu-items { grid-template-columns: 1fr !important; }
  .v2-recipe--hero-immersive-media > .v2-hero,
  .v2-recipe--hero-poster > .v2-hero { min-height: 70vh; }
  .v2-recipe--hero-immersive-media .v2-component__copy,
  .v2-recipe--hero-poster .v2-component__copy { max-width: calc(100% - 1rem); margin: .5rem; padding: 1.2rem; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
`;
}

module.exports = {
  renderV2PublicStylesheet,
  renderV2ThemeStylesheet,
};
