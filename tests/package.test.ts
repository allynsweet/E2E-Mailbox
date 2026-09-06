import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';

const root = process.cwd();
describe('package output', () => {
    it('exposes a constructable default export from ESM and CJS', () => {
        expect(existsSync(path.join(root, 'dist/esm/index.mjs'))).toBe(true);

        const esmResult = spawnSync(
            process.execPath,
            [
                '--input-type=module',
                '-e',
                "const { default: E2EMailbox } = await import('e2e-mailbox'); const mailbox = new E2EMailbox(); if (typeof E2EMailbox !== 'function' || !(mailbox instanceof E2EMailbox)) { throw new Error('ESM default export is not constructable'); }"
            ],
            { cwd: root, encoding: 'utf8' }
        );
        expect(esmResult.error).toBeUndefined();
        expect(esmResult.stderr).toBe('');
        expect(esmResult.status).toBe(0);

        const CJSIntegrationMailbox = require('../dist/lib/index.js').default;
        const cjsMailbox = new CJSIntegrationMailbox();
        expect(typeof CJSIntegrationMailbox).toBe('function');
        expect(cjsMailbox instanceof CJSIntegrationMailbox).toBe(true);
    });

    it('does not expose the deprecated MIME parser dependency to bundlers', () => {
        const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
        expect(packageJson.dependencies.mailparser).toBeUndefined();
        expect(packageJson.exports['.'].import).toBe('./dist/esm/index.mjs');
        expect(packageJson.exports['.'].require).toBe('./dist/lib/index.js');
    });
});
