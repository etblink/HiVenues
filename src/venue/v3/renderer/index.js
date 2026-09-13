'use strict';

const {
  createV3DeploymentAgnosticVenueSource,
} = require('../source');

class V3RendererError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues v3 renderer error: ${message}`, options);
    this.name = 'V3RendererError';
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pathJoin(basePath, path) {
  const base = String(basePath || '').replace(/\/$/, '');
  if (!path || path === '/') return base || '/';
  return `${base}${path.startsWith('/') ? path : `/${path}`}` || '/';
}

function pageHref(source, pageId, basePath = '') {
  const page = source.site.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new V3RendererError(`navigation references missing page ${pageId}`);
  return page.slug === '' ? pathJoin(basePath, '/') : pathJoin(basePath, `/${page.slug}`);
}

function navigationHref(source, target, basePath) {
  if (target.kind === 'page') return pageHref(source, target.pageId, basePath);
  if (target.kind === 'external') return target.href;
  if (target.capability === 'community') return pathJoin(basePath, '/community');
  if (target.capability === 'transaction') return pathJoin(basePath, '/pay');
  throw new V3RendererError('unknown navigation target');
}

function renderNavigation(source, basePath) {
  if (source.site.navigation.length === 0) return '';
  const links = source.site.navigation.map((entry) => (
    `<a href="${escapeHtml(navigationHref(source, entry.target, basePath))}">${escapeHtml(entry.label)}</a>`
  )).join('');
  return `<nav class="v3-primary-nav" aria-label="Primary">${links}</nav>`;
}

function renderMediaUsage(source, usage, className = 'v3-media') {
  if (!usage) return '';
  const asset = source.media.assets.find((candidate) => candidate.id === usage.assetId);
  if (!asset) throw new V3RendererError(`missing managed media ${usage.assetId}`);
  const alt = usage.decorative ? '' : usage.alt;
  const decorative = usage.decorative ? ' aria-hidden="true"' : '';
  return `<figure class="${escapeHtml(className)} v3-fit--${escapeHtml(usage.treatment.fit)}"><img src="${escapeHtml(asset.src)}" width="${asset.width}" height="${asset.height}" alt="${escapeHtml(alt || '')}" loading="lazy"${decorative}></figure>`;
}

function renderManagedActivityMedia(source, activity) {
  if (activity.managedMedia.length === 0) return '';
  return activity.managedMedia.map((usage) => {
    const asset = source.media.assets.find((candidate) => candidate.id === usage.assetId);
    if (!asset) throw new V3RendererError(`activity ${activity.id} references missing media ${usage.assetId}`);
    return `<figure class="v3-activity-media" data-media-role="${escapeHtml(usage.role)}"><img src="${escapeHtml(asset.src)}" width="${asset.width}" height="${asset.height}" alt="${escapeHtml(activity.title)}" loading="lazy"></figure>`;
  }).join('');
}

function renderHero(source, component) {
  const content = component.content;
  return `<section class="v3-component v3-hero" data-component-id="${escapeHtml(component.id)}" data-recipe="${escapeHtml(component.recipeId)}">
    <div class="v3-hero__copy">
      ${content.eyebrow ? `<p class="v3-kicker">${escapeHtml(content.eyebrow)}</p>` : ''}
      ${content.heading ? `<h2>${escapeHtml(content.heading)}</h2>` : ''}
      <p>${escapeHtml(content.body)}</p>
      ${content.note ? `<p class="v3-note">${escapeHtml(content.note)}</p>` : ''}
      ${content.primaryAction ? `<a class="v3-action v3-action--primary" href="${escapeHtml(content.primaryAction.href)}">${escapeHtml(content.primaryAction.label)}</a>` : ''}
    </div>
    ${renderMediaUsage(source, content.media, 'v3-media v3-hero__media')}
  </section>`;
}

function renderNarrative(component) {
  const content = component.content;
  return `<section class="v3-component v3-narrative" data-component-id="${escapeHtml(component.id)}" data-recipe="${escapeHtml(component.recipeId)}">
    ${content.kicker ? `<p class="v3-kicker">${escapeHtml(content.kicker)}</p>` : ''}
    <h2>${escapeHtml(content.heading)}</h2>
    <p>${escapeHtml(content.body)}</p>
    ${content.note ? `<p class="v3-note">${escapeHtml(content.note)}</p>` : ''}
  </section>`;
}

function renderVisit(source, component) {
  if (source.venue.business === null) throw new V3RendererError('contact-visit requires physical host business facts');
  const business = source.venue.business;
  return `${renderNarrative(component)}<section class="v3-visit-facts" aria-label="Visit details">
    <address>${escapeHtml(business.address)}</address>
    <p>${escapeHtml(business.hours)}</p>
    <p><a href="tel:${escapeHtml(business.phone)}">${escapeHtml(business.phone)}</a></p>
    <p><a href="${escapeHtml(business.mapUrl)}">Map and directions</a></p>
  </section>`;
}

function formatTemporal(activity) {
  if (activity.temporal.kind === 'OCCURRENCE') {
    const end = activity.temporal.endAt
      ? ` – <time datetime="${escapeHtml(activity.temporal.endAt)}">${escapeHtml(activity.temporal.endAt)}</time>`
      : '';
    return `<p class="v3-activity-time"><span>When</span> <time datetime="${escapeHtml(activity.temporal.startAt)}">${escapeHtml(activity.temporal.startAt)}</time>${end}</p>`;
  }
  if (activity.temporal.kind === 'RELEASE') {
    return `<p class="v3-activity-time"><span>Release</span> <time datetime="${escapeHtml(activity.temporal.releaseAt)}">${escapeHtml(activity.temporal.releaseAt)}</time></p>`;
  }
  return `<p class="v3-activity-time"><span>Window</span> <time datetime="${escapeHtml(activity.temporal.startAt)}">${escapeHtml(activity.temporal.startAt)}</time> – <time datetime="${escapeHtml(activity.temporal.endAt)}">${escapeHtml(activity.temporal.endAt)}</time></p>`;
}

function renderPresence(source, activity) {
  if (activity.presence.kind === 'NONE') return '';
  if (activity.presence.kind === 'PHYSICAL_HOST_DEFAULT') {
    const business = source.venue.business;
    if (!business) throw new V3RendererError(`activity ${activity.id} requires physical host business facts`);
    return `<section class="v3-activity-presence" aria-label="Location"><h2>Location</h2><address>${escapeHtml(business.address)}</address></section>`;
  }
  const destinationLinks = activity.presence.destinations.map((destination) => (
    `<a class="v3-action v3-action--secondary" href="${escapeHtml(destination.href)}">${escapeHtml(destination.label)}</a>`
  )).join('');
  const physical = activity.presence.kind === 'HYBRID' && source.venue.business
    ? `<address>${escapeHtml(source.venue.business.address)}</address>`
    : '';
  return `<section class="v3-activity-presence" aria-label="How to participate"><h2>${activity.presence.kind === 'HYBRID' ? 'Join in person or online' : 'Join online'}</h2>${physical}${destinationLinks}</section>`;
}

function renderActivityActions(activity) {
  if (activity.publicActions.length === 0) return '';
  return `<div class="v3-activity-actions">${activity.publicActions.map((action) => (
    `<a class="v3-action v3-action--primary" data-action-role="${escapeHtml(action.role)}" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`
  )).join('')}</div>`;
}

function activitySummary(activity) {
  if (activity.temporal.kind === 'RELEASE') return `Release · ${activity.temporal.releaseAt}`;
  if (activity.temporal.kind === 'WINDOW') return `Window · ${activity.temporal.startAt}`;
  return `Occurrence · ${activity.temporal.startAt}`;
}

function renderActivityList(source, component, basePath) {
  const content = component.content;
  const activities = content.resourceIds.map((id) => {
    const activity = source.resources.activities.find((candidate) => candidate.id === id);
    if (!activity) throw new V3RendererError(`activity-list ${component.id} references missing activity ${id}`);
    return activity;
  });
  const body = activities.length === 0
    ? `<p>${escapeHtml(content.emptyLead || 'No activities listed.')}</p>${content.emptyBody ? `<p>${escapeHtml(content.emptyBody)}</p>` : ''}`
    : `<div class="v3-activity-list__items">${activities.map((activity) => (
      `<article class="v3-activity-card" data-resource-id="${escapeHtml(activity.id)}">
        <p class="v3-eyebrow">${escapeHtml(activitySummary(activity))}</p>
        <h3><a href="${escapeHtml(pathJoin(basePath, `/activities/${activity.slug}`))}">${escapeHtml(activity.title)}</a></h3>
        ${activity.description ? `<p>${escapeHtml(activity.description)}</p>` : ''}
        <p class="v3-status">${escapeHtml(activity.lifecycle)}</p>
      </article>`
    )).join('')}</div>`;
  return `<section class="v3-component v3-activity-list" data-component-id="${escapeHtml(component.id)}" data-recipe="${escapeHtml(component.recipeId)}">
    ${content.kicker ? `<p class="v3-kicker">${escapeHtml(content.kicker)}</p>` : ''}
    <h2>${escapeHtml(content.heading)}</h2>
    ${content.intro ? `<p>${escapeHtml(content.intro)}</p>` : ''}
    ${body}
  </section>`;
}

function renderComponent(source, component, basePath) {
  if (component.kind === 'venue-hero') return renderHero(source, component);
  if (component.kind === 'editorial-intro') return renderNarrative(component);
  if (component.kind === 'contact-visit') return renderVisit(source, component);
  if (component.kind === 'activity-list') return renderActivityList(source, component, basePath);
  throw new V3RendererError(`unsupported component kind ${component.kind}`);
}

function renderDocument(source, title, main, options = {}) {
  const basePath = options.basePath || '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · ${escapeHtml(source.venue.displayName)}</title>
  <link rel="stylesheet" href="${escapeHtml(pathJoin(basePath, '/__hivenues-v3/styles.css'))}">
  <style>${renderV3ThemeStylesheet(source)}</style>
</head>
<body>
  <header class="v3-site-header"><a class="v3-wordmark" href="${escapeHtml(pathJoin(basePath, '/'))}">${escapeHtml(source.venue.displayName)}</a>${renderNavigation(source, basePath)}</header>
  ${main}
</body>
</html>`;
}

