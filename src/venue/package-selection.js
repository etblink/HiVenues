'use strict';

const { createVenuePackage } = require('./package');
const { FOURTH_STREET_REFERENCE_PACKAGE } = require('./reference/fourth-street-package');

function selectVenuePackage(venue, explicitPackage = null) {
  const selected = explicitPackage || FOURTH_STREET_REFERENCE_PACKAGE;
  return createVenuePackage(selected, venue);
}

module.exports = { selectVenuePackage };
