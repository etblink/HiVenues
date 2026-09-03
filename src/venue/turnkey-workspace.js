'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  VENUE_SOURCE_KIND,
  VENUE_SOURCE_SCHEMA_VERSION,
  createDeploymentAgnosticVenueSource,
} = require('./source');
const { serializeDeploymentAgnosticVenueSourceFile } = require('./source-file');

const TURNKEY_ASSET_DIRECTORY = 'venue-assets';
const TURNKEY_SOURCE_FILENAME = 'venue-source.json';
const STARTER_ASSETS = Object.freeze([
  Object.freeze({ filename: 'starter-logo.svg', width: 512, height: 512, label: 'Logo' }),
  Object.freeze({ filename: 'starter-hero.svg', width: 1600, height: 900, label: 'Hero' }),
  Object.freeze({ filename: 'starter-gallery.svg', width: 1200, height: 800, label: 'Gallery' }),
]);

class TurnkeyWorkspaceError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues workspace creation failed: ${message}`, options);
    this.name = 'TurnkeyWorkspaceError';
  }
}

function requiredText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new TurnkeyWorkspaceError(`${label} is required`);
  return text;
}

function slugifyVenueId(value) {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
  if (slug.length < 2) throw new TurnkeyWorkspaceError('venue id must contain at least two letters or numbers');
  return slug;
}

function starterSvg({ width, height, label }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="HiVenues ${label} starter placeholder"><rect width="100%" height="100%" fill="#f4f1ea"/><rect x="4" y="4" width="${width - 8}" height="${height - 8}" rx="24" fill="none" stroke="#292524" stroke-width="8"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${Math.max(32, Math.round(Math.min(width, height) / 10))}" fill="#292524">HiVenues</text><text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${Math.max(20, Math.round(Math.min(width, height) / 20))}" fill="#57534e">Replace ${label.toLowerCase()} in Venue Studio</text></svg>\n`;
}

function buildStarterSource(input = {}) {
  const displayName = requiredText(input.displayName, 'venue name');
  const id = slugifyVenueId(input.id || displayName);
  const officialAccount = requiredText(input.officialAccount, 'Hive official account');
  const source = {
    kind: VENUE_SOURCE_KIND,
    schemaVersion: VENUE_SOURCE_SCHEMA_VERSION,
    venueContext: {
      id,
      displayName,
      business: {
        address: requiredText(input.address, 'street address'),
        phone: requiredText(input.phone, 'phone number'),
        hours: requiredText(input.hours, 'opening hours'),
        websiteUrl: requiredText(input.websiteUrl, 'website URL'),
        mapUrl: requiredText(input.mapUrl, 'directions URL'),
      },
      hive: {
        communityId: requiredText(input.communityId, 'Hive community id'),
        officialAccount,
        threadsContainerAccount: requiredText(input.threadsContainerAccount, 'Hive Threads container account'),
        paymentMerchantAccounts: [requiredText(input.paymentMerchantAccount || officialAccount, 'Hive payment merchant account')],
      },
    },
    venuePackage: {
      schemaVersion: 1,
      id: `${id}-package`,
      venueId: id,
      brand: {
        logo: { src: `/${TURNKEY_ASSET_DIRECTORY}/starter-logo.svg`, width: 512, height: 512 },
        theme: {
          canvas: '#ffffff',
          surface: '#f5f5f4',
          border: '#78716c',
          text: '#1c1917',
          mutedText: '#57534e',
          accent: '#075985',
          accentHover: '#0c4a6e',
        },
      },
      seo: { defaultDescription: `${displayName} — venue information, updates, and community.` },
      home: {
        hero: {
          lede: `Welcome to ${displayName}. Customize this message in Venue Studio.`,
          footnote: 'Venue details are managed locally until you explicitly prepare a deployment.',
          image: {
            src: `/${TURNKEY_ASSET_DIRECTORY}/starter-hero.svg`,
            alt: `${displayName} starter hero placeholder`,
            width: 1600,
            height: 900,
            caption: 'Replace this starter image in Venue Studio.',
          },
        },
        updates: {
          heading: 'Latest updates',
          unavailableLead: 'Updates are temporarily unavailable.',
          unavailableBody: 'Venue information remains available while updates are offline.',
          emptyLead: 'No updates yet.',
          emptyBody: 'New venue updates will appear here.',
        },
        pathways: {
          kicker: 'At the venue and online',
          heading: `Connect with ${displayName}`,
          intro: 'Visit in person or continue the conversation through the venue community.',
        },
        visit: {
          kicker: 'Plan your visit',
          heading: `Visit ${displayName}`,
          lede: 'Find current address, hours, contact information, and directions below.',
          note: 'Confirm venue details in Studio before preparing a deployment.',
        },
        community: {
          kicker: 'Venue community',
          heading: 'Keep the conversation going',
          lede: 'See what the venue community is sharing on Hive.',
        },
        gallery: {
          kicker: 'Around the venue',
          heading: `${displayName} gallery`,
          intro: 'Import venue-owned images in Studio to replace this starter media.',
          items: [{
            src: `/${TURNKEY_ASSET_DIRECTORY}/starter-gallery.svg`,
            alt: `${displayName} starter gallery placeholder`,
            width: 1200,
            height: 800,
            caption: 'Replace this starter image in Venue Studio.',
          }],
        },
      },
      onboarding: { operatorNoun: 'venue', staffRole: 'staff member' },
    },
  };
  try {
    return createDeploymentAgnosticVenueSource(source);
  } catch (error) {
    throw new TurnkeyWorkspaceError(error.message, { cause: error });
  }
}