function renderV3Page(input, options = {}) {
  const source = createV3DeploymentAgnosticVenueSource(input);
  const pageSlug = options.pageSlug || '';
  const page = source.site.pages.find((candidate) => candidate.slug === pageSlug);
  if (!page) throw new V3RendererError(`page does not exist: ${pageSlug || '<home>'}`);
  const components = page.components.map((component) => renderComponent(source, component, options.basePath || '')).join('');
  const main = `<main class="v3-page" data-page-id="${escapeHtml(page.id)}"><header class="v3-page-heading"><h1>${escapeHtml(page.title)}</h1></header>${components}</main>`;
  return renderDocument(source, page.seo.title || page.title, main, options);
}

function findActivityBySlug(source, slug) {
  const matches = source.resources.activities.filter((candidate) => candidate.slug === slug);
  if (matches.length !== 1) throw new V3RendererError(`activity does not exist or is ambiguous: ${slug}`);
  return matches[0];
}

function findActivityById(source, id) {
  const matches = source.resources.activities.filter((candidate) => candidate.id === id);
  if (matches.length !== 1) throw new V3RendererError(`activity does not exist or is ambiguous: ${id}`);
  return matches[0];
}

function renderActivityDetailFromResource(source, activity, options = {}) {
  const status = activity.lifecycle === 'CANCELLED' || activity.lifecycle === 'POSTPONED'
    ? `<p class="v3-status v3-status--important">${escapeHtml(activity.lifecycle)}</p>`
    : `<p class="v3-status">${escapeHtml(activity.lifecycle)}</p>`;
  const access = activity.access.note ? `<p class="v3-access-note">${escapeHtml(activity.access.note)}</p>` : '';
  const capacity = activity.access.capacity === 'UNSPECIFIED'
    ? ''
    : `<p class="v3-capacity">Capacity: ${escapeHtml(activity.access.capacity)}</p>`;
  const main = `<main class="v3-activity-detail" data-activity-id="${escapeHtml(activity.id)}">
    <article>
      <header><p class="v3-eyebrow">Activity</p><h1>${escapeHtml(activity.title)}</h1>${status}</header>
      ${renderManagedActivityMedia(source, activity)}
      ${activity.description ? `<p class="v3-activity-description">${escapeHtml(activity.description)}</p>` : ''}
      ${formatTemporal(activity)}
      ${renderPresence(source, activity)}
      ${access}${capacity}${renderActivityActions(activity)}
    </article>
  </main>`;
  return renderDocument(source, activity.title, main, options);
}

