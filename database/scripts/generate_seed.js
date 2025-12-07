const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const outputPath = path.join(__dirname, '..', 'seed.sql');

const termsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'terms.json'), 'utf8'));
const edgesData = JSON.parse(fs.readFileSync(path.join(dataDir, 'edges.json'), 'utf8'));

const escape = (s) => s ? s.replace(/'/g, "''") : '';

let sql = '-- HistLink Seed Data\n-- Generated from JSON files\n\n-- terms データ\n\n';

for (const t of termsData.terms) {
  sql += `INSERT INTO terms (id, name, tier, category, description) VALUES (${t.id}, '${escape(t.name)}', ${t.tier}, '${escape(t.category)}', '${escape(t.description || "")}');\n`;
}

sql += '\n-- edges データ\n\n';

for (const e of edgesData.edges) {
  const term_a = Math.min(e.term_a, e.term_b);
  const term_b = Math.max(e.term_a, e.term_b);
  sql += `INSERT INTO edges (id, term_a, term_b, difficulty, keyword, description) VALUES (${e.id}, ${term_a}, ${term_b}, '${e.difficulty}', '${escape(e.keyword || "")}', '${escape(e.description || "")}');\n`;
}

fs.writeFileSync(outputPath, sql);
console.log('Generated seed.sql');
console.log('  Terms:', termsData.terms.length);
console.log('  Edges:', edgesData.edges.length);
