#!/usr/bin/env node

console.log('Testing imports...');

try {
  console.log('1. Testing require...');
  const lib = require('./lib/index');
  console.log('2. Library loaded:', Object.keys(lib));
  
  if (lib.convertCompose) {
    console.log('3. convertCompose function found');
  } else {
    console.log('3. convertCompose function NOT found');
  }
  
  if (lib.INFO) {
    console.log('4. INFO object found:', lib.INFO);
  } else {
    console.log('4. INFO object NOT found');
  }
  
} catch (error) {
  console.error('Error loading library:', error);
}

console.log('Test complete');
