'use strict';

const {
  createV2DeploymentAgnosticVenueSource,
  resolveResponsiveComponent,
} = require('../source');
const {
  renderV2PublicStylesheet,
  renderV2ThemeStylesheet,
} = require('./styles');

class V2RendererError extends Error {
  constructor(message) {
    super(`HiVenues v2 renderer error: ${message}`);
    this.name = 'V2RendererError';
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

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function classToken(value) {
  return String(value).replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

function assetMap(source) {
  return new Map(source.media.assets.map((asset) => [asset.id, asset]));
}

function resourceMaps(source) {
  return {
    events: new Map(source.resources.events.map((resource) => [resource.id, resource])),
    programs: new Map(source.resources.programs.map((resource) => [resource.id, resource])),
    menus: new Map(source.resources.menus.map((resource) => [resource.id, resource])),
    equipment: new Map(source.resources.equipment.map((resource) => [resource.id, resource])),
  };
}

function pagePath(page) {
  return page.slug === '' ? '/' : `/${encodeURIComponent(page.slug)}`;
}

function joinBase(basePath, path) {
  if (!basePath) return path;
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return path === '/' ? `${base}/` : `${base}${path}`;
}

function formatTimestamp(timestamp) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(timestamp);
  if (!match) return timestamp;
  const [, year, month, day, hourText, minute] = match;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hour = Number(hourText);
  const displayHour = hour % 12 || 12;
  const amPm = hour < 12 ? 'AM' : 'PM';
  return `${months[Number(month) - 1]} ${Number(day)}, ${year} · ${displayHour}:${minute} ${amPm}`;
}

function renderMediaUsage(source, usage, options = {}) {
  if (!usage) return '';
  const asset = assetMap(source).get(usage.assetId);
  if (!asset) throw new V2RendererError(`missing managed media asset: ${usage.assetId}`);
  const treatment = usage.treatment || {};
  const focal = treatment.focalPoint || { x: 0.5, y: 0.5 };
  const classes = [
    'v2-media',
    `v2-aspect--${classToken(treatment.aspectRecipeId || 'aspect-original').replace(/^aspect-/, '')}`,
    `v2-fit--${classToken(treatment.fit || 'cover')}`,
  ];
  const alt = usage.decorative ? '' : usage.alt;
  const decorative = usage.decorative ? ' aria-hidden="true"' : '';
  const loading = options.eager ? 'eager' : 'lazy';
  return `<div class="${classes.join(' ')}" style="--v2-focal-x:${Number(focal.x) * 100}%;--v2-focal-y:${Number(focal.y) * 100}%"><img src="${escapeHtml(asset.src)}" width="${asset.width}" height="${asset.height}" alt="${escapeHtml(alt || '')}" loading="${loading}" decoding="async"${decorative}></div>`;
}

function resolvedResponsiveClasses(component) {
  const parts = [];
  for (const [viewport, prefix] of [['desktop', 'd'], ['tablet', 't'], ['mobile', 'm']]) {
    const resolved = resolveResponsiveComponent(component, viewport);
    for (const [key, value] of Object.entries(resolved.values)) {
      parts.push(`v2-${prefix}-${classToken(key)}--${classToken(value)}`);
    }
  }
  return parts;
}

function componentShell(component, inner) {
  const classes = [
    'v2-component',
    `v2-component--${classToken(component.kind)}`,
    `v2-recipe--${classToken(component.recipeId)}`,
    ...resolvedResponsiveClasses(component),
  ];
  return `<section class="${classes.join(' ')}" data-component-id="${escapeHtml(component.id)}" data-component-kind="${escapeHtml(component.kind)}" data-recipe="${escapeHtml(component.recipeId)}">${inner}</section>`;
}

function kicker(value) {
  return value ? `<p class="v2-kicker">${escapeHtml(value)}</p>` : '';
}

function note(value) {
  return value ? `<p class="v2-note">${escapeHtml(value)}</p>` : '';
}

function renderAction(action, extraClass = '') {
  if (!action) return '';
  return `<a class="v2-action ${extraClass}" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`;
}

function renderHero(source, component, isFirstHeading) {
  const content = component.content;
  const heading = content.heading || source.venue.displayName;
  const headingTag = isFirstHeading ? 'h1' : 'h2';
  const media = renderMediaUsage(source, content.media, { eager: true });
  return componentShell(component, `<div class="v2-component__inner v2-hero">
    <div class="v2-component__copy">
      ${kicker(content.eyebrow)}
      <${headingTag} class="v2-display">${escapeHtml(heading)}</${headingTag}>
      <p class="v2-lede">${escapeHtml(content.body)}</p>
      ${note(content.note)}
      ${renderAction(content.primaryAction, 'v2-action--primary')}
    </div>
    ${media ? `<div class="v2-component__media">${media}</div>` : ''}
  </div>`);
}

function renderNarrative(component, content, headingTag = 'h2') {
  return componentShell(component, `<div class="v2-component__inner v2-narrative">
    ${kicker(content.kicker)}
    <${headingTag}>${escapeHtml(content.heading)}</${headingTag}>
    <p class="v2-lede">${escapeHtml(content.body)}</p>
    ${note(content.note)}
  </div>`);
}

function renderVisit(source, component) {
  const content = component.content;
  const business = source.venue.business;
  return componentShell(component, `<div class="v2-component__inner v2-visit">
    <div class="v2-component__copy">
      ${kicker(content.kicker)}
      <h2>${escapeHtml(content.heading)}</h2>
      <p class="v2-lede">${escapeHtml(content.body)}</p>
      ${note(content.note)}
    </div>
    <address class="v2-business-card">
      <strong>${escapeHtml(source.venue.displayName)}</strong>
      <span>${escapeHtml(business.address)}</span>
      <span>${escapeHtml(business.hours)}</span>
      <a href="tel:${escapeHtml(business.phone.replace(/[^+\d]/g, ''))}">${escapeHtml(business.phone)}</a>
      <a href="${escapeHtml(business.mapUrl)}">Directions</a>
    </address>
  </div>`);
}

function renderGallery(source, component) {
  const content = component.content;
  const items = content.items.map((item) => `<figure class="v2-gallery__item" data-gallery-usage-id="${escapeHtml(item.id)}">
    ${renderMediaUsage(source, item)}
    ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
  </figure>`).join('');
  return componentShell(component, `<div class="v2-component__inner">
    ${kicker(content.kicker)}
    <h2>${escapeHtml(content.heading)}</h2>
    ${content.intro ? `<p class="v2-lede">${escapeHtml(content.intro)}</p>` : ''}
    <div class="v2-gallery">${items}</div>
  </div>`);
}

function renderOfficialUpdates(component) {
  const content = component.content;
  return componentShell(component, `<div class="v2-component__inner">
    <p class="v2-kicker">Read-only community preview</p>
    <h2>${escapeHtml(content.heading)}</h2>
    <div class="v2-empty-state">
      <strong>${escapeHtml(content.emptyLead)}</strong>
      <p>${escapeHtml(content.emptyBody)}</p>
    </div>
  </div>`);
}

function renderEventList(source, component, resources, options) {
  const content = component.content;
  const events = content.resourceIds.map((id) => resources.events.get(id));
  const items = events.map((event) => {
    if (!event) throw new V2RendererError(`event-list references missing event`);
    const href = joinBase(options.basePath, `${options.eventBasePath}/${encodeURIComponent(event.slug)}`);
    return `<article class="v2-list-card v2-event-card" data-resource-id="${escapeHtml(event.id)}">
      <div class="v2-list-card__meta"><time datetime="${escapeHtml(event.startAt)}">${escapeHtml(formatTimestamp(event.startAt))}</time><span class="v2-state" data-state="${escapeHtml(event.state)}">${escapeHtml(event.state)}</span></div>
      <h3><a href="${escapeHtml(href)}">${escapeHtml(event.title)}</a></h3>
      <p>${escapeHtml(event.description)}</p>
      ${event.accessNote ? `<p class="v2-note">${escapeHtml(event.accessNote)}</p>` : ''}
      <div class="v2-actions"><a class="v2-action v2-action--secondary" href="${escapeHtml(href)}">Details</a>${renderAction(event.externalAction, 'v2-action--primary')}</div>
    </article>`;
  }).join('');
  const empty = events.length ? '' : `<div class="v2-empty-state"><strong>${escapeHtml(content.emptyLead || 'Nothing listed yet.')}</strong><p>${escapeHtml(content.emptyBody || '')}</p></div>`;
  return componentShell(component, `<div class="v2-component__inner">
    ${kicker(content.kicker)}
    <h2>${escapeHtml(content.heading)}</h2>
    ${content.intro ? `<p class="v2-lede">${escapeHtml(content.intro)}</p>` : ''}
    <div class="v2-resource-list">${items || empty}</div>
  </div>`);
}

function renderProgramList(component, resources) {
  const content = component.content;
  const programs = content.resourceIds.map((id) => resources.programs.get(id));
  const items = programs.map((program) => {
    if (!program) throw new V2RendererError('program-list references missing program');
    return `<article class="v2-list-card" data-resource-id="${escapeHtml(program.id)}">
      <div class="v2-list-card__meta"><time datetime="${escapeHtml(program.startAt)}">${escapeHtml(formatTimestamp(program.startAt))}</time><span class="v2-state" data-state="${escapeHtml(program.state)}">${escapeHtml(program.state)}</span></div>
      <h3>${escapeHtml(program.title)}</h3>
      <p>${escapeHtml(program.description)}</p>
      <p class="v2-note">${escapeHtml(program.accessNote)}</p>
      ${renderAction(program.link ? { label: 'Learn more', href: program.link } : null, 'v2-action--secondary')}
    </article>`;
  }).join('');
  const empty = programs.length ? '' : `<div class="v2-empty-state"><strong>${escapeHtml(content.emptyLead || 'Nothing listed yet.')}</strong><p>${escapeHtml(content.emptyBody || '')}</p></div>`;
  return componentShell(component, `<div class="v2-component__inner">
    ${kicker(content.kicker)}
    <h2>${escapeHtml(content.heading)}</h2>
    ${content.intro ? `<p class="v2-lede">${escapeHtml(content.intro)}</p>` : ''}
    <div class="v2-resource-list">${items || empty}</div>
  </div>`);
}

function renderEquipment(component, resources) {
  const content = component.content;
  const items = content.resourceIds.map((id) => resources.equipment.get(id));
  const cards = items.map((item) => {
    if (!item) throw new V2RendererError('equipment-status references missing equipment');
    return `<article class="v2-list-card v2-equipment-card" data-resource-id="${escapeHtml(item.id)}">
      <div class="v2-list-card__meta"><span class="v2-state" data-state="${escapeHtml(item.state)}">${escapeHtml(item.state)}</span><time datetime="${escapeHtml(item.lastUpdated)}">${escapeHtml(formatTimestamp(item.lastUpdated))}</time></div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.note)}</p>
      <p class="v2-note">${escapeHtml(item.accessNote)}</p>
      ${item.group ? `<span class="v2-chip">${escapeHtml(item.group)}</span>` : ''}
    </article>`;
  }).join('');
  const empty = items.length ? '' : `<div class="v2-empty-state"><strong>${escapeHtml(content.emptyLead || 'No status is posted.')}</strong><p>${escapeHtml(content.emptyBody || '')}</p></div>`;
  return componentShell(component, `<div class="v2-component__inner">
    ${kicker(content.kicker)}
    <h2>${escapeHtml(content.heading)}</h2>
    ${content.intro ? `<p class="v2-lede">${escapeHtml(content.intro)}</p>` : ''}
    <div class="v2-resource-list">${cards || empty}</div>
  </div>`);
}

function renderMenu(component, resources) {
  const content = component.content;
  const menus = content.resourceIds.map((id) => resources.menus.get(id));
  const markup = menus.map((menu) => {
    if (!menu) throw new V2RendererError('menu component references missing menu');
    const sections = menu.sections.map((section) => `<section class="v2-menu-section" data-menu-section-id="${escapeHtml(section.id)}">
      <h3>${escapeHtml(section.title)}</h3>
      <div class="v2-menu-items">${section.items.map((item) => `<article class="v2-menu-item" data-menu-item-id="${escapeHtml(item.id)}">
        <div class="v2-menu-item__title"><h4>${escapeHtml(item.name)}</h4>${item.priceLabel ? `<span>${escapeHtml(item.priceLabel)}</span>` : ''}</div>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      </article>`).join('')}</div>
    </section>`).join('');
    return `<div class="v2-menu" data-resource-id="${escapeHtml(menu.id)}"><h3 class="v2-menu__title">${escapeHtml(menu.title)}</h3>${sections}</div>`;
  }).join('');
  const empty = menus.length ? '' : `<div class="v2-empty-state"><strong>${escapeHtml(content.emptyLead || 'No menu is listed.')}</strong><p>${escapeHtml(content.emptyBody || '')}</p></div>`;
  return componentShell(component, `<div class="v2-component__inner">
    ${kicker(content.kicker)}
    <h2>${escapeHtml(content.heading)}</h2>
    ${content.intro ? `<p class="v2-lede">${escapeHtml(content.intro)}</p>` : ''}
    ${markup || empty}
  </div>`);
}

function renderCommunityEntry(source, component, options) {
  if (source.capabilities.community.state !== 'configured') {
    throw new V2RendererError('community-entry cannot render while Community is disabled');
  }
  const content = component.content;
  const href = joinBase(options.basePath, options.capabilityPaths.community);
  return componentShell(component, `<div class="v2-component__inner v2-community-entry">
    <div>
      ${kicker(content.kicker)}
      <h2>${escapeHtml(content.heading)}</h2>
      <p class="v2-lede">${escapeHtml(content.body)}</p>
      ${note(content.note)}
    </div>
    <a class="v2-action v2-action--primary" href="${escapeHtml(href)}">Open community</a>
  </div>`);
}

function renderComponent(source, component, resources, options, state) {
  switch (component.kind) {
    case 'venue-hero': {
      const html = renderHero(source, component, !state.hasH1);
      state.hasH1 = true;
      return html;
    }
    case 'gallery':
      return renderGallery(source, component);
    case 'hours-location':
    case 'contact-visit':
      return renderVisit(source, component);
    case 'editorial-intro':
      return renderNarrative(component, component.content);
    case 'official-updates':
      return renderOfficialUpdates(component);
    case 'event-list':
      return renderEventList(source, component, resources, options);
    case 'program-list':
      return renderProgramList(component, resources);
    case 'menu':
    case 'menu-preview':
      return renderMenu(component, resources);
    case 'equipment-status':
      return renderEquipment(component, resources);
    case 'community-entry':
      return renderCommunityEntry(source, component, options);
    default:
      throw new V2RendererError(`unsupported component kind: ${component.kind}`);
  }
}

function navHref(source, entry, options) {
  if (entry.target.kind === 'page') {
    const page = source.site.pages.find((candidate) => candidate.id === entry.target.pageId);
    if (!page) throw new V2RendererError(`navigation references missing page: ${entry.target.pageId}`);
    return joinBase(options.basePath, pagePath(page));
  }
  if (entry.target.kind === 'capability') {
    const target = options.capabilityPaths[entry.target.capability];
    if (!target) throw new V2RendererError(`no renderer route for capability: ${entry.target.capability}`);
    return joinBase(options.basePath, target);
  }
  return entry.target.href;
}

function renderNavigation(source, currentPageId, options) {
  const links = source.site.navigation.map((entry) => {
    const active = entry.target.kind === 'page' && entry.target.pageId === currentPageId;
    return `<a class="v2-nav__link" href="${escapeHtml(navHref(source, entry, options))}"${active ? ' aria-current="page"' : ''}>${escapeHtml(entry.label)}</a>`;
  }).join('');
  return `<header class="v2-site-header"><div class="v2-shell v2-site-header__inner">
    <a class="v2-wordmark" href="${escapeHtml(joinBase(options.basePath, '/'))}">${escapeHtml(source.venue.displayName)}</a>
    <nav class="v2-nav" aria-label="Primary">${links}</nav>
  </div></header>`;
}

function renderFooter(source) {
  return `<footer class="v2-site-footer"><div class="v2-shell v2-site-footer__inner">
    <div><strong>${escapeHtml(source.venue.displayName)}</strong><p>${escapeHtml(source.venue.business.address)}</p></div>
    <div><p>${escapeHtml(source.venue.business.hours)}</p><a href="${escapeHtml(source.venue.business.websiteUrl)}">Venue website</a></div>
  </div></footer>`;
}

function designClasses(source) {
  const design = source.site.brand.design;
  return [
    `v2-type--${classToken(design.typographyRecipeId).replace(/^type-/, '')}`,
    `v2-density--${classToken(design.densityRecipeId).replace(/^density-/, '')}`,
    `v2-shape--${classToken(design.shapeRecipeId).replace(/^shape-/, '')}`,
    `v2-surface--${classToken(design.surfaceRecipeId).replace(/^surface-/, '')}`,
  ].join(' ');
}

function documentShell(source, body, {
  title,
  description,
  currentPageId = null,
  basePath = '',
  stylesheetHref = '/__hivenues-v2/styles.css',
  themeStylesheetHref = '/__hivenues-v2/theme.css',
  structuredData = null,
  ...rest
} = {}) {
  const options = {
    basePath,
    stylesheetHref,
    themeStylesheetHref,
    eventBasePath: rest.eventBasePath || '/events',
    capabilityPaths: {
      community: '/community',
      transaction: '/pay',
      ...(rest.capabilityPaths || {}),
    },
  };
  const structured = structuredData
    ? `<script type="application/ld+json">${escapeJsonForHtml(structuredData)}</script>`
    : '';
  return `<!doctype html>
<html lang="en" class="${designClasses(source)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="stylesheet" href="${escapeHtml(joinBase(basePath, stylesheetHref))}">
  <link rel="stylesheet" href="${escapeHtml(joinBase(basePath, themeStylesheetHref))}">
  ${structured}
</head>
<body>
  <a class="v2-skip-link" href="#main">Skip to content</a>
  ${renderNavigation(source, currentPageId, options)}
  <main id="main" tabindex="-1">${body}</main>
  ${renderFooter(source)}
</body>
</html>`;
}

function findPage(source, { pageId, pageSlug } = {}) {
  if (pageId) return source.site.pages.find((page) => page.id === pageId) || null;
  if (pageSlug !== undefined) return source.site.pages.find((page) => page.slug === pageSlug) || null;
  return source.site.pages.find((page) => page.id === source.site.homePageId) || null;
}

function renderV2Page(input, options = {}) {
  const source = createV2DeploymentAgnosticVenueSource(input);
  const page = findPage(source, options);
  if (!page) throw new V2RendererError('requested page does not exist');
  const resources = resourceMaps(source);
  const state = { hasH1: false };
  const renderOptions = {
    basePath: options.basePath || '',
    eventBasePath: options.eventBasePath || '/events',
    capabilityPaths: {
      community: '/community',
      transaction: '/pay',
      ...(options.capabilityPaths || {}),
    },
  };
  const components = page.components.map((component) =>
    renderComponent(source, component, resources, renderOptions, state)).join('');
  const leadingHeading = state.hasH1
    ? ''
    : `<section class="v2-component v2-page-intro"><div class="v2-component__inner"><h1>${escapeHtml(page.title)}</h1></div></section>`;
  return documentShell(source, `${leadingHeading}${components}`, {
    ...options,
    currentPageId: page.id,
    title: page.seo.title || `${page.title} · ${source.venue.displayName}`,
    description: page.seo.description,
  });
}

function eventStructuredData(source, event, options) {
  const url = new URL(
    joinBase(options.basePath || '', `${options.eventBasePath || '/events'}/${encodeURIComponent(event.slug)}`),
    source.venue.business.websiteUrl,
  ).toString();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.startAt,
    endDate: event.endAt,
    eventStatus: event.state === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    description: event.description,
    url,
    location: {
      '@type': 'Place',
      name: source.venue.displayName,
      address: source.venue.business.address,
    },
  };
  if (event.externalAction) data.offers = { '@type': 'Offer', url: event.externalAction.href };
  const asset = event.mediaAssetId ? assetMap(source).get(event.mediaAssetId) : null;
  if (asset) data.image = [new URL(asset.src, source.venue.business.websiteUrl).toString()];
  return data;
}

function eventIndexPath(source) {
  const eventPage = source.site.pages.find((page) =>
    page.components.some((component) => component.kind === 'event-list'));
  return eventPage ? pagePath(eventPage) : '/';
}

function renderV2EventDetail(input, eventSlug, options = {}) {
  const source = createV2DeploymentAgnosticVenueSource(input);
  const event = source.resources.events.find((candidate) => candidate.slug === eventSlug);
  if (!event) throw new V2RendererError(`event does not exist: ${eventSlug}`);
  const asset = event.mediaAssetId ? assetMap(source).get(event.mediaAssetId) : null;
  const media = asset
    ? renderMediaUsage(source, {
        assetId: asset.id,
        alt: `${event.title} event artwork`,
        decorative: false,
        treatment: {
          focalPoint: { x: 0.5, y: 0.5 },
          fit: 'cover',
          aspectRecipeId: 'aspect-portrait',
        },
      }, { eager: true })
    : '';
  const body = `<article class="v2-event-detail v2-shell">
    <a class="v2-back-link" href="${escapeHtml(joinBase(options.basePath || '', eventIndexPath(source)))}">← Back to events</a>
    <div class="v2-event-detail__grid">
      <div class="v2-event-detail__copy">
        <p class="v2-kicker">Live event</p>
        <h1>${escapeHtml(event.title)}</h1>
        <p class="v2-event-detail__time"><time datetime="${escapeHtml(event.startAt)}">${escapeHtml(formatTimestamp(event.startAt))}</time></p>
        <p class="v2-lede">${escapeHtml(event.description)}</p>
        ${event.accessNote ? `<p class="v2-note">${escapeHtml(event.accessNote)}</p>` : ''}
        ${renderAction(event.externalAction, 'v2-action--primary')}
      </div>
      ${media ? `<div class="v2-event-detail__media">${media}</div>` : ''}
    </div>
  </article>`;
  return documentShell(source, body, {
    ...options,
    title: `${event.title} · ${source.venue.displayName}`,
    description: event.description,
    structuredData: eventStructuredData(source, event, options),
  });
}

module.exports = {
  V2RendererError,
  escapeHtml,
  formatTimestamp,
  pagePath,
  renderV2EventDetail,
  renderV2Page,
  renderV2PublicStylesheet,
  renderV2ThemeStylesheet,
};
