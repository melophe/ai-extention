/**
 * Build script for browser extension
 * Creates separate builds for Chrome and Firefox
 * Compiles TypeScript to JavaScript
 *
 * Usage: node scripts/build.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Files and directories to copy (non-TypeScript)
const STATIC_FILES = [
    'assets',
    'README.md'
];

// HTML files that need script references updated
const HTML_FILES = [
    'src/options/options.html',
    'src/sidepanel/sidepanel.html'
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
 * Compile TypeScript files to JavaScript
 */
function compileTypeScript(outputDir) {
    const srcFiles = getAllTsFiles(SRC_DIR);

    srcFiles.forEach(tsFile => {
        const relativePath = path.relative(SRC_DIR, tsFile);
        const jsPath = path.join(outputDir, 'src', relativePath.replace(/\.ts$/, '.js'));
        const jsDir = path.dirname(jsPath);

        fs.mkdirSync(jsDir, { recursive: true });

        // Read TypeScript file
        let content = fs.readFileSync(tsFile, 'utf8');

        // Simple TypeScript to JavaScript transformation
        content = transformTypeScript(content);

        fs.writeFileSync(jsPath, content);
    });
}

/**
 * Get all TypeScript files recursively
 */
function getAllTsFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (item !== 'types') { // Skip type declaration folder
                files.push(...getAllTsFiles(fullPath));
            }
        } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
            files.push(fullPath);
        }
    });

    return files;
}

/**
 * Simple TypeScript to JavaScript transformation
 * Removes type annotations while preserving functionality
 */
function transformTypeScript(content) {
    // Remove import type statements
    content = content.replace(/^import\s+type\s+.*?;?\s*$/gm, '');

    // Remove type-only imports from regular imports
    content = content.replace(/import\s*\{([^}]+)\}\s*from/g, (match, imports) => {
        const cleanedImports = imports
            .split(',')
            .map(i => i.trim())
            .filter(i => !i.startsWith('type '))
            .join(', ');
        return cleanedImports ? `import { ${cleanedImports} } from` : '';
    });

    // Remove empty import statements
    content = content.replace(/^import\s*\{\s*\}\s*from\s*['"][^'"]+['"];?\s*$/gm, '');

    // Remove interface declarations
    content = content.replace(/^(export\s+)?interface\s+\w+\s*(\{[\s\S]*?\n\}|\{[^}]*\})\s*/gm, '');

    // Remove type declarations
    content = content.replace(/^(export\s+)?type\s+\w+\s*=\s*[^;]+;\s*/gm, '');

    // Remove declare statements
    content = content.replace(/^declare\s+(const|let|var|function|class)\s+[^;]+;?\s*$/gm, '');

    // Remove type annotations from variables and parameters
    // : Type annotation (but not :: or ternary :)
    content = content.replace(/:\s*([A-Z][\w<>,\s|&\[\]'"{}()=>?:]+)(?=\s*[=,)}\];])/g, '');

    // Remove type assertions (as Type)
    content = content.replace(/\s+as\s+[A-Z][\w<>,\s|&\[\]'"{}()=>?:]+/g, '');

    // Remove generic type parameters from function/class declarations
    content = content.replace(/<[A-Z][\w,\s<>]+>(?=\s*\()/g, '');

    // Remove return type annotations
    content = content.replace(/\):\s*[A-Z][\w<>,\s|&\[\]'"{}()=>?:]+\s*(?=\{|=>)/g, ') ');

    // Remove 'readonly' keyword
    content = content.replace(/\breadonly\s+/g, '');

    // Remove 'private', 'public', 'protected' keywords
    content = content.replace(/\b(private|public|protected)\s+/g, '');

    // Remove '!' non-null assertions
    content = content.replace(/!(?=\.|;|\)|\]|,|\s)/g, '');

    // Clean up .js extensions in imports (TypeScript adds them, we keep them)
    // No change needed - keep .js extensions

    // Remove multiple empty lines
    content = content.replace(/\n{3,}/g, '\n\n');

    return content;
}

/**
 * Copy HTML files and update script references
 */
function copyHtmlFiles(outputDir) {
    HTML_FILES.forEach(htmlFile => {
        const src = path.join(ROOT_DIR, htmlFile);
        const dest = path.join(outputDir, htmlFile);

        if (fs.existsSync(src)) {
            fs.mkdirSync(path.dirname(dest), { recursive: true });

            let content = fs.readFileSync(src, 'utf8');
            // Update .ts references to .js
            content = content.replace(/\.ts(['"])/g, '.js$1');

            fs.writeFileSync(dest, content);
        }
    });
}

/**
 * Build for Chrome/Edge
 */
function buildChrome() {
    const chromeDir = path.join(DIST_DIR, 'chrome');
    ensureDir(chromeDir);

    // Copy static files
    STATIC_FILES.forEach(file => {
        const src = path.join(ROOT_DIR, file);
        const dest = path.join(chromeDir, file);
        if (fs.existsSync(src)) {
            copyRecursive(src, dest);
        }
    });

    // Compile TypeScript
    compileTypeScript(chromeDir);

    // Copy HTML files
    copyHtmlFiles(chromeDir);

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

    // Copy static files
    STATIC_FILES.forEach(file => {
        const src = path.join(ROOT_DIR, file);
        const dest = path.join(firefoxDir, file);
        if (fs.existsSync(src)) {
            copyRecursive(src, dest);
        }
    });

    // Compile TypeScript
    compileTypeScript(firefoxDir);

    // Copy HTML files
    copyHtmlFiles(firefoxDir);

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
