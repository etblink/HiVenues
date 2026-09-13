'use strict';

const {
  createV3DeploymentAgnosticVenueSource,
} = require('../source');
const { projectActivitySocialState } = require('../social-bindings');

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

function renderActivityDiscussion(source, activity, basePath) {
  const projection = projectActivitySocialState(
    source,
    source.activityBindings.hiveSocial,
    activity.id,
  );
  if (projection.socializationState !== 'SOCIAL_ROOT_BOUND' || !projection.primary) return '';
  const href = pathJoin(
    basePath,
    `/post/${projection.primary.hiveRef.author}/${projection.primary.hiveRef.permlink}`,
  );
  return `<section class="v3-activity-discussion" aria-label="Discussion" data-social-state="SOCIAL_ROOT_BOUND">
    <h2>Discussion</h2>
    <p>Join the public conversation about this activity.</p>
    <a class="v3-action v3-action--secondary" data-social-role="PRIMARY_DISCUSSION" href="${escapeHtml(href)}">Join discussion</a>
  </section>`;
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
  const headingClass = page.slug === '' ? 'v3-page-heading v3-page-heading--home' : 'v3-page-heading';
  const main = `<main class="v3-page" data-page-id="${escapeHtml(page.id)}"><header class="${headingClass}"><h1>${escapeHtml(page.title)}</h1></header>${components}</main>`;
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
      ${access}${capacity}${renderActivityActions(activity)}${renderActivityDiscussion(source, activity, options.basePath || '')}
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
*{box-sizing:border-box}:root{--v3-site-width:72rem;--v3-reading-width:46rem;--v3-space-section:clamp(3rem,7vw,6.5rem)}html{background:var(--v3-canvas);color:var(--v3-text);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:16px}body{margin:0;line-height:1.65;letter-spacing:.005em}body::before{content:"";display:block;height:.25rem;background:var(--v3-accent)}a{color:inherit;text-decoration-thickness:.08em;text-underline-offset:.18em}h1,h2,h3{margin-top:0;font-family:ui-serif,Georgia,Cambria,"Times New Roman",serif;font-weight:650;line-height:1.05;letter-spacing:-.025em;text-wrap:balance}p{max-width:68ch}.v3-site-header{width:min(var(--v3-site-width),calc(100% - 3rem));margin:0 auto;display:flex;gap:2rem;align-items:center;justify-content:space-between;padding:1.4rem 0;border-bottom:1px solid var(--v3-border)}.v3-wordmark{font-size:1.1rem;font-weight:800;letter-spacing:-.015em;text-decoration:none}.v3-primary-nav{display:flex;gap:clamp(.9rem,2.5vw,1.75rem);align-items:center;flex-wrap:wrap}.v3-primary-nav a,.v3-action{display:inline-flex;align-items:center;min-height:44px}.v3-primary-nav a{padding:.45rem .1rem;font-size:.92rem;font-weight:650;text-decoration-color:transparent;text-underline-offset:.35rem}.v3-primary-nav a:hover{text-decoration-color:currentColor}.v3-action{padding:.62rem .9rem;border-radius:.55rem;font-weight:750;justify-content:center}.v3-action--primary{background:var(--v3-accent);border:1px solid var(--v3-accent);color:var(--v3-accent-text);text-decoration:none}.v3-action--secondary{background:var(--v3-surface);border:1px solid var(--v3-border);text-decoration:none}.v3-page,.v3-activity-detail{width:min(var(--v3-site-width),calc(100% - 3rem));margin:0 auto;padding:0 0 5rem}.v3-page-heading{max-width:var(--v3-reading-width);padding:clamp(3rem,8vw,6.5rem) 0 clamp(1.25rem,3vw,2.25rem)}.v3-page-heading--home{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.v3-page-heading h1,.v3-activity-detail>article>header h1{font-size:clamp(2.7rem,7vw,5.6rem);max-width:12ch;margin-bottom:0}.v3-component{margin:var(--v3-space-section) 0;padding:0;background:transparent}.v3-narrative{max-width:var(--v3-reading-width)}.v3-narrative>p:not(.v3-kicker):not(.v3-note),.v3-hero__copy>p:not(.v3-kicker):not(.v3-note){font-size:clamp(1.05rem,1.5vw,1.18rem)}.v3-component h2,.v3-activity-detail h2{font-size:clamp(2rem,4vw,3.4rem);max-width:18ch;margin-bottom:1rem}.v3-component h3{font-size:clamp(1.45rem,2.5vw,2rem);margin-bottom:.7rem}.v3-hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr));gap:clamp(2rem,5vw,5rem);align-items:center}.v3-hero__copy{max-width:36rem}.v3-hero__media,.v3-activity-media{overflow:hidden;border:1px solid var(--v3-border);border-radius:1.1rem;background:var(--v3-surface)}.v3-hero__media img,.v3-activity-media img{width:100%}.v3-activity-detail article{margin:0;padding:clamp(3rem,7vw,6rem) 0;background:transparent}.v3-activity-detail>article>header{max-width:var(--v3-reading-width);margin-bottom:2rem}.v3-activity-media{max-width:60rem;margin:2rem 0}.v3-activity-description{max-width:58ch;margin:2rem 0;font-size:clamp(1.08rem,2vw,1.25rem)}.v3-activity-time{max-width:var(--v3-reading-width);margin:2rem 0;padding:1.1rem 0;border-top:1px solid var(--v3-border);border-bottom:1px solid var(--v3-border)}.v3-activity-time span{display:block;margin-bottom:.25rem;color:var(--v3-muted);font-size:.75rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.v3-activity-presence{max-width:var(--v3-reading-width);padding:1.5rem 0;border-top:1px solid var(--v3-border)}.v3-activity-discussion{max-width:var(--v3-reading-width);padding:1.5rem 0;border-top:1px solid var(--v3-border)}.v3-activity-presence h2,.v3-activity-discussion h2{font-size:clamp(1.45rem,3vw,2rem);margin-bottom:.85rem}.v3-activity-discussion p{color:var(--v3-muted)}.v3-activity-presence address,.v3-visit-facts address{font-style:normal;font-weight:700}.v3-access-note,.v3-capacity{max-width:var(--v3-reading-width);color:var(--v3-muted)}.v3-activity-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:2rem}.v3-activity-list__items{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr));column-gap:clamp(2rem,5vw,4rem);row-gap:0;border-top:1px solid var(--v3-border)}.v3-activity-card{padding:1.5rem 0;border-bottom:1px solid var(--v3-border)}.v3-activity-card h3 a{text-decoration-color:transparent}.v3-activity-card h3 a:hover{text-decoration-color:currentColor}.v3-activity-card>p:not(.v3-eyebrow):not(.v3-status){color:var(--v3-muted)}.v3-activity-card .v3-status{margin-bottom:0}.v3-media,.v3-activity-media{margin-top:0}.v3-media img,.v3-activity-media img{display:block;max-width:100%;height:auto}.v3-kicker,.v3-eyebrow{margin:0 0 .7rem;color:var(--v3-muted);font-size:.78rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.v3-note{color:var(--v3-muted);font-size:.95rem}.v3-status{color:var(--v3-muted);font-size:.82rem;font-weight:750;letter-spacing:.08em;text-transform:uppercase}.v3-status--important{color:var(--v3-text);font-weight:900}.v3-activity-presence,.v3-activity-discussion,.v3-visit-facts{margin:1.5rem 0}.v3-visit-facts{max-width:var(--v3-reading-width);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));gap:1rem 2rem;padding-top:1.5rem;border-top:1px solid var(--v3-border)}.v3-visit-facts>*{margin:0}.v3-primary-nav a:focus-visible,.v3-action:focus-visible,.v3-wordmark:focus-visible,.v3-activity-card a:focus-visible{outline:3px solid var(--v3-focus);outline-offset:4px}.v3-primary-nav a,.v3-activity-card a{transition:text-decoration-color .16s ease}.v3-action{transition:transform .16s ease,box-shadow .16s ease}.v3-action:hover{transform:translateY(-1px)}@media (max-width:640px){.v3-site-header{width:calc(100% - 2rem);align-items:flex-start;flex-direction:column;gap:.35rem;padding:1rem 0}.v3-primary-nav{width:100%;gap:.8rem 1.15rem;overflow-wrap:anywhere}.v3-page,.v3-activity-detail{width:calc(100% - 2rem);padding-bottom:3rem}.v3-page-heading{padding:2.75rem 0 1rem}.v3-page-heading--home{padding:0}.v3-page-heading h1,.v3-activity-detail>article>header h1{font-size:clamp(2.4rem,13vw,4rem)}.v3-component{margin:3rem 0}.v3-hero{gap:2rem}.v3-hero__media,.v3-activity-media{border-radius:.8rem}.v3-activity-detail article{padding:2.75rem 0}.v3-activity-actions .v3-action{flex:1 1 100%}.v3-activity-discussion .v3-action{flex:1 1 100%}.v3-visit-facts{grid-template-columns:1fr}.v3-activity-list__items{grid-template-columns:1fr}}@media (prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
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
