#!/usr/bin/env node

/**
 * Supabase Query Validation Script
 *
 * This script validates that all Supabase queries use explicit foreign key
 * constraint names instead of implicit joins to ensure reliable data loading.
 */

const fs = require('fs');
const path = require('path');

// Define expected foreign key patterns
const FOREIGN_KEY_PATTERNS = {
  'session_participants': {
    user: 'session_participants_user_id_fkey',
    session: 'session_participants_session_id_fkey',
  },
  'sport_sessions': {
    creator: 'sport_sessions_creator_id_fkey',
    sport: 'sport_sessions_sport_id_fkey',
  },
  'messages': {
    user: 'messages_user_id_fkey',
  },
  'chat_messages': {
    user: 'chat_messages_user_id_fkey',
  },
  'ratings': {
    rater: 'ratings_rater_user_id_fkey',
    rated_user: 'ratings_rated_user_id_fkey',
  },
  'typing_indicators': {
    user: 'typing_indicators_user_id_fkey',
  },
};

// Files to scan
const SCAN_PATTERNS = [
  'src/screens/**/*.tsx',
  'src/screens/**/*.ts',
  'src/components/**/*.tsx',
  'src/components/**/*.ts',
  'src/services/**/*.ts',
];

const results = {
  passed: [],
  warnings: [],
  errors: [],
  filesScanned: 0,
};

/**
 * Recursively find all files matching patterns
 */
function findFiles(dir, patterns) {
  const files = [];

  function scan(currentDir) {
    if (!fs.existsSync(currentDir)) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scan(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  // Start scanning from src directory
  scan(path.join(process.cwd(), 'src'));

  return files;
}

/**
 * Check if a Supabase query uses explicit foreign keys
 */
function validateQuery(filePath, content) {
  const queries = [];

  // Find all .from() calls
  const fromRegex = /\.from\(['"](\w+)['"]\)[\s\S]*?\.select\(\s*`([\s\S]*?)`\s*\)/g;
  let match;

  while ((match = fromRegex.exec(content)) !== null) {
    const tableName = match[1];
    const selectClause = match[2];

    queries.push({
      table: tableName,
      select: selectClause,
      lineNumber: content.substring(0, match.index).split('\n').length,
    });
  }

  // Validate each query
  for (const query of queries) {
    validateSingleQuery(filePath, query);
  }
}

/**
 * Validate a single query
 */
function validateSingleQuery(filePath, query) {
  const { table, select, lineNumber } = query;

  // Check for profile joins
  const profileJoinRegex = /(\w+):profiles(?:!(\w+))?\(/g;
  let match;

  while ((match = profileJoinRegex.exec(select)) !== null) {
    const joinAlias = match[1];
    const explicitFKey = match[2];

    // Check if this table has expected foreign keys
    const expectedFKeys = FOREIGN_KEY_PATTERNS[table];

    if (!explicitFKey) {
      // No explicit foreign key - this is a problem
      results.errors.push({
        file: path.relative(process.cwd(), filePath),
        line: lineNumber,
        table: table,
        issue: `Implicit join detected: "${joinAlias}:profiles()" should use explicit foreign key`,
        suggestion: expectedFKeys && expectedFKeys[joinAlias]
          ? `Use: ${joinAlias}:profiles!${expectedFKeys[joinAlias]}(...)`
          : `Add explicit foreign key constraint name`,
      });
    } else {
      // Has explicit foreign key - verify it's correct
      if (expectedFKeys && expectedFKeys[joinAlias]) {
        if (explicitFKey === expectedFKeys[joinAlias]) {
          results.passed.push({
            file: path.relative(process.cwd(), filePath),
            line: lineNumber,
            table: table,
            fkey: explicitFKey,
          });
        } else {
          results.warnings.push({
            file: path.relative(process.cwd(), filePath),
            line: lineNumber,
            table: table,
            issue: `Foreign key might be incorrect`,
            current: explicitFKey,
            expected: expectedFKeys[joinAlias],
          });
        }
      } else {
        // Unknown pattern, but has explicit key - that's good
        results.passed.push({
          file: path.relative(process.cwd(), filePath),
          line: lineNumber,
          table: table,
          fkey: explicitFKey,
        });
      }
    }
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Scanning Supabase queries for explicit foreign key usage...\n');

  const files = findFiles(process.cwd(), SCAN_PATTERNS);
  results.filesScanned = files.length;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    validateQuery(file, content);
  }

  // Print results
  console.log(`📊 Results (${results.filesScanned} files scanned):\n`);

  if (results.passed.length > 0) {
    console.log(`✅ Passed: ${results.passed.length} queries with explicit foreign keys`);
    if (process.env.VERBOSE) {
      results.passed.forEach(item => {
        console.log(`   ${item.file}:${item.line} - ${item.table} (${item.fkey})`);
      });
    }
    console.log();
  }

  if (results.warnings.length > 0) {
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(item => {
      console.log(`   ${item.file}:${item.line}`);
      console.log(`      Issue: ${item.issue}`);
      console.log(`      Current: ${item.current}`);
      console.log(`      Expected: ${item.expected}`);
      console.log();
    });
  }

  if (results.errors.length > 0) {
    console.log(`❌ Errors: ${results.errors.length}`);
    results.errors.forEach(item => {
      console.log(`   ${item.file}:${item.line}`);
      console.log(`      Table: ${item.table}`);
      console.log(`      Issue: ${item.issue}`);
      console.log(`      Suggestion: ${item.suggestion}`);
      console.log();
    });
  }

  // Summary
  console.log('━'.repeat(60));
  if (results.errors.length === 0 && results.warnings.length === 0) {
    console.log('✅ All Supabase queries are using explicit foreign keys!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${results.errors.length} errors and ${results.warnings.length} warnings`);
    console.log('   Please fix these issues to ensure reliable data loading.');
    process.exit(1);
  }
}

// Run the script
main();