function resolveTurnkeyWorkspace(workspaceDirectory) {
  const root = path.resolve(requiredText(workspaceDirectory, 'workspace directory'));
  return Object.freeze({
    root,
    sourceFile: path.join(root, TURNKEY_SOURCE_FILENAME),
    assetDirectory: path.join(root, TURNKEY_ASSET_DIRECTORY),
  });
}

function createTurnkeyWorkspace({ workspaceDirectory, answers, fsImpl = fs } = {}) {
  const workspace = resolveTurnkeyWorkspace(workspaceDirectory);
  let existing = false;
  try {
    fsImpl.lstatSync(workspace.root);
    existing = true;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw new TurnkeyWorkspaceError(`cannot inspect destination ${workspace.root}`, { cause: error });
  }
  if (existing) throw new TurnkeyWorkspaceError(`destination already exists: ${workspace.root}`);

  const source = buildStarterSource(answers);
  try {
    fsImpl.mkdirSync(path.dirname(workspace.root), { recursive: true });
    fsImpl.mkdirSync(workspace.root, { recursive: false, mode: 0o755 });
    fsImpl.mkdirSync(workspace.assetDirectory, { recursive: false, mode: 0o755 });
    for (const asset of STARTER_ASSETS) {
      fsImpl.writeFileSync(path.join(workspace.assetDirectory, asset.filename), starterSvg(asset), { encoding: 'utf8', flag: 'wx', mode: 0o644 });
    }
    fsImpl.writeFileSync(workspace.sourceFile, serializeDeploymentAgnosticVenueSourceFile(source), { encoding: 'utf8', flag: 'wx', mode: 0o644 });
  } catch (error) {
    try { fsImpl.rmSync(workspace.root, { recursive: true, force: true }); } catch { /* preserve construction failure */ }
    if (error instanceof TurnkeyWorkspaceError) throw error;
    throw new TurnkeyWorkspaceError(`could not create workspace at ${workspace.root}: ${error.message}`, { cause: error });
  }
  return Object.freeze({ ...workspace, source });
}

module.exports = {
  STARTER_ASSETS,
  TURNKEY_ASSET_DIRECTORY,
  TURNKEY_SOURCE_FILENAME,
  TurnkeyWorkspaceError,
  buildStarterSource,
  createTurnkeyWorkspace,
  resolveTurnkeyWorkspace,
  slugifyVenueId,
  starterSvg,
};
