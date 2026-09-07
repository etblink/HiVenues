'use strict';

const { URLSearchParams } = require('node:url');
const {
  createV2DeploymentAgnosticVenueSource,
  createV2SemanticCanvasProjection,
  deriveV2DeploymentAgnosticVenueSourceDigest,
  pathOwnership,
  resolveResponsiveComponent,
} = require('./source');
const { renderV2Page } = require('./renderer');

const V2_READ_ONLY_STUDIO_SELECTION_SCHEMA_VERSION = 1;
const V2_READ_ONLY_STUDIO_VIEWPORTS = Object.freeze({
  desktop: Object.freeze({ width: 1440, height: 1000, label: 'Desktop' }),
  tablet: Object.freeze({ width: 834, height: 1112, label: 'Tablet' }),
  mobile: Object.freeze({ width: 390, height: 844, label: 'Mobile' }),
});
const SAFE_V2_READ_ONLY_STUDIO_ERROR =
  'The selected Studio item is unavailable. Return to the read-only Studio and choose another item.';

class V2ReadOnlyStudioError extends Error {
  constructor(message) {
    super(`HiVenues v2 read-only Studio error: ${message}`);
    this.name = 'V2ReadOnlyStudioError';
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function strictLocalPath(value, label = 'local path') {
  if (typeof value !== 'string' || !/^\/(?!\/)[^?#\s\\]*$/.test(value)) {
    throw new V2ReadOnlyStudioError(`${label} must be a same-origin local path`);
  }
  return value;
}

function humanize(value) {
  const result = String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .trim();
  return result ? result[0].toUpperCase() + result.slice(1) : '';
}

function summary(value) {
  if (value === null || value === undefined) return 'Not set';
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    return value.length > 180 ? `${value.slice(0, 177)}…` : value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'No items';
    if (value.every((item) => typeof item === 'string')) {
      const shown = value.slice(0, 3).join(', ');
      return value.length > 3 ? `${value.length} linked items · ${shown}, …` : `${value.length} linked item${value.length === 1 ? '' : 's'} · ${shown}`;
    }
    return `${value.length} structured item${value.length === 1 ? '' : 's'}`;
  }
  if (typeof value === 'object') {
    if (typeof value.assetId === 'string') return `Managed media · ${value.assetId}`;
    if (typeof value.label === 'string' && typeof value.href === 'string') {
      return `${value.label} → ${value.href}`;
    }
    if (typeof value.heading === 'string') return `Structured content · ${value.heading}`;
    return 'Structured value';
  }
  return String(value);
}

function resourcePointer(source, resourceKind, resourceId) {
  const collection = source.resources[resourceKind];
  if (!Array.isArray(collection)) {
    throw new V2ReadOnlyStudioError(`unknown resource collection: ${resourceKind}`);
  }
  const index = collection.findIndex((resource) => resource.id === resourceId);
  if (index < 0) throw new V2ReadOnlyStudioError(`missing resource: ${resourceKind}:${resourceId}`);
  return `/resources/${resourceKind}/${index}`;
}

function sourceLookup(source) {
  const pages = new Map(source.site.pages.map((page) => [page.id, page]));
  const components = new Map();
  for (const page of source.site.pages) {
    for (const component of page.components) {
      components.set(component.id, { page, component });
    }
  }
  return { pages, components };
}

function componentLabel(component) {
  return component.content?.heading
    || component.content?.title
    || humanize(component.kind);
}

function resourceLabel(resource) {
  return resource.title || resource.name || resource.id;
}

function buildStudioEntries(source, projection) {
  const lookup = sourceLookup(source);
  const entries = [];
  const seen = new Set();

  function add(entry) {
    if (seen.has(entry.selectionId)) {
      throw new V2ReadOnlyStudioError(`duplicate Studio selection identity: ${entry.selectionId}`);
    }
    seen.add(entry.selectionId);
    entries.push(entry);
  }

  add({
    selectionId: projection.root.id,
    nodeId: projection.root.id,
    depth: 0,
    kind: 'venue',
    label: source.venue.displayName,
    parentSelectionId: null,
    pageId: source.site.homePageId,
    componentId: null,
    sourcePointer: '/venue',
    node: projection.root,
    resourceKind: null,
    resourceId: null,
  });

  for (const pageNode of projection.root.children) {
    const pageId = pageNode.stableIdentity.value;
    const page = lookup.pages.get(pageId);
    if (!page) throw new V2ReadOnlyStudioError(`projection references missing page: ${pageId}`);
    add({
      selectionId: pageNode.id,
      nodeId: pageNode.id,
      depth: 1,
      kind: 'page',
      label: page.title,
      parentSelectionId: projection.root.id,
      pageId,
      componentId: null,
      sourcePointer: pageNode.sourcePointer,
      node: pageNode,
      resourceKind: null,
      resourceId: null,
    });

    for (const componentNode of pageNode.children) {
      const componentId = componentNode.stableIdentity.value;
      const found = lookup.components.get(componentId);
      if (!found || found.page.id !== pageId) {
        throw new V2ReadOnlyStudioError(`projection references missing component: ${componentId}`);
      }
      const componentSelectionId = componentNode.id;
      add({
        selectionId: componentSelectionId,
        nodeId: componentNode.id,
        depth: 2,
        kind: componentNode.kind,
        label: componentLabel(found.component),
        parentSelectionId: pageNode.id,
        pageId,
        componentId,
        sourcePointer: componentNode.sourcePointer,
        node: componentNode,
        resourceKind: null,
        resourceId: null,
      });

      for (const resourceNode of componentNode.children) {
        const [resourceKind, ...idParts] = resourceNode.stableIdentity.value.split(':');
        const resourceId = idParts.join(':');
        const collection = source.resources[resourceKind];
        const resource = Array.isArray(collection)
          ? collection.find((candidate) => candidate.id === resourceId)
          : null;
        if (!resource) {
          throw new V2ReadOnlyStudioError(`projection references missing resource: ${resourceNode.stableIdentity.value}`);
        }
        // A shared resource may legitimately be referenced by multiple components.
        // Selection therefore binds the stable component occurrence plus the stable
        // resource identity instead of relying on an ambiguous repeated node id.
        const selectionId = `${componentSelectionId}/${resourceNode.id}`;
        add({
          selectionId,
          nodeId: resourceNode.id,
          depth: 3,
          kind: 'resource-reference',
          label: resourceLabel(resource),
          parentSelectionId: componentSelectionId,
          pageId,
          componentId,
          sourcePointer: resourcePointer(source, resourceKind, resourceId),
          node: resourceNode,
          resourceKind,
          resourceId,
        });
      }
    }
  }

  return entries;
}

function plainQuery(query) {
  if (query === undefined || query === null) return {};
  if (typeof query !== 'object' || Array.isArray(query)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(query))) {
    throw new V2ReadOnlyStudioError('query must be a plain object');
  }
  const allowed = new Set(['nodeId', 'fieldId', 'viewport']);
  const keys = Reflect.ownKeys(query);
  if (keys.some((key) => typeof key !== 'string' || !allowed.has(key))) {
    throw new V2ReadOnlyStudioError('query contains unsupported keys');
  }
  const result = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(query, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')
      || typeof descriptor.value !== 'string' || descriptor.value.length === 0) {
      throw new V2ReadOnlyStudioError('query values must be non-empty scalar strings');
    }
    result[key] = descriptor.value;
  }
  return result;
}

