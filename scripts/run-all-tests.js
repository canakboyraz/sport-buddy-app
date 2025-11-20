#!/usr/bin/env node

/**
 * Automated Test Runner
 *
 * This script runs all tests in the proper order and generates a comprehensive report.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const results = {
  startTime: Date.now(),
  tests: [],
};

function log(message, color = 'reset') {
  console.log(COLORS[color] + message + COLORS.reset);
}

function logSection(title) {
  log('\n' + '═'.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('═'.repeat(60), 'cyan');
}

function runCommand(command, name, description) {
  const test = {
    name,
    description,
    command,
    passed: false,
    output: '',
    duration: 0,
  };

  log(`\n▶ Running: ${description}...`, 'blue');

  const startTime = Date.now();
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    });

    test.output = output;
    test.passed = true;
    test.duration = Date.now() - startTime;

    log(`✅ Passed (${test.duration}ms)`, 'green');

    results.tests.push(test);
    return true;
  } catch (error) {
    test.output = error.stdout + '\n' + error.stderr;
    test.passed = false;
    test.duration = Date.now() - startTime;
    test.error = error.message;

    log(`❌ Failed (${test.duration}ms)`, 'red');
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);

    results.tests.push(test);
    return false;
  }
}

function generateReport() {
  logSection('📊 Test Results Summary');

  const totalTests = results.tests.length;
  const passedTests = results.tests.filter(t => t.passed).length;
  const failedTests = totalTests - passedTests;
  const totalDuration = Date.now() - results.startTime;

  console.log();
  log(`Total Tests:     ${totalTests}`, 'bright');
  log(`Passed:          ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`Failed:          ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Total Duration:  ${totalDuration}ms`, 'cyan');
  console.log();

  // Detailed results
  log('Detailed Results:', 'bright');
  results.tests.forEach((test, index) => {
    const status = test.passed ? '✅' : '❌';
    const color = test.passed ? 'green' : 'red';
    log(`  ${index + 1}. ${status} ${test.name} (${test.duration}ms)`, color);
    log(`     ${test.description}`, 'reset');
  });

  // Save report to file
  const reportPath = path.join(process.cwd(), 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  log(`\n📄 Full report saved to: ${reportPath}`, 'cyan');

  return failedTests === 0;
}

function main() {
  log('🚀 Starting Automated Test Suite', 'bright');
  log(`Time: ${new Date().toLocaleString()}`, 'cyan');

  // Check if node_modules exists
  if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    log('\n⚠️  node_modules not found. Installing dependencies...', 'yellow');
    try {
      execSync('npm install', { cwd: process.cwd(), stdio: 'inherit' });
    } catch (error) {
      log('❌ Failed to install dependencies', 'red');
      process.exit(1);
    }
  }

  // Run tests in order
  logSection('1️⃣  Supabase Query Validation');
  const queryValidation = runCommand(
    'node scripts/test-supabase-queries.js',
    'Query Validation',
    'Validate Supabase queries use explicit foreign keys'
  );

  logSection('2️⃣  Unit Tests');
  const unitTests = runCommand(
    'npm test -- --testPathPattern=__tests__',
    'Unit Tests',
    'Run Jest unit tests'
  );

  logSection('3️⃣  Integration Tests');
  const integrationTests = runCommand(
    'npm test -- --testPathPattern=integration',
    'Integration Tests',
    'Run integration tests for participant name loading'
  );

  logSection('4️⃣  Component Tests');
  const componentTests = runCommand(
    'npm test -- --testPathPattern=screens',
    'Component Tests',
    'Run component-level tests'
  );

  // Generate final report
  const allPassed = generateReport();

  // Exit with appropriate code
  if (allPassed) {
    log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the results above.', 'red');
    process.exit(1);
  }
}

// Handle errors
process.on('uncaughtException', (error) => {
  log('\n💥 Uncaught Exception:', 'red');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  log('\n💥 Unhandled Rejection:', 'red');
  console.error(error);
  process.exit(1);
});

// Run the test suite
main();
