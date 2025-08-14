#!/usr/bin/env node

/**
 * Simple test script to verify the compose2hcl web interface build
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing compose2hcl build output...\n');

// Check if dist directory exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ dist/ directory not found!');
  process.exit(1);
}

// Check if index.html exists
const indexPath = path.join(distPath, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('❌ dist/index.html not found!');
  process.exit(1);
}

// Check if assets directory exists
const assetsPath = path.join(distPath, 'assets');
if (!fs.existsSync(assetsPath)) {
  console.error('❌ dist/assets/ directory not found!');
  process.exit(1);
}

// Check for CSS and JS files
const files = fs.readdirSync(assetsPath);
const cssFiles = files.filter(f => f.endsWith('.css'));
const jsFiles = files.filter(f => f.endsWith('.js'));

if (cssFiles.length === 0) {
  console.error('❌ No CSS files found in dist/assets/');
  process.exit(1);
}

if (jsFiles.length === 0) {
  console.error('❌ No JavaScript files found in dist/assets/');
  process.exit(1);
}

// Read and verify index.html content
const htmlContent = fs.readFileSync(indexPath, 'utf8');

// Check for proper base path
if (!htmlContent.includes('/compose2hcl/')) {
  console.error('❌ Base path /compose2hcl/ not found in index.html');
  process.exit(1);
}

// Check for proper script and CSS references
if (!htmlContent.includes('src="/compose2hcl/assets/')) {
  console.error('❌ Script src path not properly configured');
  process.exit(1);
}

if (!htmlContent.includes('href="/compose2hcl/assets/')) {
  console.error('❌ CSS href path not properly configured');
  process.exit(1);
}

console.log('✅ Build output verification successful!');
console.log(`📁 dist/ directory: ${distPath}`);
console.log(`📄 index.html: ${indexPath}`);
console.log(`🎨 CSS files: ${cssFiles.join(', ')}`);
console.log(`⚡ JavaScript files: ${jsFiles.join(', ')}`);
console.log(`🔗 Base path: /compose2hcl/`);
console.log('\n🚀 Ready for GitHub Pages deployment!');
console.log('🌐 Will be available at: https://bolabaden.github.io/compose2hcl');
