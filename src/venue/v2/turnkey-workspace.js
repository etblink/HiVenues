'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  STARTER_ASSETS,
  TURNKEY_ASSET_DIRECTORY,
  slugifyVenueId,
  starterSvg,
} = require('../turnkey-workspace');
const {
  DEFAULT_DESIGN_COLORS,
  V2_SOURCE_KIND,
  V2_SOURCE_SCHEMA_VERSION,
  createV2DeploymentAgnosticVenueSource,
} = require('./source');
const {
  V2_VENUE_SOURCE_FILENAME,
  serializeV2DeploymentAgnosticVenueSourceFile,
} = require('./source-file');

const V2_STARTER_IDS = Object.freeze([
  'general',
  'hospitality',
  'live-music',
]);

const V2_STARTERS = Object.freeze({
  general: Object.freeze({
    starterId: 'general-welcome',
    operatorNoun: 'venue',
    staffRole: 'venue staff',
    typographyRecipeId: 'type-system-sans',
    densityRecipeId: 'density-standard',
    shapeRecipeId: 'shape-soft',
    surfaceRecipeId: 'surface-layered',
    heroRecipeId: 'hero-immersive-media',
    heroEyebrow: 'Welcome',
    heroHeading: 'A place worth discovering',
    introKicker: 'About the venue',
    introHeading: 'Tell people what makes this place special',
  }),
  hospitality: Object.freeze({
    starterId: 'hospitality-editorial',
    operatorNoun: 'venue',
    staffRole: 'host',
    typographyRecipeId: 'type-editorial',
    densityRecipeId: 'density-generous',
    shapeRecipeId: 'shape-soft',
    surfaceRecipeId: 'surface-flat',
    heroRecipeId: 'hero-editorial-split',
    heroEyebrow: 'Hospitality',
    heroHeading: 'Make the first visit feel inviting',
    introKicker: 'The experience',
    introHeading: 'Give guests a reason to stay awhile',
  }),
  'live-music': Object.freeze({
    starterId: 'live-music-poster',
    operatorNoun: 'music venue',
    staffRole: 'venue staff',
    typographyRecipeId: 'type-poster',
    densityRecipeId: 'density-standard',
    shapeRecipeId: 'shape-crisp',
    surfaceRecipeId: 'surface-elevated',
    heroRecipeId: 'hero-poster',
    heroEyebrow: 'Live music',
    heroHeading: 'Put the room and the show first',
    introKicker: 'The venue',
    introHeading: 'Set the stage for what happens here',
  }),
});

