// scripts/check-governance.mjs
// Drift guard / governance enforcement for Agent Smith.
// Run via: npm run check:governance

import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const encoding = 'utf-8';

let hasError = false;

function reportError(message) {
  console.error(`❌ GOVERNANCE: ${message}`);
  hasError = true;
}

function reportOk(message) {
  console.log(`✅ ${message}`);
}

// --- 1. VERSION must match CHANGELOG top entry ---
async function checkVersionChangelog() {
  console.log('\n--- Checking VERSION vs CHANGELOG.md ---');
  try {
    const version = (await fs.readFile(path.join(repoRoot, 'VERSION'), encoding)).trim();
    const changelog = await fs.readFile(path.join(repoRoot, 'CHANGELOG.md'), encoding);

    const match = changelog.match(/## \[(\d+\.\d+\.\d+)\]/);
    if (!match) {
      reportError('No version entry found in CHANGELOG.md.');
      return;
    }
    if (version !== match[1]) {
      reportError(`VERSION ("${version}") != CHANGELOG top entry ("${match[1]}").`);
    } else {
      reportOk(`VERSION ${version} matches CHANGELOG.`);
    }
  } catch (e) {
    reportError(`Could not read VERSION or CHANGELOG.md: ${e.message}`);
  }
}

// --- 2. CONTRACTS.md must mention all commands in src/commands/ ---
async function checkContractsCommandSurface() {
  console.log('\n--- Checking CONTRACTS.md vs command surface ---');
  try {
    const contracts = await fs.readFile(path.join(repoRoot, 'CONTRACTS.md'), encoding);
    const commandDir = path.join(repoRoot, 'src', 'commands');
    const files = await fs.readdir(commandDir);

    const commandFiles = files
      .filter(f => f.endsWith('.ts') && f !== 'index.ts')
      .map(f => f.replace('.ts', ''));

    let allFound = true;
    for (const cmd of commandFiles) {
      const pattern = new RegExp(`### \`/${cmd}\``, 'i');
      if (!pattern.test(contracts)) {
        reportError(`Command "/${cmd}" exists in src/commands/ but has no contract in CONTRACTS.md.`);
        allFound = false;
      }
    }
    if (allFound) {
      reportOk(`All commands (${commandFiles.join(', ')}) have CONTRACTS.md entries.`);
    }
  } catch (e) {
    reportError(`Could not check command surface: ${e.message}`);
  }
}

// --- 3. .dev.vars.example must exist ---
async function checkDevVarsExample() {
  console.log('\n--- Checking .dev.vars.example ---');
  try {
    await fs.access(path.join(repoRoot, '.dev.vars.example'));
    reportOk('.dev.vars.example exists.');
  } catch {
    reportError('.dev.vars.example is missing. Local dev config contract is broken.');
  }
}

// --- 4. No src/ file may import from legacy/ ---
async function checkNoLegacyImports() {
  console.log('\n--- Checking for legacy imports in src/ ---');
  try {
    const srcDir = path.join(repoRoot, 'src');
    const tsFiles = await collectFiles(srcDir, '.ts');
    let clean = true;
    for (const file of tsFiles) {
      const content = await fs.readFile(file, encoding);
      if (/from\s+['"].*legacy/i.test(content) || /require\s*\(\s*['"].*legacy/i.test(content)) {
        reportError(`${path.relative(repoRoot, file)} imports from legacy/.`);
        clean = false;
      }
    }
    if (clean) {
      reportOk('No legacy/ imports found in src/.');
    }
  } catch (e) {
    reportError(`Could not scan src/ for legacy imports: ${e.message}`);
  }
}

// --- 5. SOT.md must mention current VERSION ---
async function checkSOTVersion() {
  console.log('\n--- Checking SOT.md references current version ---');
  try {
    const version = (await fs.readFile(path.join(repoRoot, 'VERSION'), encoding)).trim();
    const sot = await fs.readFile(path.join(repoRoot, 'SOT.md'), encoding);
    // Check that the major.minor version prefix appears in SOT
    const majorMinor = version.split('.').slice(0, 2).join('.');
    if (!sot.includes(majorMinor)) {
      reportError(`SOT.md does not reference current version line (${majorMinor}).`);
    } else {
      reportOk(`SOT.md references version ${majorMinor}.`);
    }
  } catch (e) {
    reportError(`Could not check SOT version: ${e.message}`);
  }
}

// --- Helper: recursively collect files ---
async function collectFiles(dir, ext) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(full, ext)));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

// --- Main ---
async function main() {
  console.log('=== Agent Smith Governance Checks ===');

  await checkVersionChangelog();
  await checkContractsCommandSurface();
  await checkDevVarsExample();
  await checkNoLegacyImports();
  await checkSOTVersion();

  if (hasError) {
    console.log('\n❌ Governance checks FAILED.');
    process.exit(1);
  } else {
    console.log('\n✅ All governance checks passed.');
  }
}

main();
