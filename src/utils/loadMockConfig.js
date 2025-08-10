// src/utils/loadMockConfig.js
const path = require('path');
const fs = require('fs');

function loadMockConfig(configPath = './mocktail-cli.config.js') {
  const fullPath = path.resolve(configPath);

  if (!fs.existsSync(fullPath)) return null;

  try {
    // allow JSON or JS module
    const config = require(fullPath);
    return typeof config === 'function' ? config() : config;
  } catch (err) {
    console.error('Failed to load mocktail-cli config:', err.message);
    return null;
  }
}

module.exports = loadMockConfig;
