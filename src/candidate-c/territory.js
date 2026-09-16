'use strict';

const { validateHostGraph } = require('./model');

const surfaceRegistry = Object.freeze({
  home: Object.freeze({
    role: 'home',
    kind: 'singleton',
    defaultLabel: 'Home',
    path: (graph) => `/candidate-c/${graph.identity.slug}`,
  }),
  'activities-index': Object.freeze({
    role: 'activities-index',
    kind: 'index',
    navigationRole: 'activities',
    defaultLabel: 'Activities',
    path: (graph) => `/candidate-c/${graph.identity.slug}/activities`,
  }),
  'activity-detail': Object.freeze({
    role: 'activity-detail',
    kind: 'detail',
    navigationRole: 'activities',
    path: (graph, item) => `/candidate-c/${graph.identity.slug}/activities/${item.slug}`,
  }),
  offers: Object.freeze({
    role: 'offers',
    kind: 'index',
    navigationRole: 'offers',
    defaultLabel: 'Offers',
    path: (graph) => `/candidate-c/${graph.identity.slug}/offers`,
  }),
  'stories-index': Object.freeze({
    role: 'stories-index',
    kind: 'index',
    navigationRole: 'stories',
    defaultLabel: 'Stories',
    path: (graph) => `/candidate-c/${graph.identity.slug}/stories`,
  }),
  'story-detail': Object.freeze({
    role: 'story-detail',
    kind: 'detail',
    navigationRole: 'stories',
    path: (graph, item) => `/candidate-c/${graph.identity.slug}/stories/${item.slug}`,
  }),
  gallery: Object.freeze({
    role: 'gallery',
    kind: 'index',
    navigationRole: 'gallery',
    defaultLabel: 'Gallery',
    path: (graph) => `/candidate-c/${graph.identity.slug}/gallery`,
  }),
  'people-index': Object.freeze({
    role: 'people-index',
    kind: 'index',
    navigationRole: 'people',
    defaultLabel: 'People',
    path: (graph) => `/candidate-c/${graph.identity.slug}/people`,
  }),
  'profile-detail': Object.freeze({
    role: 'profile-detail',
    kind: 'detail',
    navigationRole: 'people',
    path: (graph, item) => `/candidate-c/${graph.identity.slug}/people/${item.slug}`,
  }),
  'about-visit': Object.freeze({
    role: 'about-visit',
    kind: 'singleton',
    navigationRole: 'about-visit',
    defaultLabel: 'About & visit',
    path: (graph) => `/candidate-c/${graph.identity.slug}/about`,
  }),
});

const compositionRecipeRegistry = Object.freeze({
  poster: Object.freeze({
    id: 'poster',
    navigationOrder: Object.freeze(['home', 'activities', 'stories', 'gallery', 'offers', 'people', 'about-visit']),
    homeSections: Object.freeze(['hero', 'activities', 'stories', 'gallery', 'offers', 'about']),
    surfaceTemplates: Object.freeze({
      home: 'candidate-c/compositions/poster',
      'activities-index': 'candidate-c/territory/poster/activities',
      'activity-detail': 'candidate-c/compositions/poster-activity',
      offers: 'candidate-c/territory/poster/offers',
      'stories-index': 'candidate-c/territory/poster/stories',
      'story-detail': 'candidate-c/territory/poster/story',
      gallery: 'candidate-c/territory/poster/gallery',
      'people-index': 'candidate-c/territory/poster/people',
      'profile-detail': 'candidate-c/territory/poster/profile',
      'about-visit': 'candidate-c/territory/poster/about',
    }),
  }),
  editorial: Object.freeze({
    id: 'editorial',
    navigationOrder: Object.freeze(['home', 'stories', 'people', 'activities', 'gallery', 'offers', 'about-visit']),
    homeSections: Object.freeze(['hero', 'stories', 'people', 'activities', 'gallery', 'about', 'offers']),
    surfaceTemplates: Object.freeze({
      home: 'candidate-c/compositions/editorial',
      'activities-index': 'candidate-c/territory/editorial/activities',
      'activity-detail': 'candidate-c/compositions/editorial-activity',
      offers: 'candidate-c/territory/editorial/offers',
      'stories-index': 'candidate-c/territory/editorial/stories',
      'story-detail': 'candidate-c/territory/editorial/story',
      gallery: 'candidate-c/territory/editorial/gallery',
      'people-index': 'candidate-c/territory/editorial/people',
      'profile-detail': 'candidate-c/territory/editorial/profile',
      'about-visit': 'candidate-c/territory/editorial/about',
    }),
  }),
  hospitality: Object.freeze({
    id: 'hospitality',
    navigationOrder: Object.freeze(['home', 'offers', 'activities', 'gallery', 'about-visit', 'stories', 'people']),
    homeSections: Object.freeze(['hero', 'offers', 'activities', 'gallery', 'about', 'stories', 'people']),
    surfaceTemplates: Object.freeze({
      home: 'candidate-c/compositions/hospitality',
      'activities-index': 'candidate-c/territory/hospitality/activities',
      'activity-detail': 'candidate-c/compositions/hospitality-activity',
      offers: 'candidate-c/territory/hospitality/offers',
      'stories-index': 'candidate-c/territory/hospitality/stories',
      'story-detail': 'candidate-c/territory/hospitality/story',
      gallery: 'candidate-c/territory/hospitality/gallery',
      'people-index': 'candidate-c/territory/hospitality/people',
      'profile-detail': 'candidate-c/territory/hospitality/profile',
      'about-visit': 'candidate-c/territory/hospitality/about',
    }),
  }),
});

