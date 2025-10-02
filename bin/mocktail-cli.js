#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Get the path to tsx
const tsxPath = path.join(__dirname, '../node_modules/.bin/tsx');
const tsFile = path.join(__dirname, 'mocktail-cli.ts');

// Get arguments
const args = process.argv.slice(2);

// Run tsx with the TypeScript file and pass all arguments
const child = spawn(tsxPath, [tsFile, ...args], { 
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});
