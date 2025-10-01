#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

// Get the path to tsx
const tsxPath = path.join(__dirname, '../node_modules/.bin/tsx');
const tsFile = path.join(__dirname, 'mocktail-cli.ts');

// Build the command
const args = process.argv.slice(2).join(' ');
const command = `"${tsxPath}" "${tsFile}" ${args}`;

// Run tsx with the TypeScript file and pass all arguments
exec(command, { stdio: 'inherit' }, (error, stdout, stderr) => {
  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
});
