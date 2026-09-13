'use strict';

const {
  SAFE_V2_AUTHORING_STUDIO_ERROR: CORE_SAFE_V2_AUTHORING_STUDIO_ERROR,
  createV2AuthoringStudioApp: createCoreV2AuthoringStudioApp,
  createV2AuthoringStudioWorkspaceApp: createCoreV2AuthoringStudioWorkspaceApp,
} = require('./studio-app-core');

const SAFE_V2_AUTHORING_STUDIO_ERROR =
  'The requested Studio action was rejected. Return to the Studio, review the current selection and state, then try an available action again.';

function convergeSafeStudioErrorCopy(fixture) {
  const originalSend = fixture.app.response.send;
  fixture.app.response.send = function sendWithConvergedStudioFeedback(body) {
    const safeBody = body === CORE_SAFE_V2_AUTHORING_STUDIO_ERROR
      ? SAFE_V2_AUTHORING_STUDIO_ERROR
      : body;
    return originalSend.call(this, safeBody);
  };
  return fixture;
}

function createV2AuthoringStudioApp(sourceInput, options = {}) {
  return convergeSafeStudioErrorCopy(
    createCoreV2AuthoringStudioApp(sourceInput, options),
  );
}

function createV2AuthoringStudioWorkspaceApp(options = {}) {
  return convergeSafeStudioErrorCopy(
    createCoreV2AuthoringStudioWorkspaceApp(options),
  );
}

module.exports = {
  SAFE_V2_AUTHORING_STUDIO_ERROR,
  createV2AuthoringStudioApp,
  createV2AuthoringStudioWorkspaceApp,
};
