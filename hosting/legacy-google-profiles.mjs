import {validIdentity} from '../lib/hosting-proof.mjs';

// A complete, operator-reviewed snapshot from the existing database. This is
// private server configuration, never browser input or a public source file.
export function legacyGoogleProfiles(raw) {
  if(raw === undefined || raw === null || raw === '')return null;
  const records=typeof raw==='string'?JSON.parse(raw):raw;
  if(!Array.isArray(records)||records.length>10000)throw Error('Invalid legacy profile configuration');
  const profiles=new Map(),ids=new Set();
  for(const row of records) {
    if(!row||typeof row.email!=='string'||!validIdentity(row)||!row.email.endsWith('@gmail.com')||row.email!==row.email.trim().toLowerCase()||profiles.has(row.email)||ids.has(row.userId))throw Error('Ambiguous legacy profile configuration');
    profiles.set(row.email,row.userId);ids.add(row.userId);
  }
  return profiles;
}

export function googleGatewayIdentity(identity, profiles) {
  if(!validIdentity(identity)||identity.provider!=='google'||identity.userId!=='google:'+identity.subject)throw Error('Invalid Google identity');
  const existing=profiles.get(identity.email);
  if(existing&&(!identity.authoritative||!identity.email.endsWith('@gmail.com')))throw Error('Legacy profile ownership is unconfirmed');
  // The request proof, not this transport label, authenticates the gateway.
  return {...identity,provider:'google-gateway',userId:existing||identity.userId};
}