class V2TurnkeyWorkspaceError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues v2 workspace creation failed: ${message}`, options);
    this.name = 'V2TurnkeyWorkspaceError';
  }
}

function requiredText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new V2TurnkeyWorkspaceError(`${label} is required`);
  return text;
}

function resolveV2TurnkeyWorkspace(workspaceDirectory) {
  const root = path.resolve(requiredText(workspaceDirectory, 'workspace directory'));
  return Object.freeze({
    root,
    sourceFile: path.join(root, V2_VENUE_SOURCE_FILENAME),
    assetDirectory: path.join(root, TURNKEY_ASSET_DIRECTORY),
  });
}

function buildV2StarterSource(input = {}) {
  const displayName = requiredText(input.displayName, 'venue name');
  const id = slugifyVenueId(input.id || displayName);
  const starterKey = String(input.starter || 'general').trim();
  const starter = V2_STARTERS[starterKey];
  if (!starter) {
    throw new V2TurnkeyWorkspaceError(
      `starter must be one of: ${V2_STARTER_IDS.join(', ')}`,
    );
  }
  const websiteUrl = requiredText(input.websiteUrl, 'website URL');
  const mapUrl = requiredText(input.mapUrl, 'directions URL');

  const source = {
    kind: V2_SOURCE_KIND,
    schemaVersion: V2_SOURCE_SCHEMA_VERSION,
    provenance: {
      origin: 'native-v2',
      sourceSchemaVersion: null,
      sourcePackageId: null,
      starterId: starter.starterId,
    },
    venue: {
      id,
      displayName,
      business: {
        address: requiredText(input.address, 'street address'),
        phone: requiredText(input.phone, 'phone number'),
        hours: requiredText(input.hours, 'opening hours'),
        websiteUrl,
        mapUrl,
      },
      language: {
        operatorNoun: starter.operatorNoun,
        staffRole: starter.staffRole,
      },
    },
    media: {
      assets: [
        {
          id: 'starter-logo',
          src: `/${TURNKEY_ASSET_DIRECTORY}/starter-logo.svg`,
          width: 512,
          height: 512,
        },
        {
          id: 'starter-hero',
          src: `/${TURNKEY_ASSET_DIRECTORY}/starter-hero.svg`,
          width: 1600,
          height: 900,
        },
        {
          id: 'starter-gallery',
          src: `/${TURNKEY_ASSET_DIRECTORY}/starter-gallery.svg`,
          width: 1200,
          height: 800,
        },
      ],
    },
    resources: {
      events: [],
      programs: [],
      menus: [],
      equipment: [],
    },
    site: {
      id: `${id}-site`,
      homePageId: 'home',
      brand: {
        logoAssetId: 'starter-logo',
        design: {
          colors: { ...DEFAULT_DESIGN_COLORS },
          typographyRecipeId: starter.typographyRecipeId,
          densityRecipeId: starter.densityRecipeId,
          shapeRecipeId: starter.shapeRecipeId,
          surfaceRecipeId: starter.surfaceRecipeId,
        },
      },
      pages: [
        {
          id: 'home',
          slug: '',
          title: 'Home',
          seo: {
            title: displayName,
            description: `${displayName} — venue information and visitor details.`,
          },
          components: [
            {
              id: 'home-hero',
              kind: 'venue-hero',
              recipeId: starter.heroRecipeId,
              content: {
                eyebrow: starter.heroEyebrow,
                heading: starter.heroHeading,
                body: `Welcome to ${displayName}. Use Venue Studio to replace this starter copy with the story visitors should see first.`,
                note: 'Starter content is local until you explicitly prepare a later deployment.',
                media: {
                  assetId: 'starter-hero',
                  alt: `${displayName} starter hero placeholder`,
                  decorative: false,
                  treatment: {
                    focalPoint: { x: 0.5, y: 0.5 },
                    fit: 'cover',
                    aspectRecipeId: 'aspect-landscape-wide',
                  },
                },
                primaryAction: {
                  label: 'Visit website',
                  href: websiteUrl,
                },
              },
              responsive: {
                tablet: {},
                mobile: { textMeasure: 'narrow' },
              },
            },
            {
              id: 'home-intro',
              kind: 'editorial-intro',
              recipeId: 'intro-legacy-v1',
              content: {
                kicker: starter.introKicker,
                heading: starter.introHeading,
                body: 'Use this section for the clearest short explanation of the venue, experience, or reason to visit.',
                note: 'Everything in this starter can be revised through the semantic Studio.',
              },
              responsive: { tablet: {}, mobile: {} },
            },
            {
              id: 'home-gallery',
              kind: 'gallery',
              recipeId: 'gallery-feature-grid',
              content: {
                kicker: 'Around the venue',
                heading: 'Show visitors what to expect',
                intro: 'Replace this starter media with venue-owned imagery when you are ready.',
                items: [
                  {
                    id: 'starter-gallery-item',
                    assetId: 'starter-gallery',
                    alt: `${displayName} starter gallery placeholder`,
                    decorative: false,
                    caption: 'Replace this image in Venue Studio.',
                    treatment: {
                      focalPoint: { x: 0.5, y: 0.5 },
                      fit: 'cover',
                      aspectRecipeId: 'aspect-landscape',
                    },
                  },
                ],
              },
              responsive: {
                tablet: { columns: 1 },
                mobile: { columns: 1 },
              },
            },
            {
              id: 'home-visit',
              kind: 'contact-visit',
              recipeId: 'visit-legacy-v1',
              content: {
                kicker: 'Plan your visit',
                heading: `Visit ${displayName}`,
                body: `${requiredText(input.address, 'street address')} · ${requiredText(input.hours, 'opening hours')}`,
                note: 'Confirm venue details before any later publication or deployment.',
              },
              responsive: { tablet: {}, mobile: {} },
            },
          ],
        },
      ],
      navigation: [
        {
          id: 'nav-home',
          label: 'Home',
          target: { kind: 'page', pageId: 'home' },
        },
      ],
    },
    capabilities: {
      community: { state: 'disabled' },
      transaction: { state: 'disabled' },
    },
  };

  try {
    return createV2DeploymentAgnosticVenueSource(source);
  } catch (error) {
    throw new V2TurnkeyWorkspaceError(error.message, { cause: error });
  }
}

function createV2TurnkeyWorkspace({
  workspaceDirectory,
  answers,
  fsImpl = fs,
} = {}) {
  const workspace = resolveV2TurnkeyWorkspace(workspaceDirectory);
  try {
    fsImpl.lstatSync(workspace.root);
    throw new V2TurnkeyWorkspaceError(`destination already exists: ${workspace.root}`);
  } catch (error) {
    if (error instanceof V2TurnkeyWorkspaceError) throw error;
    if (error?.code !== 'ENOENT') {
      throw new V2TurnkeyWorkspaceError(
        `cannot inspect destination ${workspace.root}`,
        { cause: error },
      );
    }
  }

  const source = buildV2StarterSource(answers);
  const bytes = serializeV2DeploymentAgnosticVenueSourceFile(source);
  try {
    fsImpl.mkdirSync(path.dirname(workspace.root), { recursive: true });
    fsImpl.mkdirSync(workspace.root, { recursive: false, mode: 0o755 });
    fsImpl.mkdirSync(workspace.assetDirectory, { recursive: false, mode: 0o755 });
    for (const asset of STARTER_ASSETS) {
      fsImpl.writeFileSync(
        path.join(workspace.assetDirectory, asset.filename),
        starterSvg(asset),
        { encoding: 'utf8', flag: 'wx', mode: 0o644 },
      );
    }
    fsImpl.writeFileSync(
      workspace.sourceFile,
      bytes,
      { encoding: 'utf8', flag: 'wx', mode: 0o644 },
    );
  } catch (error) {
    try {
      fsImpl.rmSync(workspace.root, { recursive: true, force: true });
    } catch {
      // Preserve the construction failure.
    }
    if (error instanceof V2TurnkeyWorkspaceError) throw error;
    throw new V2TurnkeyWorkspaceError(
      `could not create workspace at ${workspace.root}: ${error.message}`,
      { cause: error },
    );
  }

  return Object.freeze({
    ...workspace,
    source,
    sourceBytes: bytes,
    starter: String(answers?.starter || 'general').trim(),
  });
}

module.exports = {
  V2_STARTERS,
  V2_STARTER_IDS,
  V2TurnkeyWorkspaceError,
  buildV2StarterSource,
  createV2TurnkeyWorkspace,
  resolveV2TurnkeyWorkspace,
};
