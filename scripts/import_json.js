/**
 * JSONファイルからPostgreSQLにデータをインポートするスクリプト
 *
 * 使用方法: node scripts/import_json.js
 *
 * 前提条件:
 * - Docker Composeでpostgresコンテナが起動していること
 * - data/terms.json と data/edges.json が存在すること
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// プロジェクトルートを取得
const projectRoot = path.join(__dirname, '..');

// JSONファイルを読み込み
const termsPath = path.join(projectRoot, 'data', 'terms.json');
const edgesPath = path.join(projectRoot, 'data', 'edges.json');

const termsData = JSON.parse(fs.readFileSync(termsPath, 'utf8'));
const edgesData = JSON.parse(fs.readFileSync(edgesPath, 'utf8'));

console.log(`📖 ${termsData.terms.length} terms, ${edgesData.edges.length} edges を読み込みました`);

// SQLエスケープ関数
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

// termsのINSERT文を生成
function generateTermsInsert(terms) {
  const values = terms.map(t =>
    `(${t.id}, ${escapeSql(t.name)}, ${t.tier}, ${escapeSql(t.category)}, ${escapeSql(t.description)})`
  ).join(',\n');

  return `INSERT INTO terms (id, name, tier, category, description) VALUES\n${values};`;
}

// edgesのINSERT文を生成
function generateEdgesInsert(edges) {
  const values = edges.map(e =>
    `(${e.id}, ${e.term_a}, ${e.term_b}, ${escapeSql(e.difficulty)}, ${escapeSql(e.keyword)}, ${escapeSql(e.description)})`
  ).join(',\n');

  return `INSERT INTO edges (id, term_a, term_b, difficulty, keyword, description) VALUES\n${values};`;
}

// シーケンスのリセット
function generateSequenceReset(terms, edges) {
  const maxTermId = Math.max(...terms.map(t => t.id));
  const maxEdgeId = Math.max(...edges.map(e => e.id));

  return `
SELECT setval('terms_id_seq', ${maxTermId}, true);
SELECT setval('edges_id_seq', ${maxEdgeId}, true);
`;
}

// SQL生成
const termsSql = generateTermsInsert(termsData.terms);
const edgesSql = generateEdgesInsert(edgesData.edges);
const seqSql = generateSequenceReset(termsData.terms, edgesData.edges);

const fullSql = `
-- Terms
${termsSql}

-- Edges
${edgesSql}

-- Sequence reset
${seqSql}
`;

console.log('📝 SQLを生成しました');

// Docker経由でPostgreSQLに実行（標準入力でSQLを渡す）
try {
  execSync(
    `docker compose exec -T postgres psql -U histlink_user -d histlink`,
    {
      cwd: projectRoot,
      input: fullSql,
      encoding: 'utf8',
      stdio: ['pipe', 'inherit', 'inherit']
    }
  );
  console.log('✅ インポート完了');
} catch (error) {
  console.error('❌ インポート失敗:', error.message);
  process.exit(1);
}
