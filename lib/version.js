import { readFileSync } from 'fs';

const pkgPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

export const VERSION = pkg.version;
export const PKG_NAME = pkg.name;
export const PKG_DESCRIPTION = pkg.description;

export const ENGINE_VERSION = '1.18.0';
