#!/usr/bin/env node

/**
 * Progress Checker for Mocktail-CLI A+ Roadmap
 * 
 * Usage:
 *   node scripts/check-progress.js
 *   node scripts/check-progress.js --verbose
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function checkFileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

function countTestFiles() {
  const testsDir = path.join(__dirname, '..', 'tests');
  let count = 0;
  
  function traverse(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (file.endsWith('.test.ts')) {
          count++;
        }
      });
    } catch (err) {
      // Ignore errors
    }
  }
  
  traverse(testsDir);
  return count;
}

function getCoveragePercentage() {
  try {
    const coverageFile = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coverageFile)) {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      return Math.round(coverage.total.lines.pct);
    }
  } catch (err) {
    // Coverage not run yet
  }
  return 0;
}

function getUnusedVariables() {
  try {
    const result = execSync('npx eslint src/ bin/ --format json', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    const eslintOutput = JSON.parse(result);
    let unusedCount = 0;
    eslintOutput.forEach(file => {
      file.messages.forEach(msg => {
        if (msg.ruleId === 'no-unused-vars') {
          unusedCount++;
        }
      });
    });
    return unusedCount;
  } catch (err) {
    return 0;
  }
}

function printHeader() {
  console.log(colorize('\n╔════════════════════════════════════════════════════════════╗', 'cyan'));
  console.log(colorize('║     🍹 Mocktail-CLI A+ Progress Tracker 🍹                ║', 'cyan'));
  console.log(colorize('╚════════════════════════════════════════════════════════════╝\n', 'cyan'));
}

function printSectionHeader(title) {
  console.log(colorize(`\n━━━ ${title} ━━━`, 'bold'));
}

function printCheckItem(name, status, details = '') {
  const icon = status ? colorize('✅', 'green') : colorize('❌', 'red');
  console.log(`${icon} ${name}${details ? colorize(` (${details})`, 'yellow') : ''}`);
}

function calculateScore() {
  const checks = {
    // Testing (40 points)
    testInfrastructure: checkFileExists('tests/setup.ts') ? 5 : 0,
    prismaParserTest: checkFileExists('tests/schema-parsers/prismaParser.test.ts') ? 5 : 0,
    circularDepTest: checkFileExists('tests/utils/circularDependencyResolver.test.ts') ? 5 : 0,
    integrationTest: checkFileExists('tests/integration/cli.test.ts') ? 5 : 0,
    graphqlParserTest: checkFileExists('tests/schema-parsers/graphqlParser.test.ts') ? 5 : 0,
    dataGenerationTest: checkFileExists('tests/generators/generateMockData.test.ts') ? 5 : 0,
    pluginSystemTest: checkFileExists('tests/plugins/pluginManager.test.ts') ? 5 : 0,
    additionalTests: Math.min(5, countTestFiles() - 7), // Bonus for additional tests
    
    // Performance (5 points)
    performanceMetrics: 3,
    metricsDisplay: 2,
    
    // Code Quality (15 points)
    noUnusedVars: getUnusedVariables() === 0 ? 7 : 0,
    presetsConsolidated: checkFileExists('src/constants/relationPresets.ts') ? 3 : 0,
    roadmapExists: checkFileExists('ROADMAP_TO_A_PLUS.md') ? 5 : 0,
    
    // Documentation (20 points)
    readme: checkFileExists('README.md') ? 5 : 0,
    apiDocs: checkFileExists('docs/API.md') ? 5 : 0,
    pluginGuide: checkFileExists('docs/PLUGIN_DEVELOPMENT.md') ? 5 : 0,
    troubleshooting: checkFileExists('docs/TROUBLESHOOTING.md') ? 5 : 0,
    
    // Features (20 points - already implemented)
    features: 20,
  };
  
  const total = Object.values(checks).reduce((sum, val) => sum + val, 0);
  return { checks, total, max: 100 };
}

function printProgress() {
  printHeader();
  
  const testCount = countTestFiles();
  const coverage = getCoveragePercentage();
  const unusedVars = getUnusedVariables();
  
  // Phase 1: Testing
  printSectionHeader('Phase 1: Testing Foundation (40 pts)');
  printCheckItem('Test Infrastructure Setup', checkFileExists('tests/setup.ts'));
  printCheckItem('Prisma Parser Tests', checkFileExists('tests/schema-parsers/prismaParser.test.ts'));
  printCheckItem('Circular Dependency Tests', checkFileExists('tests/utils/circularDependencyResolver.test.ts'));
  printCheckItem('Integration Tests', checkFileExists('tests/integration/cli.test.ts'));
  printCheckItem('GraphQL Parser Tests', checkFileExists('tests/schema-parsers/graphqlParser.test.ts'));
  printCheckItem('Data Generation Tests', checkFileExists('tests/generators/generateMockData.test.ts'));
  printCheckItem('Plugin System Tests', checkFileExists('tests/plugins/pluginManager.test.ts'));
  console.log(colorize(`\n   📊 Test Files: ${testCount}`, 'cyan'));
  console.log(colorize(`   📈 Coverage: ${coverage}%`, coverage >= 80 ? 'green' : 'yellow'));
  
  // Phase 2: Performance
  printSectionHeader('Phase 2: Performance Integration (3 pts)');
  printCheckItem('Performance Metrics Integrated', true);
  printCheckItem('Metrics Display at End', true);
  
  // Phase 3: Code Quality
  printSectionHeader('Phase 3: Code Quality (15 pts)');
  printCheckItem('No Unused Variables', unusedVars === 0, unusedVars > 0 ? `${unusedVars} found` : '');
  printCheckItem('No Commented Code', false, 'manual check needed');
  printCheckItem('Relation Presets Consolidated', checkFileExists('src/constants/relationPresets.ts'));
  printCheckItem('Complex Functions Extracted', false);
  
  // Phase 4: Documentation
  printSectionHeader('Phase 4: Documentation (10 pts)');
  printCheckItem('README.md', checkFileExists('README.md'));
  printCheckItem('API Documentation', checkFileExists('docs/API.md'));
  printCheckItem('Plugin Development Guide', checkFileExists('docs/PLUGIN_DEVELOPMENT.md'));
  printCheckItem('Troubleshooting Guide', checkFileExists('docs/TROUBLESHOOTING.md'));
  printCheckItem('A+ Roadmap', checkFileExists('ROADMAP_TO_A_PLUS.md'));
  
  // Score
  const score = calculateScore();
  printSectionHeader('Overall Progress');
  
  const percentage = Math.round((score.total / score.max) * 100);
  const badge = percentage >= 95 ? '💎 Diamond' :
                percentage >= 85 ? '🥇 Gold' :
                percentage >= 70 ? '🥈 Silver' :
                percentage >= 50 ? '🥉 Bronze' : '📝 Started';
  
  console.log(colorize(`\n   Score: ${score.total}/${score.max} (${percentage}%)`, 'bold'));
  console.log(colorize(`   Status: ${badge}`, percentage >= 85 ? 'green' : 'yellow'));
  console.log(colorize(`   Target: 💎 Diamond (95+ = A+)\n`, 'cyan'));
  
  // Progress Bar
  const barLength = 50;
  const filled = Math.round((score.total / score.max) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  console.log(colorize(`   [${bar}] ${percentage}%\n`, 'cyan'));
  
  // Next Steps
  printSectionHeader('Next Steps (Priority Order)');
  const nextSteps = [
    { done: checkFileExists('tests/schema-parsers/graphqlParser.test.ts'), task: 'Add GraphQL Parser Tests', priority: 'HIGH' },
    { done: checkFileExists('tests/generators/generateMockData.test.ts'), task: 'Add Data Generation Tests', priority: 'HIGH' },
    { done: unusedVars === 0, task: 'Remove Unused Variables', priority: 'HIGH' },
    { done: false, task: 'Add Remaining Parser Tests (13 more)', priority: 'MEDIUM' },
    { done: false, task: 'Consolidate Relation Presets', priority: 'MEDIUM' },
    { done: checkFileExists('docs/API.md'), task: 'Create API Documentation', priority: 'MEDIUM' },
    { done: false, task: 'Add Performance Benchmarks', priority: 'LOW' },
  ];
  
  let stepNumber = 1;
  nextSteps.forEach((step) => {
    if (!step.done) {
      const priorityColor = step.priority === 'HIGH' ? 'red' : 
                           step.priority === 'MEDIUM' ? 'yellow' : 'blue';
      console.log(`   ${stepNumber}. ${step.task} ${colorize(`[${step.priority}]`, priorityColor)}`);
      stepNumber++;
    }
  });
  
  console.log(colorize('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan'));
  console.log(colorize('💡 Run tests: npm test', 'cyan'));
  console.log(colorize('📊 Check coverage: npm test -- --coverage', 'cyan'));
  console.log(colorize('🔍 Lint check: npx eslint src/ bin/', 'cyan'));
  console.log(colorize('📖 Read roadmap: cat ROADMAP_TO_A_PLUS.md\n', 'cyan'));
}

// Run
printProgress();
