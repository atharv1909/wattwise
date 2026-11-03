const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('⚡ WattWise Universal Build Script starting...');
const currentDir = process.cwd();
console.log('Current working directory:', currentDir);

if (fs.existsSync(path.join(currentDir, 'web'))) {
  console.log('Detected monorepo root. Building web frontend...');
  const webDir = path.join(currentDir, 'web');
  execSync('npm run build', { cwd: webDir, stdio: 'inherit' });

  // Copy web/dist to root dist for zero-config root deployments
  const srcDist = path.join(webDir, 'dist');
  const targetDist = path.join(currentDir, 'dist');

  if (fs.existsSync(srcDist)) {
    fs.mkdirSync(targetDist, { recursive: true });
    fs.cpSync(srcDist, targetDist, { recursive: true });
    console.log('✅ Copied web/dist to root dist/ successfully!');
  }
} else if (fs.existsSync(path.join(currentDir, 'vite.config.js')) || fs.existsSync(path.join(currentDir, 'src'))) {
  console.log('Detected web subdirectory root. Running vite build...');
  execSync('npx vite build', { stdio: 'inherit' });
} else {
  console.log('Running standard build...');
  execSync('npm run build', { stdio: 'inherit' });
}

console.log('⚡ WattWise build completed successfully!');
