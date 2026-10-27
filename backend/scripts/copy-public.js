'use strict';

const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '../public');
const destination = path.resolve(__dirname, '../dist/public');

fs.cpSync(source, destination, { recursive: true, force: true });
