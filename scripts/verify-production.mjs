import { readFile } from "node:fs/promises";

const baseUrl = process.argv[2] || "https://monteiro-crm.vercel.app";
const env = await readFile(".env.local", "utf8");
const passwordMatch = env.match(/^CRM_PASSWORD=(.*)$/m);
const emailMatch = env.match(/^CRM_EMAIL=(.*)$/m);

if (!passwordMatch) throw new Error("CRM_PASSWORD ausente em .env.local");
if (!emailMatch) throw new Error("CRM_EMAIL ausente em .env.local");

const password = passwordMatch[1].trim().replace(/^['"]|['"]$/g, "");
const email = emailMatch[1].trim().replace(/^['"]|['"]$/g, "");
const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password }),
});

if (!login.ok) throw new Error(`Login falhou: HTTP ${login.status}`);

const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Cookie de sessão não recebido");

const catalog = await fetch(`${baseUrl}/api/catalog`, { headers: { cookie } });
const payload = await catalog.json();

if (!catalog.ok)
  throw new Error(
    `Catálogo falhou: HTTP ${catalog.status} (${String(payload?.error || "sem detalhe")})`,
  );
if (!Array.isArray(payload)) {
  throw new Error("Catálogo retornou estrutura inválida");
}

const projects = payload.reduce(
  (total, builder) =>
    total + (Array.isArray(builder.projects) ? builder.projects.length : 0),
  0,
);

const logout = await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { cookie },
});
if (!logout.ok) throw new Error(`Logout falhou: HTTP ${logout.status}`);
const clearedCookie = logout.headers.get("set-cookie") || "";
if (!/monteiro_session=;/.test(clearedCookie) || !/Max-Age=0/i.test(clearedCookie)) {
  throw new Error("Logout não removeu o cookie de sessão");
}

console.log(
  JSON.stringify({
    ok: true,
    login: login.status,
    logout: logout.status,
    catalog: catalog.status,
    builders: payload.length,
    projects,
  }),
);
