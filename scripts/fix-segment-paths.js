const fs = require("fs");
const path = require("path");

const outDir = path.join(process.cwd(), "out");
if (!fs.existsSync(outDir)) {
  console.log("No out directory; skipping.");
  process.exit(0);
}

const segmentDirs = [];
function findSegmentDirs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("__next.")) {
      segmentDirs.push(full);
    } else {
      findSegmentDirs(full);
    }
  }
}
findSegmentDirs(outDir);

// Process deepest first so nested segment dirs are handled before parents.
segmentDirs.sort((a, b) => b.length - a.length);

for (const segDir of segmentDirs) {
  if (!fs.existsSync(segDir)) continue;
  const parent = path.dirname(segDir);
  const dirName = path.basename(segDir);

  function walkFiles(d, rel) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walkFiles(full, rel ? rel + "/" + entry.name : entry.name);
      } else {
        const relPath = rel ? rel + "/" + entry.name : entry.name;
        const segments = [dirName, ...relPath.split(/[\\/]/)];
        const flatName = segments.join(".");
        const dest = path.join(parent, flatName);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        if (fs.existsSync(dest)) fs.rmSync(dest, { force: true });
        fs.renameSync(full, dest);
      }
    }
  }
  walkFiles(segDir, "");
  fs.rmSync(segDir, { recursive: true, force: true });
}

console.log(`Flattened ${segmentDirs.length} segment directories.`);
process.exit(0);