function fieldRowsForEntry(source, entry) {
  if (entry.kind === 'page') {
    const page = source.site.pages.find((candidate) => candidate.id === entry.pageId);
    return entry.node.fields.map(({ fieldId }) => ({
      fieldId,
      label: humanize(fieldId),
      valueSummary: summary(page[fieldId]),
      sourcePointer: `${entry.sourcePointer}/${fieldId}`,
    }));
  }

  if (entry.componentId && entry.kind !== 'resource-reference') {
    const found = sourceLookup(source).components.get(entry.componentId);
    return entry.node.fields.map(({ fieldId }) => ({
      fieldId,
      label: humanize(fieldId),
      valueSummary: summary(found.component.content[fieldId]),
      sourcePointer: `${entry.sourcePointer}/content/${fieldId}`,
    }));
  }

  return [];
}

function resourceFacts(source, entry) {
  if (entry.kind !== 'resource-reference') return [];
  const resource = source.resources[entry.resourceKind]
    .find((candidate) => candidate.id === entry.resourceId);
  const preferred = ['id', 'title', 'name', 'state', 'startAt', 'endAt', 'accessNote', 'description'];
  return preferred
    .filter((key) => Object.hasOwn(resource, key) && resource[key] !== null)
    .map((key) => ({ label: humanize(key), value: summary(resource[key]) }));
}

function ownershipForPointer(pointer) {
  if (!pointer) return 'DERIVED';
  return pathOwnership(pointer) || 'DERIVED';
}

function selectedComponent(source, entry) {
  if (!entry.componentId) return null;
  return sourceLookup(source).components.get(entry.componentId)?.component || null;
}

function buildInspector(source, entry, selection) {
  const fields = fieldRowsForEntry(source, entry).map((field) => ({
    ...field,
    ownership: ownershipForPointer(field.sourcePointer),
    selected: field.fieldId === selection.fieldId,
  }));
  const selectedField = selection.fieldId
    ? fields.find((field) => field.fieldId === selection.fieldId)
    : null;
  if (selection.fieldId && !selectedField) {
    throw new V2ReadOnlyStudioError(`field does not belong to selected node: ${selection.fieldId}`);
  }

  const component = selectedComponent(source, entry);
  const responsive = component
    ? resolveResponsiveComponent(component, selection.viewport)
    : null;

  return {
    label: entry.label,
    semanticKind: entry.kind,
    stableSelectionId: entry.selectionId,
    stableNodeId: entry.nodeId,
    sourcePointer: entry.sourcePointer,
    ownership: ownershipForPointer(entry.sourcePointer),
    recipeId: component?.recipeId || null,
    fields,
    selectedField,
    resourceFacts: resourceFacts(source, entry),
    responsive: responsive
      ? Object.entries(responsive.values).map(([key, value]) => ({
          key,
          label: humanize(key),
          value: String(value),
          source: responsive.sources[key],
        }))
      : [],
  };
}

function normalizeSelection(source, entries, queryInput) {
  const query = plainQuery(queryInput);
  const viewport = query.viewport || 'desktop';
  if (!Object.hasOwn(V2_READ_ONLY_STUDIO_VIEWPORTS, viewport)) {
    throw new V2ReadOnlyStudioError(`unsupported preview viewport: ${viewport}`);
  }
  if (query.fieldId && !query.nodeId) {
    throw new V2ReadOnlyStudioError('fieldId requires nodeId');
  }
  const nodeId = query.nodeId || `page:${source.site.homePageId}`;
  const entry = entries.find((candidate) => candidate.selectionId === nodeId);
  if (!entry) throw new V2ReadOnlyStudioError(`unknown Studio selection: ${nodeId}`);
  const fieldId = query.fieldId || null;
  if (fieldId && !entry.node.fields.some((field) => field.fieldId === fieldId)) {
    throw new V2ReadOnlyStudioError(`unknown field for selected node: ${fieldId}`);
  }
  return deepFreeze({
    schemaVersion: V2_READ_ONLY_STUDIO_SELECTION_SCHEMA_VERSION,
    nodeId,
    fieldId,
    viewport,
  });
}

