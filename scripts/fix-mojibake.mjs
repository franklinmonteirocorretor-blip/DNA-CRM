import fs from "node:fs";
import path from "node:path";

const roots = ["app", "lib"];
const extensions = new Set([".ts", ".tsx", ".css", ".md"]);
const skip = new Set([path.normalize("app/api/clients/[id]/route.ts")]);
const replacements = new Map([
  ["Ã§", "ç"], ["Ã£", "ã"], ["Ã¡", "á"], ["Ã©", "é"],
  ["Ã³", "ó"], ["Ãº", "ú"], ["Ã­", "í"], ["Ãª", "ê"],
  ["Ã´", "ô"], ["Ãµ", "õ"], ["Ã¢", "â"], ["Ã“", "Ó"],
  ["Ã‰", "É"], ["Ã‡", "Ç"], ["Â·", "·"], ["Âº", "º"],
  ["Âª", "ª"], ["â€”", "—"], ["â€“", "–"], ["â€¹", "‹"],
  ["â†’", "→"], ["ï¼‹", "＋"],
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

for (const file of roots.flatMap(walk)) {
  if (!extensions.has(path.extname(file)) || skip.has(path.normalize(file))) continue;
  let source = fs.readFileSync(file, "utf8");
  for (let pass = 0; pass < 4; pass += 1) {
    const previous = source;
    for (const [broken, fixed] of replacements) source = source.replaceAll(broken, fixed);
    if (source === previous) break;
  }
  fs.writeFileSync(file, source, "utf8");
}
