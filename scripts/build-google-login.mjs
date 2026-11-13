import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';
// Render can keep its current dependency-free startup; the audited JWT verifier
// is bundled ahead of deployment from the pinned hosting/package-lock.json.
await build({entryPoints:['hosting/google-auth.mjs'],bundle:true,format:'esm',platform:'node',target:'node24',outfile:'hosting/google-auth-bundle.mjs',minify:true,legalComments:'inline'});
await copyFile('hosting/node_modules/jose/LICENSE.md','hosting/jose.LICENSE.md');
console.log('Google login verifier bundle built.');
