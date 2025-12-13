/**
 * Build script for browser extension
 * Creates separate builds for Chrome and Firefox
 * 
 * Usage: node scripts/build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

// Files and directories to copy
const FILES_TO_COPY = [
    'src',
    'assets',
    'README.md'
];

/**
 * Clean and create directory
 */
function ensureDir(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true });
}

/**
 * Copy file or directory recursively
 */
function copyRecursive(src, dest) {
    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        const files = fs.readdirSync(src);
        files.forEach(file => {
            copyRecursive(path.join(src, file), path.join(dest, file));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

/**
 * Build for Chrome/Edge
 */
function buildChrome() {
    const chromeDir = path.join(DIST_DIR, 'chrome');
    ensureDir(chromeDir);

    // Copy files
    FILES_TO_COPY.forEach(file => {
        const src = path.join(ROOT_DIR, file);
        const dest = path.join(chromeDir, file);
        if (fs.existsSync(src)) {
            copyRecursive(src, dest);
        }
    });

    // Copy Chrome manifest
    fs.copyFileSync(
        path.join(ROOT_DIR, 'manifest.json'),
        path.join(chromeDir, 'manifest.json')
    );

    console.log('✅ Chrome build complete: dist/chrome/');
}

/**
 * Build for Firefox
 */
function buildFirefox() {
    const firefoxDir = path.join(DIST_DIR, 'firefox');
    ensureDir(firefoxDir);

    // Copy files
    FILES_TO_COPY.forEach(file => {
        const src = path.join(ROOT_DIR, file);
        const dest = path.join(firefoxDir, file);
        if (fs.existsSync(src)) {
            copyRecursive(src, dest);
        }
    });

    // Copy Firefox manifest (rename to manifest.json)
    fs.copyFileSync(
        path.join(ROOT_DIR, 'manifest.firefox.json'),
        path.join(firefoxDir, 'manifest.json')
    );

    console.log('✅ Firefox build complete: dist/firefox/');
}

/**
 * Main build function
 */
function build() {
    console.log('🔨 Building browser extension...\n');

    ensureDir(DIST_DIR);

    buildChrome();
    buildFirefox();

    console.log('\n🎉 Build complete!');
    console.log('   Chrome/Edge: dist/chrome/');
    console.log('   Firefox:     dist/firefox/');
}

// Run build
build();