function buildCanvasCards(source, entries, selectedEntry) {
  const page = source.site.pages.find((candidate) => candidate.id === selectedEntry.pageId);
  if (!page) throw new V2ReadOnlyStudioError(`selected page is unavailable: ${selectedEntry.pageId}`);
  return page.components.map((component) => {
    const entry = entries.find((candidate) =>
      candidate.pageId === page.id
      && candidate.componentId === component.id
      && candidate.kind !== 'resource-reference');
    if (!entry) throw new V2ReadOnlyStudioError(`missing component entry: ${component.id}`);
    const selected = selectedEntry.selectionId === entry.selectionId
      || selectedEntry.parentSelectionId === entry.selectionId;
    return {
      selectionId: entry.selectionId,
      componentId: component.id,
      label: componentLabel(component),
      kind: component.kind,
      recipeId: component.recipeId,
      selected,
    };
  });
}

function createV2ReadOnlyStudioModel(sourceInput, queryInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const projection = createV2SemanticCanvasProjection(source);
  if (projection.authority.persistent !== false
    || projection.authority.derived !== true
    || projection.authority.runtimeWired !== false) {
    throw new V2ReadOnlyStudioError('v2 Canvas projection authority is not read-only');
  }
  const entries = buildStudioEntries(source, projection);
  const selection = normalizeSelection(source, entries, queryInput);
  const selectedEntry = entries.find((entry) => entry.selectionId === selection.nodeId);
  const inspector = buildInspector(source, selectedEntry, selection);
  const previewPage = source.site.pages.find((page) => page.id === selectedEntry.pageId);
  const pages = source.site.pages.map((page) => {
    const pageEntry = entries.find((entry) => entry.kind === 'page' && entry.pageId === page.id);
    if (!pageEntry) throw new V2ReadOnlyStudioError(`missing page entry: ${page.id}`);
    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      selectionId: pageEntry.selectionId,
    };
  });
  const treeRows = entries.map((entry) => ({
    selectionId: entry.selectionId,
    nodeId: entry.nodeId,
    depth: entry.depth,
    kind: entry.kind,
    label: entry.label,
    pageId: entry.pageId,
    selected: entry.selectionId === selectedEntry.selectionId,
    selectedAncestor: entry.selectionId === selectedEntry.parentSelectionId,
  }));

  return deepFreeze({
    kind: 'hivenues-v2-read-only-studio-model',
    schemaVersion: 1,
    sourceDigest: deriveV2DeploymentAgnosticVenueSourceDigest(source),
    authority: {
      canonicalSource: projection.authority.canonicalSource,
      derived: true,
      persistent: false,
      runtimeWired: false,
      mutationsAvailable: false,
    },
    venue: {
      id: source.venue.id,
      displayName: source.venue.displayName,
      communityState: source.capabilities.community.state,
      transactionState: source.capabilities.transaction.state,
    },
    selection,
    selectedEntry: {
      selectionId: selectedEntry.selectionId,
      nodeId: selectedEntry.nodeId,
      kind: selectedEntry.kind,
      label: selectedEntry.label,
      pageId: selectedEntry.pageId,
      componentId: selectedEntry.componentId,
      sourcePointer: selectedEntry.sourcePointer,
    },
    previewPage: {
      id: previewPage.id,
      slug: previewPage.slug,
      title: previewPage.title,
    },
    pages,
    viewport: {
      id: selection.viewport,
      ...V2_READ_ONLY_STUDIO_VIEWPORTS[selection.viewport],
    },
    treeRows,
    canvasCards: buildCanvasCards(source, entries, selectedEntry),
    inspector,
  });
}

function parseV2ReadOnlyStudioQuery(sourceInput, queryInput) {
  return createV2ReadOnlyStudioModel(sourceInput, queryInput).selection;
}

function v2ReadOnlyStudioSelectionHref(studioPath, selection) {
  const path = strictLocalPath(studioPath, 'Studio path');
  const query = new URLSearchParams({ nodeId: selection.nodeId });
  if (selection.fieldId) query.set('fieldId', selection.fieldId);
  query.set('viewport', selection.viewport);
  return `${path}?${query.toString()}`;
}

function selectionFor(model, overrides = {}) {
  return {
    nodeId: overrides.nodeId ?? model.selection.nodeId,
    fieldId: Object.hasOwn(overrides, 'fieldId') ? overrides.fieldId : model.selection.fieldId,
    viewport: overrides.viewport ?? model.selection.viewport,
  };
}

function renderTree(model, studioPath) {
  return model.treeRows.map((row) => {
    const href = v2ReadOnlyStudioSelectionHref(
      studioPath,
      selectionFor(model, { nodeId: row.selectionId, fieldId: null }),
    );
    const classes = ['studio-tree__link'];
    if (row.selected) classes.push('is-selected');
    if (row.selectedAncestor) classes.push('is-context');
    return `<li style="--tree-depth:${row.depth}"><a class="${classes.join(' ')}" data-selection-id="${escapeHtml(row.selectionId)}" href="${escapeHtml(href)}"${row.selected ? ' aria-current="location"' : ''}><span><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(humanize(row.kind))}</small></span>${row.selected ? '<span class="selection-dot">Selected</span>' : ''}</a></li>`;
  }).join('');
}

