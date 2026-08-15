import "server-only";
import crypto from "node:crypto";
const secret=()=>process.env.CRM_SESSION_SECRET||"development-only-change-me";
export function createSession(){const payload=Buffer.from(JSON.stringify({sub:"franklin",exp:Date.now()+7*86400000})).toString("base64url");const signature=crypto.createHmac("sha256",secret()).update(payload).digest("base64url");return `${payload}.${signature}`}
export function verifyPassword(value:string){const expected=Buffer.from(process.env.CRM_PASSWORD||"monteiro-dev");const received=Buffer.from(value);return expected.length===received.length&&crypto.timingSafeEqual(expected,received)}
