const fs = require('fs');
const dataContent = fs.readFileSync('src/data/encyclopediaData.ts', 'utf8');
const curriculumContent = fs.readFileSync('src/data/encyclopediaCurriculum.ts', 'utf8');

const baseMatches = dataContent.match(/id: "[^"]+"/g) || [];
console.log('Base module id occurrences:', baseMatches.length);

const currMatches = curriculumContent.match(/id: "[^"]+"/g) || [];
console.log('Curriculum module id occurrences:', currMatches.length);

const baseIds = [...new Set(baseMatches.map(m => m.match(/id: "([^"]+)"/)[1]).filter((v,i,a) => a.indexOf(v)===i))];
console.log('Unique base IDs:', baseIds.length, baseIds);

const currIds = [...new Set(currMatches.map(m => m.match(/id: "([^"]+)"/)[1]).filter((v,i,a) => a.indexOf(v)===i))];
console.log('Unique curriculum IDs:', currIds.length, currIds);

const duplicates = baseIds.filter(id => currIds.includes(id));
console.log('Duplicate IDs:', duplicates);