function renderCanvasCards(model, studioPath) {
  return model.canvasCards.map((card) => {
    const href = v2ReadOnlyStudioSelectionHref(
      studioPath,
      selectionFor(model, { nodeId: card.selectionId, fieldId: null }),
    );
    return `<a class="canvas-card${card.selected ? ' is-selected' : ''}" data-component-id="${escapeHtml(card.componentId)}" href="${escapeHtml(href)}"${card.selected ? ' aria-current="location"' : ''}><span><strong>${escapeHtml(card.label)}</strong><small>${escapeHtml(humanize(card.kind))} · ${escapeHtml(card.recipeId)}</small></span><span aria-hidden="true">→</span></a>`;
  }).join('');
}

function renderInspector(model, studioPath) {
  const inspector = model.inspector;
  const fields = inspector.fields.length
    ? `<section class="inspector-section" aria-labelledby="inspector-fields-heading"><h3 id="inspector-fields-heading">Fields</h3><ul class="inspector-fields">${inspector.fields.map((field) => {
        const href = v2ReadOnlyStudioSelectionHref(
          studioPath,
          selectionFor(model, { fieldId: field.fieldId }),
        );
        return `<li><a class="inspector-field${field.selected ? ' is-selected' : ''}" href="${escapeHtml(href)}"${field.selected ? ' aria-current="location"' : ''}><span><strong>${escapeHtml(field.label)}</strong><small>${escapeHtml(field.valueSummary)}</small></span><span class="ownership-chip">${escapeHtml(humanize(field.ownership))}</span></a></li>`;
      }).join('')}</ul></section>`
    : '';

  const selected = inspector.selectedField
    ? `<section class="inspector-section selected-field" aria-labelledby="selected-field-heading"><p class="eyebrow">Selected field</p><h3 id="selected-field-heading">${escapeHtml(inspector.selectedField.label)}</h3><p>${escapeHtml(inspector.selectedField.valueSummary)}</p><small>${escapeHtml(humanize(inspector.selectedField.ownership))}</small></section>`
    : '';

  const resource = inspector.resourceFacts.length
    ? `<section class="inspector-section" aria-labelledby="resource-facts-heading"><h3 id="resource-facts-heading">Resource facts</h3><dl>${inspector.resourceFacts.map((fact) => `<dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd>`).join('')}</dl></section>`
    : '';

  const responsive = inspector.responsive.length
    ? `<section class="inspector-section" aria-labelledby="responsive-heading"><h3 id="responsive-heading">${escapeHtml(model.viewport.label)} recipe resolution</h3><dl>${inspector.responsive.map((item) => `<dt>${escapeHtml(item.label)}</dt><dd><strong>${escapeHtml(item.value)}</strong><span>from ${escapeHtml(item.source)}</span></dd>`).join('')}</dl></section>`
    : '';

  return `<div class="inspector-summary"><p class="eyebrow">Selected context</p><h2>${escapeHtml(inspector.label)}</h2><p>${escapeHtml(humanize(inspector.semanticKind))}</p>${inspector.recipeId ? `<span class="recipe-chip">${escapeHtml(inspector.recipeId)}</span>` : ''}</div>
  ${selected}${fields}${resource}${responsive}
  <details class="diagnostics"><summary>Read-only diagnostics</summary><dl>
    <dt>Stable selection</dt><dd>${escapeHtml(inspector.stableSelectionId)}</dd>
    <dt>Projection node</dt><dd>${escapeHtml(inspector.stableNodeId)}</dd>
    <dt>Source pointer</dt><dd>${escapeHtml(inspector.sourcePointer || 'Derived reference')}</dd>
    <dt>Ownership</dt><dd>${escapeHtml(humanize(inspector.ownership))}</dd>
    <dt>Source digest</dt><dd>${escapeHtml(model.sourceDigest)}</dd>
  </dl></details>`;
}

function renderViewportControls(model, studioPath) {
  return Object.entries(V2_READ_ONLY_STUDIO_VIEWPORTS).map(([id, viewport]) => {
    const href = v2ReadOnlyStudioSelectionHref(
      studioPath,
      selectionFor(model, { viewport: id }),
    );
    return `<a class="viewport-option${model.viewport.id === id ? ' is-selected' : ''}" href="${escapeHtml(href)}"${model.viewport.id === id ? ' aria-current="true"' : ''}><strong>${viewport.label}</strong><span>${viewport.width} × ${viewport.height}</span></a>`;
  }).join('');
}

function renderV2ReadOnlyStudioPageContextMap(
  model,
  studioPath,
  previewPathForPage,
  browsePathForPage,
) {
  const pathToPage = new Map();
  const records = [];

  for (const page of model.pages) {
    const paths = new Set([
      strictLocalPath(previewPathForPage(page), 'preview path'),
      strictLocalPath(
        (browsePathForPage || previewPathForPage)(page),
        'browse preview path',
      ),
    ]);
    const selectionHref = v2ReadOnlyStudioSelectionHref(
      studioPath,
      selectionFor(model, { nodeId: page.selectionId, fieldId: null }),
    );

    for (const previewPath of paths) {
      const existing = pathToPage.get(previewPath);
      if (existing && existing !== page.id) {
        throw new V2ReadOnlyStudioError(`preview path maps to multiple pages: ${previewPath}`);
      }
      if (existing) continue;
      pathToPage.set(previewPath, page.id);
      records.push({
        previewPath,
        pageId: page.id,
        pageTitle: page.title,
        selectionHref,
      });
    }
  }

  return `<div data-v2-page-context-map="true" hidden>${records.map((record) => `<a data-v2-page-context="true" data-preview-path="${escapeHtml(record.previewPath)}" data-page-id="${escapeHtml(record.pageId)}" data-page-title="${escapeHtml(record.pageTitle)}" href="${escapeHtml(record.selectionHref)}"></a>`).join('')}</div>`;
}

