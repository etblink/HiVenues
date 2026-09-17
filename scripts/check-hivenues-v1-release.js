#!/usr/bin/env node
'use strict';

// Deprecated command name retained temporarily so existing local workflows fail
// cleanly into the renamed wiring check. This command does not declare product V1.
require('./check-turnkey-wiring');
