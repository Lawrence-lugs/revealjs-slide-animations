#!/usr/bin/env node
const {readFileSync} = require('node:fs');
const path = require('node:path');

const [installed, reference = path.join(__dirname, '../_extensions/slide-animations'), ...extra] = process.argv.slice(2);
if (!installed || extra.length) {
  console.error('Usage: npm run check:extension -- <installed-extension-dir> [reference-extension-dir]');
  process.exit(2);
}

const files = ['_extension.yml', 'motion.js', 'motion.css'];
const read = (directory, filename) => readFileSync(path.join(directory, filename));
const version = (directory) => read(directory, '_extension.yml').toString()
  .match(/^version:\s*([^\r\n]+)/m)?.[1].trim() ?? '(unknown)';

try {
  console.log(`Installed ${version(installed)} / reference ${version(reference)}`);
  const differences = files.filter(filename => !read(installed, filename).equals(read(reference, filename)));
  if (differences.length) {
    console.error(`Files differ: ${differences.join(', ')}. Update the vendor copy or review local changes.`);
    process.exitCode = 1;
  } else {
    console.log('Extension files match the reference checkout.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
}