function renderV2ReadOnlyStudioDirectInspectionScript() {
  return `<script>
(() => {
  'use strict';

  const root = document.querySelector('main.studio[data-v2-direct-inspection="true"]');
  if (!root) return;
  const frame = root.querySelector('iframe[data-v2-studio-preview="true"]');
  const inspectButton = root.querySelector('[data-inspection-mode="inspect"]');
  const browseButton = root.querySelector('[data-inspection-mode="browse"]');
  const status = root.querySelector('[data-inspection-status]');
  if (!frame || !inspectButton || !browseButton || !status) return;

  const selectedComponentId = root.dataset.selectedComponentId || '';
  let mode = 'inspect';

  function setStatus(message) {
    status.textContent = message;
  }

  function cardForComponentId(componentId) {
    return [...root.querySelectorAll('.canvas-card[data-component-id]')]
      .find((card) => card.dataset.componentId === componentId) || null;
  }

  function labelForComponentId(componentId) {
    const card = cardForComponentId(componentId);
    return card?.querySelector('strong')?.textContent?.trim() || componentId;
  }

  function frameDocument() {
    try {
      if (!frame.contentWindow || frame.contentWindow.location.origin !== window.location.origin) return null;
      return frame.contentDocument;
    } catch {
      return null;
    }
  }

  function clearInspectionPresentation(doc) {
    doc.getElementById('hivenues-v2-studio-inspection-style')?.remove();
    for (const component of doc.querySelectorAll('[data-hivenues-studio-inspectable]')) {
      if (component.dataset.hivenuesStudioAddedTabindex === 'true') {
        component.removeAttribute('tabindex');
      }
      component.removeAttribute('data-hivenues-studio-added-tabindex');
      component.removeAttribute('data-hivenues-studio-inspectable');
      component.removeAttribute('data-hivenues-studio-selected');
    }
  }

  function installInspectionStyle(doc) {
    if (doc.getElementById('hivenues-v2-studio-inspection-style')) return;
    const style = doc.createElement('style');
    style.id = 'hivenues-v2-studio-inspection-style';
    style.textContent = [
      '[data-hivenues-studio-inspectable="true"]{cursor:crosshair;outline-offset:4px}',
      '[data-hivenues-studio-inspectable="true"]:hover,[data-hivenues-studio-inspectable="true"]:focus-visible{outline:3px dashed #0f766e}',
      '[data-hivenues-studio-selected="true"]{outline:4px solid #0f766e;outline-offset:4px;box-shadow:0 0 0 7px rgba(15,118,110,.18)}'
    ].join('');
    doc.head.append(style);
  }

  function navigateToComponent(componentId) {
    const card = cardForComponentId(componentId);
    if (!card) {
      setStatus('Inspect mode · Unknown rendered component; selection unchanged.');
      return;
    }
    const target = new URL(card.href, window.location.href);
    if (target.origin !== window.location.origin || target.pathname !== window.location.pathname) {
      setStatus('Inspect mode · Unsafe selection target rejected.');
      return;
    }
    setStatus('Inspect mode · Selecting ' + labelForComponentId(componentId) + '…');
    window.location.assign(target.pathname + target.search);
  }

  function ensureFrameHandlers(doc) {
    if (doc.documentElement.dataset.hivenuesStudioInspectionBridge === '1') return;
    doc.documentElement.dataset.hivenuesStudioInspectionBridge = '1';

    doc.addEventListener('click', (event) => {
      if (mode !== 'inspect') return;
      const ElementCtor = doc.defaultView?.Element;
      if (!ElementCtor || !(event.target instanceof ElementCtor)) return;
      const component = event.target.closest('.v2-component[data-component-id]');
      if (component) {
        event.preventDefault();
        event.stopPropagation();
        navigateToComponent(component.dataset.componentId || '');
        return;
      }
      if (event.target.closest('a')) {
        event.preventDefault();
        event.stopPropagation();
        setStatus('Inspect mode · Switch to Browse Preview to follow public links.');
      }
    }, true);

    doc.addEventListener('keydown', (event) => {
      if (mode !== 'inspect' || !['Enter', ' '].includes(event.key)) return;
      const ElementCtor = doc.defaultView?.Element;
      if (!ElementCtor || !(event.target instanceof ElementCtor)) return;
      if (event.target.getAttribute('data-hivenues-studio-inspectable') !== 'true') return;
      event.preventDefault();
      event.stopPropagation();
      navigateToComponent(event.target.dataset.componentId || '');
    }, true);
  }

  function configureFrame() {
    const doc = frameDocument();
    if (!doc) {
      setStatus('Preview unavailable for direct inspection.');
      return;
    }

    ensureFrameHandlers(doc);
    clearInspectionPresentation(doc);

    if (mode === 'browse') {
      setStatus('Browse Preview · Public links navigate normally; Studio selection stays unchanged.');
      return;
    }

    installInspectionStyle(doc);
    const components = [...doc.querySelectorAll('.v2-component[data-component-id]')];
    for (const component of components) {
      component.dataset.hivenuesStudioInspectable = 'true';
      if (!component.hasAttribute('tabindex')) {
        component.dataset.hivenuesStudioAddedTabindex = 'true';
        component.tabIndex = 0;
      }
      if (selectedComponentId && component.dataset.componentId === selectedComponentId) {
        component.dataset.hivenuesStudioSelected = 'true';
      }
    }

    if (selectedComponentId && components.some((component) => component.dataset.componentId === selectedComponentId)) {
      setStatus('Inspect mode · Selected: ' + labelForComponentId(selectedComponentId) + '.');
    } else {
      setStatus('Inspect mode · Choose a rendered component to inspect it directly.');
    }
  }

  function setMode(nextMode) {
    if (!['inspect', 'browse'].includes(nextMode)) return;
    mode = nextMode;
    root.dataset.inspectionMode = mode;
    inspectButton.setAttribute('aria-pressed', String(mode === 'inspect'));
    browseButton.setAttribute('aria-pressed', String(mode === 'browse'));
    configureFrame();
  }

  inspectButton.addEventListener('click', () => setMode('inspect'));
  browseButton.addEventListener('click', () => setMode('browse'));
  frame.addEventListener('load', configureFrame);
  setMode('inspect');
})();
</script>`;
}

