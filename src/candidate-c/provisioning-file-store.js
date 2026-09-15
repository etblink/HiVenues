'use strict';

const { FileCandidateCStore } = require('./file-store');
const { provisionCandidateCHost } = require('./provision');

class ProvisioningFileCandidateCStore extends FileCandidateCStore {
  createHost(graph) {
    return this.mutate((store) => provisionCandidateCHost(store, graph));
  }
}

module.exports = { ProvisioningFileCandidateCStore };
