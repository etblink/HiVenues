'use strict';

const { bindDeploymentAgnosticVenueSource } = require('./source');
const {
  PortableVenueWorkspaceError,
  buildPortableVenueWorkspace,
} = require('./workspace');

function buildPortableVenueWorkspaceFromSource({ venueSource, deploymentManifest }) {
  let authoringDocument;
  try {
    authoringDocument = bindDeploymentAgnosticVenueSource(venueSource, deploymentManifest);
  } catch (error) {
    throw new PortableVenueWorkspaceError(
      `deployment-agnostic source binding rejected: ${error.message}`,
      { cause: error },
    );
  }

  return buildPortableVenueWorkspace({
    authoringDocument,
    deploymentManifest,
  });
}

module.exports = {
  buildPortableVenueWorkspaceFromSource,
};
