#!/usr/bin/env node
/**
 * Migration script to copy web application from mockup to monorepo structure
 * This script handles the systematic migration of all frontend files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_DIR = '/home/ali/arketic/arketic_mockup';
const TARGET_DIR = '/home/ali/arketic/apps/web';

// Directories to migrate
const DIRS_TO_MIGRATE = [
  'app',
  'components', 
  'lib',
  'public',
  '__mocks__',
  'tests'
];

// Files to migrate
const FILES_TO_MIGRATE = [
  'next-env.d.ts',
  'postcss.config.mjs',
  'components.json',
  'jest.config.js',
  'jest.setup.js',
  'jest.polyfills.js',
  'playwright.config.ts'
];

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function migrateDirectory(sourceDir, targetDir) {
  console.log(`Migrating directory: ${sourceDir} -> ${targetDir}`);
  
  try {
    execSync(`cp -r "${sourceDir}" "${targetDir}"`); 
    console.log(`✅ Successfully migrated ${sourceDir}`);
  } catch (error) {
    console.error(`❌ Failed to migrate ${sourceDir}:`, error.message);
  }
}

function migrateFile(sourceFile, targetFile) {
  console.log(`Migrating file: ${sourceFile} -> ${targetFile}`);
  
  try {
    fs.copyFileSync(sourceFile, targetFile);
    console.log(`✅ Successfully migrated ${path.basename(sourceFile)}`);
  } catch (error) {
    console.error(`❌ Failed to migrate ${sourceFile}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting web application migration...');
  
  // Ensure target directory exists
  ensureDirectoryExists(TARGET_DIR);
  
  // Migrate directories
  for (const dir of DIRS_TO_MIGRATE) {
    const sourceDir = path.join(SOURCE_DIR, dir);
    const targetDir = path.join(TARGET_DIR, dir);
    
    if (fs.existsSync(sourceDir)) {
      migrateDirectory(sourceDir, path.dirname(targetDir));
    } else {
      console.log(`⚠️  Directory ${sourceDir} does not exist, skipping`);
    }
  }
  
  // Migrate individual files
  for (const file of FILES_TO_MIGRATE) {
    const sourceFile = path.join(SOURCE_DIR, file);
    const targetFile = path.join(TARGET_DIR, file);
    
    if (fs.existsSync(sourceFile)) {
      migrateFile(sourceFile, targetFile);
    } else {
      console.log(`⚠️  File ${sourceFile} does not exist, skipping`);
    }
  }
  
  console.log('✅ Web application migration completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };