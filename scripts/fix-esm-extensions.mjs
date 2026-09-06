import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'dist/esm';

async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await walk(entryPath));
        } else if (entry.isFile()) {
            files.push(entryPath);
        }
    }
    return files;
}

const files = await walk(ROOT);

// TypeScript emits ESM with .js extensions, but Node requires .mjs for ESM
// files. Rename first, then update relative specifiers in the renamed files.
const modules = [];
for (const file of files) {
    if (file.endsWith('.js')) {
        const moduleFile = `${file.slice(0, -3)}.mjs`;
        await rename(file, moduleFile);
        modules.push(moduleFile);
    } else if (file.endsWith('.mjs')) {
        modules.push(file);
    }
}

for (const file of modules) {
    const content = await readFile(file, 'utf8');
    const fixedContent = content.replace(
        /(['"])(\.{1,2}\/[^'"]+)\.js\1/g,
        (_, quote, specifier) => `${quote}${specifier}.mjs${quote}`
    );
    if (fixedContent !== content) {
        await writeFile(file, fixedContent);
    }
}
