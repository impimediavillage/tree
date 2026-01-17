/**
 * Copy Service Worker to Build Output
 * 
 * Ensures firebase-messaging-sw.js is accessible in production
 * by copying it to the Next.js standalone output directory.
 */

const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');

// Verify source file exists
if (!fs.existsSync(source)) {
  console.error('❌ Service worker source file not found:', source);
  process.exit(1);
}

console.log('✅ Service worker found at:', source);

// Verify the file is readable and has content
const content = fs.readFileSync(source, 'utf8');
if (content.length === 0) {
  console.error('❌ Service worker file is empty!');
  process.exit(1);
}

console.log(`✅ Service worker file is valid (${content.length} bytes)`);

// Copy to .next/standalone/public if it exists (for production deploys)
const standalonePaths = [
  path.join(__dirname, '..', '.next', 'standalone', 'public'),
  path.join(__dirname, '..', '.next', 'static'),
  path.join(__dirname, '..', '.next'),
];

let copiedCount = 0;

for (const destDir of standalonePaths) {
  if (fs.existsSync(destDir)) {
    try {
      const dest = path.join(destDir, 'firebase-messaging-sw.js');
      fs.copyFileSync(source, dest);
      console.log(`✅ Copied service worker to: ${dest}`);
      copiedCount++;
    } catch (error) {
      console.warn(`⚠️  Could not copy to ${destDir}:`, error.message);
    }
  }
}

if (copiedCount === 0) {
  console.log('ℹ️  No .next directories found yet - this is OK during prebuild');
  console.log('   The file will be copied during postbuild');
} else {
  console.log(`\n🎉 Service worker copied to ${copiedCount} location(s)!`);
}