function renderV3ActivityDetail(input, slug, options = {}) {
  const source = createV3DeploymentAgnosticVenueSource(input);
  return renderActivityDetailFromResource(source, findActivityBySlug(source, slug), options);
}

function renderV3Route(input, pathname, options = {}) {
  const source = createV3DeploymentAgnosticVenueSource(input);
  const basePath = options.basePath || '';
  let path = String(pathname || '/');
  if (basePath && path.startsWith(basePath)) path = path.slice(basePath.length) || '/';
  if (path === '/') return renderV3Page(source, { ...options, pageSlug: '' });

  const activityMatch = /^\/activities\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
  if (activityMatch) {
    return renderActivityDetailFromResource(source, findActivityBySlug(source, activityMatch[1]), options);
  }

  const eventMatch = /^\/events\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
  if (eventMatch) {
    const legacyMap = options.legacyEventRoutes || {};
    const activityId = legacyMap[path];
    if (!activityId) throw new V3RendererError(`legacy event route is not bound: ${path}`);
    return renderActivityDetailFromResource(source, findActivityById(source, activityId), options);
  }

  const pageSlug = path.replace(/^\//, '');
  if (source.site.pages.some((page) => page.slug === pageSlug)) {
    return renderV3Page(source, { ...options, pageSlug });
  }
  throw new V3RendererError(`route does not exist: ${path}`);
}

function renderV3ThemeStylesheet(input) {
  const source = createV3DeploymentAgnosticVenueSource(input);
  const colors = source.site.brand.design.colors;
  return `:root{--v3-canvas:${colors.canvas};--v3-surface:${colors.surface};--v3-border:${colors.border};--v3-text:${colors.text};--v3-muted:${colors.textMuted};--v3-accent:${colors.accent};--v3-accent-text:${colors.accentText};--v3-focus:${colors.focusRing};}`;
}

function renderV3PublicStylesheet() {
  return `
*{box-sizing:border-box}html{background:var(--v3-canvas);color:var(--v3-text);font-family:ui-sans-serif,system-ui,sans-serif}body{margin:0;line-height:1.55}a{color:inherit}.v3-site-header{display:flex;gap:1rem;align-items:center;justify-content:space-between;padding:1rem max(1rem,calc((100vw - 72rem)/2));border-bottom:1px solid var(--v3-border)}.v3-wordmark{font-weight:800;text-decoration:none}.v3-primary-nav{display:flex;gap:.75rem;flex-wrap:wrap}.v3-primary-nav a,.v3-action{display:inline-flex;align-items:center;min-height:44px;padding:.55rem .8rem;border-radius:.5rem}.v3-action--primary{background:var(--v3-accent);color:var(--v3-accent-text);text-decoration:none}.v3-action--secondary{border:1px solid var(--v3-border);text-decoration:none}.v3-page,.v3-activity-detail{width:min(72rem,calc(100% - 2rem));margin:0 auto;padding:2rem 0 4rem}.v3-component,.v3-activity-detail article{margin:2rem 0;padding:1.25rem;background:var(--v3-surface);border:1px solid var(--v3-border);border-radius:.75rem}.v3-activity-list__items{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:1rem}.v3-activity-card{padding:1rem;border:1px solid var(--v3-border);border-radius:.6rem}.v3-media img,.v3-activity-media img{display:block;max-width:100%;height:auto}.v3-kicker,.v3-eyebrow,.v3-note{color:var(--v3-muted)}.v3-status--important{font-weight:800}.v3-activity-presence,.v3-visit-facts{margin:1rem 0}.v3-primary-nav a:focus-visible,.v3-action:focus-visible,.v3-wordmark:focus-visible,.v3-activity-card a:focus-visible{outline:3px solid var(--v3-focus);outline-offset:3px}@media (max-width:640px){.v3-site-header{align-items:flex-start;flex-direction:column}.v3-primary-nav{width:100%;overflow-wrap:anywhere}.v3-page,.v3-activity-detail{width:min(100% - 1rem,72rem);padding-top:1rem}.v3-component,.v3-activity-detail article{padding:1rem;margin:1rem 0}.v3-activity-list__items{grid-template-columns:1fr}}@media (prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
`.trim();
}

module.exports = {
  V3RendererError,
  renderV3ActivityDetail,
  renderV3Page,
  renderV3PublicStylesheet,
  renderV3Route,
  renderV3ThemeStylesheet,
};
