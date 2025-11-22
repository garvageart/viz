import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const newVersionNumber = process.argv[2];

if (!newVersionNumber) {
    console.error('Usage: node updateProjectVersion.js <new-version>');
    process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const versionFilePath = path.join(repoRoot, 'version.txt');
const scriptPkgPath = path.join(__dirname, 'package.json');
const rootPkgPath = path.join(repoRoot, 'package.json');
const vizPkgPath = path.join(repoRoot, 'viz', 'package.json');

/**
 * @param {import("fs").PathLike} filePath
 */
function updatePkg (filePath) {
    try {
        if (!fs.existsSync(filePath)) return false;
        const raw = fs.readFileSync(filePath, 'utf8');
        const pkg = JSON.parse(raw);
        pkg.version = newVersionNumber;
        fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        console.log('Updated', filePath);
        return true;
    } catch (err) {
        console.error('Failed to update', filePath, err);
        return false;
    }
}

try {
    fs.writeFileSync(versionFilePath, newVersionNumber + '\n', 'utf8');
    console.log('Wrote', versionFilePath);
} catch (err) {
    console.error('Failed to write version file:', err);
    process.exit(1);
}

// package.json files: scripts/js, root, and viz
updatePkg(scriptPkgPath);
updatePkg(rootPkgPath);
updatePkg(vizPkgPath);

console.log('\nVersion bump complete:', newVersionNumber);