function renderV2ReadOnlyStudioSurface({
  sourceInput,
  query,
  studioPath = '/studio',
  previewPathForPage,
  browsePathForPage,
} = {}) {
  const normalizedStudioPath = strictLocalPath(studioPath, 'Studio path');
  if (typeof previewPathForPage !== 'function') {
    throw new V2ReadOnlyStudioError('previewPathForPage must be a function');
  }
  if (browsePathForPage !== undefined && typeof browsePathForPage !== 'function') {
    throw new V2ReadOnlyStudioError('browsePathForPage must be a function when provided');
  }
  const model = createV2ReadOnlyStudioModel(sourceInput, query);
  const previewHref = strictLocalPath(
    previewPathForPage(model.previewPage),
    'preview path',
  );
  const tree = renderTree(model, normalizedStudioPath);
  const cards = renderCanvasCards(model, normalizedStudioPath);
  const inspector = renderInspector(model, normalizedStudioPath);
  const viewportControls = renderViewportControls(model, normalizedStudioPath);
  const pageContextMap = renderV2ReadOnlyStudioPageContextMap(
    model,
    normalizedStudioPath,
    previewPathForPage,
    browsePathForPage,
  );

  return `<!doctype html>
<html lang="en" data-v2-read-only-studio="true">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Venue Studio · ${escapeHtml(model.venue.displayName)}</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#1d2528;background:#e9edef;color-scheme:light}
*{box-sizing:border-box}body{margin:0}a{color:inherit;text-decoration:none}a,summary{min-height:44px}a:focus-visible,summary:focus-visible,[tabindex]:focus{outline:3px solid #0f766e;outline-offset:3px}
.skip{position:fixed;top:-90px;left:12px;z-index:50;padding:12px 16px;border-radius:10px;background:#102a2e;color:white}.skip:focus{top:12px}
.studio{min-height:100vh;display:grid;grid-template-rows:auto auto 1fr}.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 22px;border-bottom:1px solid #ccd3d6;background:#fff}.brand{display:flex;align-items:center;gap:14px;min-width:0}.brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#143c42;color:#fff;font-weight:900}.eyebrow{margin:0;color:#4b5a5f;font-size:.7rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.brand h1{margin:2px 0 0;font-size:1.05rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.authority-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid #a8b7b7;border-radius:999px;background:#f4f8f7;color:#29494b;font-size:.74rem;font-weight:800}.authority-badge::before{content:"";width:8px;height:8px;border-radius:50%;background:#2f855a}
.modebar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 22px;border-bottom:1px solid #ccd3d6;background:#f8fafb}.mode-copy strong{display:block;font-size:.82rem}.mode-copy span{display:block;margin-top:2px;color:#4b5a5f;font-size:.72rem}.mode-controls{display:flex;align-items:center;justify-content:flex-end;gap:8px;min-width:0}.inspection-wrap{display:grid;gap:3px}.inspection-modes{display:flex;gap:4px;padding:4px;border:1px solid #cbd4d7;border-radius:12px;background:#fff}.inspection-mode{min-height:44px;border:0;border-radius:8px;background:transparent;padding:7px 11px;color:#405057;font:inherit;font-size:.72rem;font-weight:800;cursor:pointer}.inspection-mode[aria-pressed="true"]{background:#176b61;color:#fff}.inspection-mode:focus-visible{outline:3px solid #0f766e;outline-offset:3px}.inspection-status{margin:0;max-width:360px;color:#4b5a5f;font-size:.64rem;line-height:1.35}.page-context{display:flex;align-items:center;gap:7px;max-width:430px;padding:5px 6px 5px 9px;border:1px solid #b9d1cc;border-radius:9px;background:#edf7f4;color:#29494b}.page-context[hidden]{display:none}.page-context span{font-size:.65rem;font-weight:700;line-height:1.35}.inspect-page-action{display:inline-flex;align-items:center;justify-content:center;flex:none;padding:6px 9px;border-radius:7px;background:#176b61;color:#fff;font-size:.66rem;font-weight:900}.viewport-options{display:flex;gap:5px;padding:4px;border:1px solid #cbd4d7;border-radius:12px;background:#fff}.viewport-option{display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:8px;color:#536166}.viewport-option strong{font-size:.78rem}.viewport-option span{font-size:.65rem}.viewport-option.is-selected{background:#143c42;color:#fff}
.workspace{display:grid;grid-template-columns:230px minmax(0,1fr) 310px;gap:12px;padding:12px;min-width:0}.panel{min-width:0;border:1px solid #cbd3d6;border-radius:14px;background:#fff;box-shadow:0 3px 16px rgba(28,38,41,.05);overflow:hidden}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:13px 14px;border-bottom:1px solid #e0e5e7}.panel-head h2{margin:0;font-size:.85rem}.panel-head span{color:#4b5a5f;font-size:.68rem}.tree-panel,.inspector-panel{max-height:calc(100vh - 150px);overflow:auto;position:sticky;top:12px}.studio-tree,.inspector-fields{list-style:none;margin:0;padding:8px}.studio-tree li{padding-left:calc(var(--tree-depth) * 8px)}.studio-tree__link{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:9px;border-radius:9px;border:1px solid transparent}.studio-tree__link span:first-child{min-width:0}.studio-tree__link strong,.studio-tree__link small{display:block;overflow-wrap:anywhere}.studio-tree__link strong{font-size:.78rem}.studio-tree__link small{margin-top:2px;color:#536166;font-size:.65rem}.studio-tree__link:hover{background:#f0f4f4}.studio-tree__link.is-context{background:#f4f8f7}.studio-tree__link.is-selected{border-color:#73a9a1;background:#e8f4f1}.selection-dot{flex:none;padding:3px 5px;border-radius:5px;background:#176b61;color:#fff;font-size:.58rem;font-weight:800}
.canvas-panel{background:#dce2e4}.canvas-tools{display:flex;gap:7px;overflow-x:auto;padding:9px;border-bottom:1px solid #cbd3d6;background:#f5f7f8}.canvas-card{display:flex;min-width:180px;max-width:250px;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border:1px solid #cbd3d6;border-radius:9px;background:#fff}.canvas-card strong,.canvas-card small{display:block}.canvas-card strong{font-size:.75rem}.canvas-card small{margin-top:2px;color:#536166;font-size:.62rem;overflow-wrap:anywhere}.canvas-card.is-selected{border:2px solid #176b61;background:#edf7f4}
.preview-area{display:grid;place-items:start center;min-height:650px;padding:18px;overflow:hidden;background:linear-gradient(135deg,#dce2e4,#eef1f2)}.preview-holder{position:relative;overflow:hidden;border:1px solid #adb9bd;border-radius:12px;background:#fff;box-shadow:0 18px 42px rgba(21,34,38,.18)}.preview-holder iframe{position:absolute;top:0;left:0;border:0;background:#fff;transform-origin:top left}
.preview-holder.viewport-desktop{width:749px;height:520px}.preview-holder.viewport-desktop iframe{width:1440px;height:1000px;transform:scale(.52)}
.preview-holder.viewport-tablet{width:459px;height:612px}.preview-holder.viewport-tablet iframe{width:834px;height:1112px;transform:scale(.55)}
.preview-holder.viewport-mobile{width:273px;height:591px}.preview-holder.viewport-mobile iframe{width:390px;height:844px;transform:scale(.70)}
.preview-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 13px;border-top:1px solid #cbd3d6;background:#fff;color:#4b5a5f;font-size:.68rem}.preview-meta strong{color:#243236}
.inspector-summary{padding:15px;border-bottom:1px solid #e1e6e8}.inspector-summary h2{margin:3px 0;font-size:1.15rem}.inspector-summary>p:last-of-type{margin:0;color:#4b5a5f;font-size:.76rem}.recipe-chip,.ownership-chip{display:inline-flex;margin-top:7px;padding:4px 7px;border-radius:999px;background:#edf2f2;color:#395255;font-size:.62rem;font-weight:800}.inspector-section{padding:13px 14px;border-bottom:1px solid #e5e9ea}.inspector-section h3{margin:0 0 9px;font-size:.78rem}.inspector-section p{margin:5px 0;color:#435258;font-size:.78rem;line-height:1.5}.inspector-section>small{color:#536166;font-size:.65rem}.inspector-fields{padding:0}.inspector-field{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:9px;border-radius:8px}.inspector-field strong,.inspector-field small{display:block}.inspector-field strong{font-size:.73rem}.inspector-field small{margin-top:2px;color:#536166;font-size:.63rem;overflow-wrap:anywhere}.inspector-field.is-selected{background:#eaf5f2}.inspector-field .ownership-chip{margin:0;white-space:nowrap}.selected-field{background:#f3faf7;border-left:4px solid #176b61}
dl{margin:0;display:grid;grid-template-columns:minmax(90px,.7fr) minmax(0,1.3fr);gap:6px 10px}dt{color:#536166;font-size:.65rem}dd{margin:0;font-size:.7rem;overflow-wrap:anywhere}dd span{display:block;color:#536166;font-size:.61rem;font-weight:400}.diagnostics{margin:10px;border:1px solid #d9e0e2;border-radius:9px}.diagnostics summary{display:flex;align-items:center;padding:9px 10px;cursor:pointer;font-size:.7rem;font-weight:800}.diagnostics dl{padding:0 10px 10px}
.read-only-note{margin:0;padding:9px 14px;border-top:1px solid #dbe2e4;background:#f7faf9;color:#4b5a5f;font-size:.67rem}
@media(max-width:1180px){.workspace{grid-template-columns:190px minmax(0,1fr)}.inspector-panel{grid-column:2;position:static;max-height:none}.preview-holder.viewport-desktop{width:624px;height:433px}.preview-holder.viewport-desktop iframe{transform:scale(.433)}}
@media(max-width:720px){.topbar{align-items:flex-start;padding:12px}.brand h1{white-space:normal}.authority-badge{font-size:.65rem}.modebar{align-items:flex-start;flex-direction:column;padding:10px 12px}.mode-controls{width:100%;align-items:stretch;flex-direction:column}.inspection-wrap{width:100%}.inspection-modes{width:100%}.inspection-mode{flex:1}.inspection-status{max-width:none}.viewport-options{width:100%;overflow-x:auto}.viewport-option{flex:1 0 auto;justify-content:center}.viewport-option span{display:none}.workspace{display:flex;flex-direction:column;padding:8px}.canvas-panel{order:0}.inspector-panel{order:1;max-height:none;position:static}.tree-panel{order:2;max-height:none;position:static}.preview-area{min-height:0;padding:10px}.preview-holder.viewport-desktop{width:346px;height:240px}.preview-holder.viewport-desktop iframe{transform:scale(.24)}.preview-holder.viewport-tablet{width:334px;height:445px}.preview-holder.viewport-tablet iframe{transform:scale(.40)}.preview-holder.viewport-mobile{width:343px;height:743px}.preview-holder.viewport-mobile iframe{transform:scale(.88)}.canvas-tools{padding:7px}.canvas-card{min-width:155px}.tree-panel,.inspector-panel{width:100%}}
@media(max-width:380px){.preview-holder.viewport-desktop{width:317px;height:220px}.preview-holder.viewport-desktop iframe{transform:scale(.22)}.preview-holder.viewport-tablet{width:317px;height:423px}.preview-holder.viewport-tablet iframe{transform:scale(.38)}.preview-holder.viewport-mobile{width:320px;height:693px}.preview-holder.viewport-mobile iframe{transform:scale(.82)}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
</style>
</head>
<body>
<a class="skip" href="#studio-canvas-heading">Skip to Canvas</a>
<main class="studio" data-source-digest="${escapeHtml(model.sourceDigest)}" data-studio-derived="true" data-studio-persistent="false" data-studio-mutations="false" data-v2-direct-inspection="true" data-inspection-mode="inspect" data-selected-page-id="${escapeHtml(model.previewPage.id)}" data-selected-component-id="${escapeHtml(model.selectedEntry.componentId || '')}">
  ${pageContextMap}
  <header class="topbar">
    <div class="brand"><span class="brand-mark" aria-hidden="true">H</span><div><p class="eyebrow">HiVenues · Venue Studio</p><h1>${escapeHtml(model.venue.displayName)}</h1></div></div>
    <span class="authority-badge">Read-only v2 foundation</span>
  </header>
  <section class="modebar" aria-label="Studio presentation controls">
    <div class="mode-copy"><strong>Responsive preview</strong><span>Presentation state only · source remains unchanged</span></div>
    <div class="mode-controls">
      <div class="inspection-wrap">
        <div class="inspection-modes" role="group" aria-label="Canvas interaction mode">
          <button class="inspection-mode" type="button" data-studio-presentation-control="true" data-inspection-mode="inspect" aria-pressed="true">Inspect</button>
          <button class="inspection-mode" type="button" data-studio-presentation-control="true" data-inspection-mode="browse" aria-pressed="false">Browse Preview</button>
        </div>
        <p class="inspection-status" data-inspection-status aria-live="polite">Inspect mode · Preparing rendered semantic components…</p>
        <div class="page-context" data-browsed-page-context hidden>
          <span data-browsed-page-copy></span>
          <a class="inspect-page-action" data-inspect-browsed-page href="#">Inspect this page</a>
        </div>
      </div>
      <nav class="viewport-options" aria-label="Preview viewport">${viewportControls}</nav>
    </div>
  </section>
  <div class="workspace">
    <nav class="panel tree-panel" aria-labelledby="studio-tree-heading">
      <header class="panel-head"><h2 id="studio-tree-heading">Page Structure</h2><span>Semantic source</span></header>
      <ul class="studio-tree">${tree}</ul>
    </nav>
    <section class="panel canvas-panel" aria-labelledby="studio-canvas-heading">
      <header class="panel-head"><h2 id="studio-canvas-heading" tabindex="-1">Venue Canvas</h2><span>Real v2 renderer</span></header>
      <nav class="canvas-tools" aria-label="Page component selection">${cards}</nav>
      <div class="preview-area"><div class="preview-holder viewport-${escapeHtml(model.viewport.id)}" data-preview-viewport="${escapeHtml(model.viewport.id)}" data-preview-width="${model.viewport.width}" data-preview-height="${model.viewport.height}"><iframe title="Real v2 venue renderer preview" data-v2-studio-preview="true" src="${escapeHtml(previewHref)}" width="${model.viewport.width}" height="${model.viewport.height}"></iframe></div></div>
      <div class="preview-meta"><strong>${escapeHtml(model.previewPage.title)}</strong><span>${escapeHtml(model.viewport.label)} · ${model.viewport.width} × ${model.viewport.height}</span></div>
      <p class="read-only-note">Selection and viewport changes are local presentation state. This surface cannot edit, keep, save, publish, deploy, or perform external actions.</p>
    </section>
    <aside class="panel inspector-panel" aria-labelledby="studio-inspector-heading">
      <header class="panel-head"><h2 id="studio-inspector-heading">Inspector</h2><span>Context only</span></header>
      ${inspector}
    </aside>
  </div>
</main>
${renderV2ReadOnlyStudioDirectInspectionScript()}
</body>
</html>`;
}

function renderV2ReadOnlyStudioPreview(sourceInput, pageId, options = {}) {
  if (typeof pageId !== 'string' || pageId.length === 0) {
    throw new V2ReadOnlyStudioError('preview pageId is required');
  }
  return renderV2Page(sourceInput, { ...options, pageId });
}

module.exports = {
  SAFE_V2_READ_ONLY_STUDIO_ERROR,
  V2_READ_ONLY_STUDIO_SELECTION_SCHEMA_VERSION,
  V2_READ_ONLY_STUDIO_VIEWPORTS,
  V2ReadOnlyStudioError,
  createV2ReadOnlyStudioModel,
  parseV2ReadOnlyStudioQuery,
  renderV2ReadOnlyStudioPreview,
  renderV2ReadOnlyStudioSurface,
  v2ReadOnlyStudioSelectionHref,
};
