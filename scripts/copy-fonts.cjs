const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'node_modules', '@fortawesome', 'fontawesome-free', 'webfonts');
const destDir = path.resolve(__dirname, '..', 'public', 'webfonts');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn('Source fonts directory does not exist:', src);
    return;
  }
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log('Copied', entry.name);
    }
  }
}

copyRecursive(srcDir, destDir);
console.log('Font copy complete. Destination:', destDir);
