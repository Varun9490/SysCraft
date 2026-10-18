const fs = require('fs');
let c = fs.readFileSync('src/data/encyclopediaCurriculum.ts', 'utf8');
// Inject missing fields after each 'relatedModuleIds' line within each module block.
// We find each occurrence of 'relatedModuleIds:' line and check if next lines contain interactiveVisual.
const lines = c.split('\n');
const out = [];
for (let i = 0; i < lines.length; i++) {
  out.push(lines[i]);
  if (lines[i].includes('relatedModuleIds:')) {
    // Check if interactiveVisual is already present in the next 5 lines
    let hasVisual = false;
    for (let j = 1; j <= 4 && (i + j) < lines.length; j++) {
      if (lines[i + j].includes('interactiveVisual')) hasVisual = true;
    }
    if (!hasVisual) {
      out.push('    interactiveVisual: "none",');
      out.push('    flashcards: [],');
      out.push('    quiz: [],');
      out.push('    keyNumbers: [],');
    }
  }
}
fs.writeFileSync('src/data/encyclopediaCurriculum.ts', out.join('\n'));
console.log('patched fields for', c.split('relatedModuleIds:').length - 1, 'modules');