function labelFor(graph, navigationRole, fallback) {
  if (graph.schemaVersion !== 2) return fallback;
  return graph.navigation.labels[navigationRole] || fallback;
}

function detailSurface(graph, role, item, label) {
  const definition = surfaceRegistry[role];
  return Object.freeze({
    role,
    kind: definition.kind,
    key: `${role}:${item.id}`,
    path: definition.path(graph, item),
    label,
    navigationRole: definition.navigationRole,
    resourceId: item.id,
    resourceSlug: item.slug,
  });
}

function singletonSurface(graph, role, label) {
  const definition = surfaceRegistry[role];
  return Object.freeze({
    role,
    kind: definition.kind,
    key: role,
    path: definition.path(graph),
    label,
    navigationRole: definition.navigationRole || 'home',
  });
}

function buildSurfaceInventory(graph) {
  const surfaces = [
    singletonSurface(graph, 'home', labelFor(graph, 'home', 'Home')),
  ];

  if (graph.activities.length) {
    surfaces.push(singletonSurface(
      graph,
      'activities-index',
      labelFor(graph, 'activities', 'Activities')
    ));
    for (const activity of graph.activities) {
      surfaces.push(detailSurface(graph, 'activity-detail', activity, activity.title));
    }
  }

  if (graph.offers.length) {
    surfaces.push(singletonSurface(graph, 'offers', labelFor(graph, 'offers', 'Offers')));
  }

  if (graph.schemaVersion === 2) {
    if (graph.stories.length) {
      surfaces.push(singletonSurface(
        graph,
        'stories-index',
        labelFor(graph, 'stories', 'Stories')
      ));
      for (const story of graph.stories) {
        surfaces.push(detailSurface(graph, 'story-detail', story, story.title));
      }
    }

    if (graph.gallery.mediaIds.length) {
      surfaces.push(singletonSurface(
        graph,
        'gallery',
        labelFor(graph, 'gallery', graph.gallery.title)
      ));
    }

    if (graph.people.length) {
      surfaces.push(singletonSurface(
        graph,
        'people-index',
        labelFor(graph, 'people', 'People')
      ));
      for (const profile of graph.people) {
        surfaces.push(detailSurface(graph, 'profile-detail', profile, profile.displayName));
      }
    }
  }

  surfaces.push(singletonSurface(
    graph,
    'about-visit',
    labelFor(graph, 'about-visit', graph.facts.presence.mode === 'online' ? 'About' : 'About & visit')
  ));

  return Object.freeze(surfaces);
}

function navigationEntryFor(graph, surfaces, navigationRole) {
  if (navigationRole === 'home') return surfaces.find((surface) => surface.role === 'home') || null;
  const roleMap = {
    activities: 'activities-index',
    stories: 'stories-index',
    offers: 'offers',
    gallery: 'gallery',
    people: 'people-index',
    'about-visit': 'about-visit',
  };
  const surfaceRole = roleMap[navigationRole];
  if (!surfaceRole) return null;
  return surfaces.find((surface) => surface.role === surfaceRole) || null;
}

function requestedNavigationOrder(graph, recipe) {
  if (graph.schemaVersion !== 2) return recipe.navigationOrder;
  const requested = graph.navigation.priorities;
  const remaining = recipe.navigationOrder.filter((role) => !requested.includes(role));
  return [...requested, ...remaining];
}

function buildTerritoryProjection(inputGraph) {
  const graph = validateHostGraph(inputGraph);
  const recipe = compositionRecipeRegistry[graph.presentation.compositionFamily];
  if (!recipe) throw new Error(`Unknown Candidate C composition family: ${graph.presentation.compositionFamily}`);

  const surfaces = buildSurfaceInventory(graph);
  const navigation = requestedNavigationOrder(graph, recipe)
    .map((role) => navigationEntryFor(graph, surfaces, role))
    .filter(Boolean)
    .map((surface) => Object.freeze({
      role: surface.navigationRole,
      surfaceRole: surface.role,
      path: surface.path,
      label: surface.label,
    }));

  const templates = Object.freeze(Object.fromEntries(
    surfaces.map((surface) => [
      surface.key,
      recipe.surfaceTemplates[surface.role],
    ])
  ));

  return Object.freeze({
    schemaVersion: 1,
    graphVersion: graph.schemaVersion,
    hostId: graph.identity.hostId,
    hostSlug: graph.identity.slug,
    familyId: recipe.id,
    homeSections: recipe.homeSections,
    surfaces,
    navigation: Object.freeze(navigation),
    templates,
  });
}

function findTerritorySurface(projection, role, resourceSlug = null) {
  if (!projection || !Array.isArray(projection.surfaces)) return null;
  return projection.surfaces.find((surface) => (
    surface.role === role
    && (resourceSlug === null || surface.resourceSlug === resourceSlug)
  )) || null;
}

function templateForSurface(projection, surface) {
  if (!projection || !surface) return null;
  return projection.templates[surface.key] || null;
}

module.exports = {
  buildTerritoryProjection,
  compositionRecipeRegistry,
  findTerritorySurface,
  surfaceRegistry,
  templateForSurface,
};
