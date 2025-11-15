# HistLink 開発計画

## ゲーム概要

**HistLink（ヒストリンク）** - 歴史をつなごう

### コンセプト
1枚のカードから始まり、4枚の手札から正しい因果関係のカードを選んで連鎖を繋げていくゲーム。
自分で楽しむための歴史学習ツール兼ゲーム。

### ゲームルール
- 最初のカードが1枚場に出ている
- 手札4枚が表示される（正解1枚 + 不正解3枚）
- 正しいカードを選んで連鎖を繋げる
- ライフ3（3回まで間違えられる）
- 何枚繋げられるかハイスコアを目指す

### スコアリング
- 1枚繋ぐ: 100点
- コンボボーナス: 連続数 × 50点
- 時間ボーナス: 早く選ぶほど高得点

### ゲーム性の磨き（拡張機能）

#### ライフ回復システム
- **10連鎖達成でライフ+1**: 10枚連続で正解すると最大ライフを超えて+1（最大5まで）
- **20連鎖達成でライフ+1**: さらに10連鎖ごとに+1
- モチベーション維持と長時間プレイのご褒美

#### キーボード操作
- **1/2/3/4キー**: 選択肢を選択（マウス不要でサクサクプレイ）
- **Space**: 次へ進む（正解時の確認画面）
- **R**: リスタート（ゲームオーバー時）
- **Esc**: メニューへ戻る

**実装例:**
```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === '1') selectChoice(0);
    if (e.key === '2') selectChoice(1);
    if (e.key === '3') selectChoice(2);
    if (e.key === '4') selectChoice(3);
    if (e.key === ' ' && showFeedback) nextStep();
    if (e.key === 'r' && isGameOver) restartGame();
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [choices, showFeedback, isGameOver]);
```

#### セッション保存（オプション機能）
- **LocalStorage活用**: ゲーム途中で離脱しても再開可能
- **保存内容**: game_id, current_step, life, score, combo, history
- **自動保存**: 回答するたびに自動保存
- **復元**: リロード時に「前回の続きから再開しますか？」と表示

**実装例:**
```typescript
// 保存
const saveGameState = () => {
  localStorage.setItem('histlink_save', JSON.stringify({
    gameId,
    routeId,
    currentStep,
    life,
    score,
    combo,
    history,
    savedAt: Date.now(),
  }));
};

// 復元
const loadGameState = () => {
  const saved = localStorage.getItem('histlink_save');
  if (!saved) return null;

  const data = JSON.parse(saved);
  // 24時間以内のセーブデータのみ有効
  if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
    localStorage.removeItem('histlink_save');
    return null;
  }

  return data;
};
```

#### コンボ演出強化
- **5連鎖**: "Great!"メッセージ表示
- **10連鎖**: "Excellent!!" + 画面フラッシュ
- **15連鎖**: "Amazing!!!" + パーティクルエフェクト
- **20連鎖**: "LEGENDARY!!!!" + 虹色エフェクト

---

## 技術スタック

### フロントエンド
- **Vite** - ビルドツール
- **React** - UIフレームワーク
- **TypeScript** - 型安全性
- **MUI** - UIコンポーネントライブラリ
- **Vitest** - テストフレームワーク
- **React Testing Library** - コンポーネントテスト

### バックエンド
- **FastAPI** - PythonのAPIフレームワーク
- **PostgreSQL** - リレーショナルデータベース
- **SQLAlchemy** - ORM
- **pytest** - テストフレームワーク

### 開発手法
- **TDD (テスト駆動開発)**
  - テストファースト：実装前にテストを書く
  - Red → Green → Refactor のサイクル
  - バックエンド：pytest
  - フロントエンド：Vitest
  - 品質とリファクタリング容易性を重視

### テストカバレッジ目標
- **バックエンド**: 80%以上（pytest-cov）
- **フロントエンド**: 80%以上（Vitest coverage）
- **重要ロジック**: 100%（ルート生成、ダミー生成、スコアリング）

### プロパティベーステスト

重要なアルゴリズムには **property-based testing (hypothesis)** を導入し、ランダム入力でも不変条件が保たれることを検証。

#### ルート生成のプロパティテスト

```python
from hypothesis import given, strategies as st
import pytest

@given(
    start_term_id=st.integers(min_value=1, max_value=100),
    target_length=st.integers(min_value=5, max_value=20)
)
def test_route_generation_properties(start_term_id, target_length):
    """ルート生成が満たすべき不変条件"""
    route = generate_route(start_term_id, target_length)

    # Property 1: ルートは空でない
    assert len(route) > 0

    # Property 2: 開始ノードが正しい
    assert route[0] == start_term_id

    # Property 3: 全ノードがユニーク（ループなし）
    assert len(route) == len(set(route))

    # Property 4: 連続するノードは隣接している
    for i in range(len(route) - 1):
        current = route[i]
        next_node = route[i + 1]
        neighbors = get_neighbors(current)
        assert next_node in neighbors, f"{next_node} is not a neighbor of {current}"

    # Property 5: ルート長が目標に近い（±20%以内）
    if len(route) < target_length:
        # バックトラックで詰まった場合は許容
        assert len(route) >= target_length * 0.5
```

#### ダミー生成のプロパティテスト

```python
@given(
    correct_term_id=st.integers(min_value=1, max_value=100),
    visited_size=st.integers(min_value=0, max_value=30),
    difficulty=st.sampled_from(['easy', 'std', 'hard'])
)
def test_distractor_generation_properties(correct_term_id, visited_size, difficulty):
    """ダミー生成が満たすべき不変条件"""
    # visitedセットをランダム生成
    all_terms = list(range(1, 101))
    all_terms.remove(correct_term_id)
    visited = set(random.sample(all_terms, min(visited_size, len(all_terms))))

    correct_term = get_term(correct_term_id)
    distractors = generate_distractors(correct_term, visited, difficulty, count=3)

    # Property 1: ダミーは3個生成される（候補が十分あれば）
    if len(all_terms) - len(visited) >= 3:
        assert len(distractors) == 3

    # Property 2: ダミーはvisitedに含まれない
    for d in distractors:
        assert d.id not in visited

    # Property 3: ダミーは正解と異なる
    for d in distractors:
        assert d.id != correct_term_id

    # Property 4: ダミーは正解と2hop以上離れている（全難易度共通）
    correct_neighbors = set(get_neighbors(correct_term_id))
    for d in distractors:
        # 全難易度で直接繋がっていないことを確認
        assert d.id not in correct_neighbors

    # Property 5: ダミー間で重複なし
    assert len(distractors) == len(set(d.id for d in distractors))
```

#### BFS距離計算のプロパティテスト

```python
@given(
    start_term_id=st.integers(min_value=1, max_value=100)
)
def test_bfs_distances_properties(start_term_id):
    """BFS距離計算が満たすべき不変条件"""
    distances = calculate_bfs_distances(start_term_id)

    # Property 1: startからの距離は0
    assert distances[start_term_id] == 0

    # Property 2: 隣接ノードの距離は1
    neighbors = get_neighbors(start_term_id)
    for neighbor in neighbors:
        assert distances[neighbor] == 1

    # Property 3: 距離は非負整数
    for term_id, dist in distances.items():
        assert dist >= 0
        assert isinstance(dist, int)

    # Property 4: 三角不等式（u-v間距離 ≤ u-w距離 + w-v距離）
    for term_id in distances:
        for neighbor in get_neighbors(term_id):
            if neighbor in distances:
                assert abs(distances[term_id] - distances[neighbor]) <= 1
```

**導入メリット:**
- エッジケースの自動発見
- リファクタリング時の安全性向上
- 仕様の明確化（テストが仕様書になる）

---

## 段階的スケール計画

### Phase 1: MVP（1-2週間）
- **100語、300リレーション**（各語平均3リレーション）
- 基本ゲームシステム完成
- ルート生成アルゴリズム実装

### Phase 2: 拡張（将来）
- **500語、1500リレーション**（最終目標）
- データ拡充
- UI/UX改善

---

## データベース設計（事前ルート生成方式）

### 設計思想（GPT議論で決定）
- **プレイ中の再計算ゼロ**：ルートとダミーを事前生成
- **品質保証**：各ノード最低2リレーション保証
- **事故防止**：「実は正解と繋がってた」を防ぐ
- **ループ防止**：訪問済みノード再訪禁止

### テーブル構造（堅牢化版）

```sql
-- ENUM定義（データ健全性）
CREATE TYPE era_enum AS ENUM ('古代', '中世', '近世', '近代', '現代');
CREATE TYPE relation_enum AS ENUM ('因果', '契機', '対立', '政策', '文化', '同時代');
CREATE TYPE difficulty_enum AS ENUM ('easy', 'std', 'hard');

-- 用語テーブル
CREATE TABLE terms (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  era era_enum NOT NULL,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GIN索引（タグ検索の高速化）
CREATE INDEX idx_terms_tags ON terms USING GIN(tags);

-- リレーション（辺）テーブル
-- 無向グラフとして正規化（LEAST/GREATEST で重複・逆向き防止）
CREATE TABLE relations (
  id SERIAL PRIMARY KEY,
  src_id INT NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  dst_id INT NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  relation_type relation_enum NOT NULL,
  keyword TEXT,
  explanation TEXT,
  weight REAL DEFAULT 1.0,
  system_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- 自己ループ禁止
  CHECK (src_id != dst_id),
  -- 無向一意制約（重複・逆向き登録を根絶）
  CONSTRAINT uniq_rel_undirected UNIQUE (
    LEAST(src_id, dst_id),
    GREATEST(src_id, dst_id),
    relation_type
  )
);

-- インデックス
CREATE INDEX idx_relations_src ON relations(src_id);
CREATE INDEX idx_relations_dst ON relations(dst_id);
CREATE INDEX idx_relations_type ON relations(relation_type);

-- ルートテーブル（UUID採用）
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  start_term_id INT NOT NULL REFERENCES terms(id),
  length INT NOT NULL CHECK (length >= 2),
  difficulty difficulty_enum NOT NULL,
  relation_filter relation_enum[],
  seed INT,  -- 再現性のための乱数シード
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ルートステップ
CREATE TABLE route_steps (
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  step_no INT CHECK (step_no >= 0),
  term_id INT NOT NULL REFERENCES terms(id),
  from_relation_type relation_enum,
  PRIMARY KEY(route_id, step_no),
  -- 同一ルート内でノード重複禁止
  CONSTRAINT uniq_route_term UNIQUE (route_id, term_id)
);

-- 複合索引（step_no順でのスキャン高速化）
CREATE INDEX idx_route_steps_composite ON route_steps(route_id, step_no);

-- ダミー候補
CREATE TABLE route_distractors (
  route_id UUID,
  step_no INT,
  term_id INT NOT NULL REFERENCES terms(id),
  difficulty_hint TEXT,  -- 'easy', 'std', 'hard'（ダミーの難度）
  PRIMARY KEY(route_id, step_no, term_id),
  FOREIGN KEY (route_id, step_no) REFERENCES route_steps(route_id, step_no) ON DELETE CASCADE
);

-- 複合索引
CREATE INDEX idx_route_distractors_composite ON route_distractors(route_id, step_no);
```

### データ正規化トリガー（無向グラフ保証）

```sql
-- relations挿入時に自動的にsrc < dstに正規化
CREATE OR REPLACE FUNCTION normalize_relation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.src_id > NEW.dst_id THEN
    -- src_idとdst_idを入れ替え
    DECLARE
      temp INT;
    BEGIN
      temp := NEW.src_id;
      NEW.src_id := NEW.dst_id;
      NEW.dst_id := temp;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_normalize_relation
BEFORE INSERT OR UPDATE ON relations
FOR EACH ROW
EXECUTE FUNCTION normalize_relation();
```

### 便利ビュー

```sql
-- 用語の次数（degree）を確認するビュー
CREATE OR REPLACE VIEW v_term_degrees AS
SELECT
    t.id,
    t.name,
    t.era,
    COALESCE(COUNT(r.id), 0) AS degree
FROM terms t
LEFT JOIN relations r ON (r.src_id = t.id OR r.dst_id = t.id)
GROUP BY t.id, t.name, t.era
ORDER BY degree ASC, t.id ASC;

-- 次数2未満のノード（死に点）を検出するビュー
CREATE OR REPLACE VIEW v_dead_points AS
SELECT * FROM v_term_degrees WHERE degree < 2;

-- ルートの品質チェックビュー
CREATE OR REPLACE VIEW v_route_quality AS
SELECT
    r.id AS route_id,
    r.name AS route_name,
    r.length,
    r.difficulty,
    COUNT(DISTINCT rs.term_id) AS unique_terms,
    COUNT(DISTINCT rd.term_id) AS total_distractors,
    CASE
        WHEN COUNT(DISTINCT rs.term_id) = r.length THEN 'OK'
        ELSE 'NG'
    END AS uniqueness_check,
    CASE
        WHEN COUNT(DISTINCT rd.term_id) >= 3 * (r.length - 1) THEN 'OK'
        ELSE 'NG'
    END AS distractor_check
FROM routes r
LEFT JOIN route_steps rs ON rs.route_id = r.id
LEFT JOIN route_distractors rd ON rd.route_id = r.id
GROUP BY r.id, r.name, r.length, r.difficulty
ORDER BY r.id;
```

---

## ルート生成アルゴリズム（GPT議論ベース）

### 目標
- 各ノード **degree ≥ 2** （最低2リレーション）
- 長い経路を生成（ループ防止、前進優先）

### 戦略
1. **BFS距離前進**：startからの距離が増える方向を優先
2. **距離レイヤ固定**：dist_up優先。詰まったら同レイヤ1回だけ許可→それでもダメならバックトラック
3. **残余次数ソート**：未訪問近傍が多いノードへ進む（ただし上限あり）
4. **三角形ペナルティ強化**：直近3手との接続を強めに避ける（-3）
5. **バックトラック**：詰まったら1手戻る
6. **乱数の決定性**：seedをroutesテーブルに保存し、再現可能に

### スコアリング式（改良版）
```javascript
// 基本式
score = +2*(dist_up) + 1*(residual_deg_capped) - 3*(triangle_hit)

// 残余次数の上限（ハブノード対策）
residual_deg_capped = min(residual_deg, 5)

// ルート長の目標
target_length = 12〜18 (平均15)
```

### 実装上の工夫
- **同レイヤ移動**: dist_up == 0 でも、詰まる前に1回だけ許可
- **ハブ回避**: 残余次数が多すぎる（>5）ノードは三角形多発→上限設定
- **再現性**: random.seed(route.seed) で同じルートを再生成可能（テスト・デバッグが楽）

### アルゴリズム詳細

```python
def generate_route(start_term_id: int, target_length: int) -> List[int]:
    """
    ルート生成アルゴリズム

    Args:
        start_term_id: スタート用語ID
        target_length: 目標ルート長

    Returns:
        用語IDのリスト（ルート）
    """
    route = [start_term_id]
    visited = {start_term_id}
    bfs_distances = calculate_bfs_distances(start_term_id)

    while len(route) < target_length:
        current = route[-1]
        candidates = get_unvisited_neighbors(current, visited)

        if not candidates:
            # バックトラック
            if len(route) == 1:
                break  # スタート地点まで戻ったら終了
            route.pop()
            visited.remove(current)
            continue

        # スコアリング
        scored_candidates = []
        for candidate in candidates:
            dist_up = bfs_distances[candidate] - bfs_distances[current]
            residual_deg = count_unvisited_neighbors(candidate, visited)
            triangle_hit = count_triangle_hits(candidate, route[-3:])

            score = 2 * dist_up + 1 * residual_deg - 2 * triangle_hit
            scored_candidates.append((score, candidate))

        # 最高スコアの候補を選択
        scored_candidates.sort(reverse=True)
        next_term = scored_candidates[0][1]

        route.append(next_term)
        visited.add(next_term)

    return route


def calculate_bfs_distances(start_term_id: int) -> Dict[int, int]:
    """
    BFS（幅優先探索）でstartからの最短距離を計算

    Args:
        start_term_id: スタート用語ID

    Returns:
        {term_id: distance} の辞書
    """
    distances = {start_term_id: 0}
    queue = deque([start_term_id])

    while queue:
        current = queue.popleft()
        current_dist = distances[current]

        # 隣接ノードを取得（DBから relations テーブルを参照）
        neighbors = get_all_neighbors(current)

        for neighbor in neighbors:
            if neighbor not in distances:
                distances[neighbor] = current_dist + 1
                queue.append(neighbor)

    return distances


def get_unvisited_neighbors(term_id: int, visited: Set[int]) -> List[int]:
    """
    未訪問の隣接ノードを取得

    Args:
        term_id: 現在の用語ID
        visited: 訪問済みノードのセット

    Returns:
        未訪問の隣接ノードIDリスト
    """
    # DBから relations テーブルを参照
    neighbors = get_all_neighbors(term_id)
    return [n for n in neighbors if n not in visited]


def count_unvisited_neighbors(term_id: int, visited: Set[int]) -> int:
    """
    未訪問の隣接ノード数をカウント（残余次数）

    Args:
        term_id: 対象用語ID
        visited: 訪問済みノードのセット

    Returns:
        未訪問隣接ノード数
    """
    return len(get_unvisited_neighbors(term_id, visited))


def count_triangle_hits(candidate: int, recent_route: List[int]) -> int:
    """
    直近3ステップとの接続数をカウント（三角形ペナルティ）

    Args:
        candidate: 候補用語ID
        recent_route: 直近3ステップのルート（例: route[-3:]）

    Returns:
        接続数（0, 1, 2, or 3）
    """
    hits = 0
    candidate_neighbors = set(get_all_neighbors(candidate))

    for past_term in recent_route:
        if past_term in candidate_neighbors:
            hits += 1

    return hits
```

**バックトラック時のvisited管理:**

バックトラック時は `visited` から削除する。理由：
- 別のパスでそのノードに到達できる可能性があるため
- ただし、同一パス内での再訪問は禁止（`visited` で管理）

---

## ダミー生成戦略

### 基本方針
- **Position bias除去**: 選択肢4枚を毎回シャッフル（正解位置がランダムになる）
- **難度別ダミー**: easy / std / hard の3段階で生成
- **正解との接続確認**: ダミーが正解と繋がっていないことを保証

### 難度別生成ルール

#### Easy（簡単）
- **時代が異なる**: 正解が「近世」なら「古代」や「現代」から選ぶ
- **タグが全く重ならない**: 正解が["外交", "開国"]なら["文学", "宗教"]など
- **正解と2hop以上離れた**: グラフ上で距離2以上

**生成方法:**
```python
def generate_easy_distractors(correct_term, visited, count=3):
    # 1. 時代フィルタ
    candidates = [t for t in all_terms
                  if t.era != correct_term.era
                  and t.id not in visited]

    # 2. タグ重複除外
    correct_tags = set(correct_term.tags)
    candidates = [t for t in candidates
                  if not set(t.tags) & correct_tags]

    # 3. 距離2以上
    neighbors = get_neighbors(correct_term.id)
    second_neighbors = set()
    for n in neighbors:
        second_neighbors.update(get_neighbors(n))

    candidates = [t for t in candidates
                  if t.id not in neighbors
                  and t.id not in second_neighbors]

    return random.sample(candidates, count)
```

#### Standard（標準）
- **時代が1つ違い**: 正解が「近世」なら「中世」か「近代」
- **タグが1つだけ重なる**: 正解が["外交", "開国"]なら["外交", "戦争"]など
- **正解と2hop以上離れた**: 直接繋がっていない（グラフ上で距離2以上）

**生成方法:**
```python
def generate_std_distractors(correct_term, visited, count=3):
    # 1. 時代が±1
    era_order = ['古代', '中世', '近世', '近代', '現代']
    correct_idx = era_order.index(correct_term.era)
    adjacent_eras = [era_order[i] for i in [correct_idx-1, correct_idx+1]
                     if 0 <= i < len(era_order)]

    candidates = [t for t in all_terms
                  if t.era in adjacent_eras
                  and t.id not in visited]

    # 2. タグが1つだけ重なる（オプション）
    correct_tags = set(correct_term.tags)
    candidates = [t for t in candidates
                  if len(set(t.tags) & correct_tags) == 1]

    # 3. 2hop以上離れた（直接繋がっていない）
    neighbors = get_neighbors(correct_term.id)
    candidates = [t for t in candidates
                  if t.id not in neighbors]

    return random.sample(candidates, count)
```

#### Hard（難しい）
- **時代が同じ**: 正解と同じ時代
- **タグが2つ以上重なる**: 正解が["外交", "開国", "条約"]なら["外交", "条約", "戦争"]など
- **正解と2hop以上離れた**: 直接繋がっていない（同時代だが距離は離れている）

**生成方法:**
```python
def generate_hard_distractors(correct_term, visited, count=3):
    # 1. 同時代
    candidates = [t for t in all_terms
                  if t.era == correct_term.era
                  and t.id not in visited]

    # 2. タグが2つ以上重なる
    correct_tags = set(correct_term.tags)
    candidates = [t for t in candidates
                  if len(set(t.tags) & correct_tags) >= 2]

    # 3. 2hop以上離れた（直接繋がっていない）
    neighbors = get_neighbors(correct_term.id)
    candidates = [t for t in candidates
                  if t.id not in neighbors]

    return random.sample(candidates, count)
```

### データベース保存
生成したダミーは `route_distractors` テーブルに保存し、`difficulty_hint` カラムで難度を記録：

```sql
INSERT INTO route_distractors (route_id, step_no, term_id, difficulty_hint)
VALUES
  ('uuid-xxx', 1, 42, 'easy'),
  ('uuid-xxx', 1, 73, 'std'),
  ('uuid-xxx', 1, 55, 'hard');
```

---

## データソース

### Phase 1: 100語 + 300リレーション

#### 統計
- **総用語数**: 100
- **総リレーション数**: 300
- **平均リレーション数**: 3.0
- **橋渡しノード**: 30個（明治維新、関ヶ原の戦い、太平洋戦争など）
- **最小degree**: 2（全ノード保証）
- **最大degree**: 5（超橋渡しノード）

#### 時代別配分
- 古代（～平安）: 15語
- 中世（鎌倉～戦国）: 20語
- 近世（江戸）: 20語
- 近代（幕末～明治）: 25語
- 現代（大正～）: 20語

#### リレーションタイプ
- **因果**: A→Bの直接的原因
- **契機**: Aが引き金となってB
- **対立**: AとBが対立関係
- **政策**: Aという政策の結果B
- **文化**: Aという時代・人物の文化的成果B
- **同時代**: 同じ時代の関連事項

---

## データ作成・拡充パイプライン（Phase 2）

### CSV/JSON インポート機能

Phase 2でデータを500語・1500リレーションに拡大する際、手動INSERT文は非効率。CSVインポート機能を実装。

#### 用語CSVフォーマット
```csv
id,name,era,tags
101,平清盛,中世,"人物,武士,平安末期"
102,源頼朝,中世,"人物,武士,鎌倉"
103,承久の乱,中世,"内乱,幕府,朝廷"
```

#### リレーションCSVフォーマット
```csv
src_id,dst_id,relation_type,keyword,explanation
101,102,対立,源平合戦,平氏と源氏の覇権争い
102,103,因果,幕府と朝廷の対立,承久の乱の原因となった幕府の台頭
```

#### Pythonインポートスクリプト
```python
# backend/scripts/import_csv.py
import csv
from app.db import get_db
from app.models import Term, Relation

def import_terms(csv_path: str):
    """用語CSVをインポート"""
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        db = next(get_db())
        for row in reader:
            term = Term(
                id=int(row['id']),
                name=row['name'],
                era=row['era'],
                tags=row['tags'].split(',')
            )
            db.add(term)
        db.commit()
    print(f"Imported {reader.line_num - 1} terms")

def import_relations(csv_path: str):
    """リレーションCSVをインポート"""
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        db = next(get_db())
        for row in reader:
            relation = Relation(
                src_id=int(row['src_id']),
                dst_id=int(row['dst_id']),
                relation_type=row['relation_type'],
                keyword=row['keyword'],
                explanation=row['explanation']
            )
            db.add(relation)
        db.commit()
    print(f"Imported {reader.line_num - 1} relations")

if __name__ == '__main__':
    import_terms('data/terms_phase2.csv')
    import_relations('data/relations_phase2.csv')
```

### データ品質自動チェック（CI統合）

データ追加後、自動的に品質チェックを実行：

```bash
# database/scripts/check_and_report.sh
#!/bin/bash

echo "=== データ品質チェック ==="
psql $DATABASE_URL -f database/scripts/check_data_quality.sql

# pytestでもチェック
cd backend
pytest tests/test_data_quality.py -v

echo "=== チェック完了 ==="
```

GitHub Actionsに統合：
```yaml
# .github/workflows/data-quality-check.yml
name: Data Quality Check

on:
  push:
    paths:
      - 'data/**'
      - 'database/**'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup PostgreSQL
        run: |
          docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:15
          sleep 5
      - name: Run migrations
        run: psql -h localhost -U postgres -f database/migrations/001_create_tables.sql
      - name: Seed data
        run: psql -h localhost -U postgres -f database/migrations/002_seed_data.sql
      - name: Data quality check
        run: ./database/scripts/check_and_report.sh
```

### 管理UI（オプション・Phase 3）

将来的にはWebベースの管理UIを実装し、ブラウザ上でデータ編集可能に：

**機能:**
- 用語の追加・編集・削除
- リレーションの追加・編集・削除
- グラフ可視化（D3.js使用）
- データ品質レポート表示
- CSV一括インポート

**技術スタック:**
- **フロントエンド**: React Admin
- **バックエンド**: FastAPIの管理用エンドポイント追加
- **可視化**: D3.js force-directed graph

---

## 開発スケジュール

### Week 1: データ基盤
- [x] 日本史100語リスト作成
- [x] 300リレーション作成（各語平均3）
- [x] PostgreSQLマイグレーション作成
- [x] シードデータ作成
- [ ] PostgreSQL環境構築＆マイグレーション実行
- [ ] データ品質チェック（全ノードdegree≥2確認）

### Week 2: バックエンド（TDD）
- [ ] FastAPI + pytest環境セットアップ
  - pyproject.toml作成（FastAPI, pytest, SQLAlchemy）
  - ディレクトリ構成設計
  - DB接続設定
  - pytestセットアップ

- [ ] ルート生成アルゴリズムのテスト＆実装
  - BFS距離前進テスト
  - 残余次数ソートテスト
  - 三角形ペナルティテスト
  - バックトラックテスト
  - ループ防止テスト

- [ ] ダミー生成ロジックのテスト＆実装
  - 正解と繋がっていないこと確認
  - ダミー数≥3確認
  - 時代/タグの妥当性確認

- [ ] API（GET /routes/{id}/steps/{k}）のテスト＆実装
  - エンドポイント実装
  - レスポンス形式テスト

### Week 3: フロントエンド（TDD）
- [ ] Vite + React + Vitest環境セットアップ
  - Viteプロジェクト初期化
  - TypeScript設定
  - Vitest + React Testing Library設定
  - MUI導入

- [ ] カードコンポーネントのテスト＆実装
  - カード表示テスト
  - クリックイベントテスト
  - 選択状態テスト

- [ ] ゲームロジック（ライフ・スコア）のテスト＆実装
  - ライフ減少テスト
  - スコア加算テスト
  - コンボボーナステスト
  - ゲームオーバー判定テスト

- [ ] 4択選択UIのテスト＆実装
  - 4枚表示テスト
  - 正解選択時の挙動テスト
  - 不正解選択時の挙動テスト

### Week 4: 統合＆ポリッシュ
- [ ] フロント⇔バック接続
  - axios設定
  - API呼び出し実装
  - エラーハンドリング

- [ ] E2Eテスト
  - Playwright E2Eテスト
  - ゲーム開始～終了までの一連の流れ
  - 正解選択のシナリオ
  - 不正解選択のシナリオ
  - ゲームオーバーシナリオ

- [ ] アニメーション実装
  - カード出現アニメーション
  - 選択時アニメーション
  - 正解/不正解フィードバック

- [ ] デプロイ
  - バックエンド：Render / Railway
  - フロントエンド：Vercel / Netlify
  - DB：Supabase / Render Postgres
  - 環境変数設定

---

## API設計

### エンドポイント一覧

#### 1. `GET /routes`
利用可能なルート一覧を取得

**クエリパラメータ:**
- `difficulty`: easy | std | hard（オプション）

**レスポンス例:**
```json
{
  "routes": [
    {
      "id": 1,
      "name": "幕末維新の道",
      "start_term": "ペリー来航",
      "length": 10,
      "difficulty": "std"
    },
    {
      "id": 2,
      "name": "戦国統一の道",
      "start_term": "応仁の乱",
      "length": 12,
      "difficulty": "hard"
    }
  ]
}
```

#### 2. `POST /games/start`
新しいゲームを開始

**リクエストボディ:**
```json
{
  "route_id": 1
}
```

**レスポンス:**
```json
{
  "game_id": "uuid-xxxx-xxxx",
  "route_id": 1,
  "current_step": 0,
  "life": 3,
  "score": 0,
  "start_term": {
    "id": 52,
    "name": "ペリー来航",
    "era": "近世",
    "tags": ["外交", "開国"]
  }
}
```

#### 3. `GET /games/{game_id}`
ゲーム状態を取得

**レスポンス:**
```json
{
  "game_id": "uuid-xxxx-xxxx",
  "route_id": 1,
  "current_step": 3,
  "life": 2,
  "score": 450,
  "combo": 3,
  "history": [
    {"step": 0, "term_id": 52, "term_name": "ペリー来航"},
    {"step": 1, "term_id": 54, "term_name": "日米和親条約"},
    {"step": 2, "term_id": 55, "term_name": "日米修好通商条約"}
  ],
  "is_game_over": false
}
```

#### 4. `GET /games/{game_id}/choices`
次の手札4枚を取得

**レスポンス:**
```json
{
  "choices": [
    {
      "id": 56,
      "name": "井伊直弼",
      "era": "近代",
      "tags": ["人物", "幕末"]
    },
    {
      "id": 10,
      "name": "壬申の乱",
      "era": "古代",
      "tags": ["内乱", "権力闘争"]
    },
    {
      "id": 45,
      "name": "徳川吉宗",
      "era": "近世",
      "tags": ["人物", "改革者"]
    },
    {
      "id": 88,
      "name": "世界恐慌",
      "era": "現代",
      "tags": ["経済", "国際"]
    }
  ],
  "relation_hint": {
    "type": "因果",
    "keyword": "条約調印への反発"
  }
}
```

#### 5. `POST /games/{game_id}/answer`
回答を送信して正解/不正解を判定

**リクエストボディ:**
```json
{
  "term_id": 56,
  "answer_time_ms": 3500
}
```

**レスポンス（正解時）:**
```json
{
  "is_correct": true,
  "life": 2,
  "score": 600,
  "combo": 4,
  "earned_points": 150,
  "relation_explanation": {
    "type": "因果",
    "keyword": "条約調印への反発",
    "explanation": "井伊直弼が勅許なしで日米修好通商条約を調印したことへの反発"
  },
  "is_game_over": false
}
```

**レスポンス（不正解時）:**
```json
{
  "is_correct": false,
  "life": 1,
  "score": 600,
  "combo": 0,
  "correct_answer": {
    "id": 56,
    "name": "井伊直弼"
  },
  "relation_explanation": {
    "type": "因果",
    "keyword": "条約調印への反発",
    "explanation": "井伊直弼が勅許なしで日米修好通商条約を調印したことへの反発"
  },
  "is_game_over": false
}
```

**レスポンス（ゲームオーバー時）:**
```json
{
  "is_correct": false,
  "life": 0,
  "score": 600,
  "combo": 0,
  "is_game_over": true,
  "final_score": 600,
  "total_steps": 4
}
```

---

## 状態管理設計（フロントエンド）

### 状態管理ライブラリ
**Zustand** を採用

理由：
- Redux Toolkitより軽量
- Context APIよりパフォーマンス良好
- TypeScriptサポートが優秀
- ボイラープレート少ない

### ストア設計

```typescript
interface GameState {
  // ゲーム状態
  gameId: string | null;
  routeId: number | null;
  currentStep: number;
  life: number;
  score: number;
  combo: number;
  history: Array<{step: number; termId: number; termName: string}>;
  isGameOver: boolean;

  // 現在の選択肢
  choices: Term[];
  relationHint: RelationHint | null;

  // UI状態
  isLoading: boolean;
  error: string | null;

  // アクション
  startGame: (routeId: number) => Promise<void>;
  submitAnswer: (termId: number, answerTimeMs: number) => Promise<void>;
  loadChoices: () => Promise<void>;
  resetGame: () => void;
}
```

---

## エラーハンドリング戦略

### バックエンド（FastAPI）

#### グローバル例外ハンドラ
```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "予期しないエラーが発生しました"
        }
    )

class GameNotFoundError(Exception):
    pass

@app.exception_handler(GameNotFoundError)
async def game_not_found_handler(request: Request, exc: GameNotFoundError):
    return JSONResponse(
        status_code=404,
        content={
            "error": "game_not_found",
            "message": "ゲームが見つかりません"
        }
    )
```

#### カスタム例外
- `GameNotFoundError`: ゲームIDが存在しない
- `RouteNotFoundError`: ルートIDが存在しない
- `InvalidAnswerError`: 無効な回答
- `DataIntegrityError`: データ不整合

### フロントエンド（React）

#### Error Boundary
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // エラーログ送信
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

#### API エラーハンドリング
```typescript
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error, error.message, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new NetworkError('ネットワークエラーが発生しました');
  }
}
```

#### トーストUI
- MUI Snackbar を使用
- エラー時は赤、成功時は緑のトースト表示

---

## セキュリティ要件

### CORS設定
```python
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",  # 開発環境
    "https://histlink.example.com",  # 本番環境
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### 環境変数管理
- `.env` ファイルは `.gitignore` に追加
- 本番環境は環境変数で管理（Vercel, Render等）

**必要な環境変数:**
```bash
# バックエンド
DATABASE_URL=postgresql://user:pass@host:5432/histlink
SECRET_KEY=random-secret-key
ENVIRONMENT=development|production

# フロントエンド
VITE_API_BASE_URL=http://localhost:8000
```

### APIレート制限
- 本番環境では `slowapi` を使用
- 1IPあたり 100リクエスト/分

### API改ざん防止（オプション機能）

クライアント側での不正操作を防ぐため、**step_token** による検証を導入可能。

#### 仕組み
1. サーバーは各ステップごとに `step_token` を生成
2. クライアントは回答時にこのトークンを含めて送信
3. サーバーはトークンを検証し、正当な順序での回答かチェック

**step_token生成例:**
```python
import hmac
import hashlib

def generate_step_token(game_id: str, step_no: int, secret_key: str) -> str:
    """ステップトークン生成（HMAC-SHA256）"""
    message = f"{game_id}:{step_no}"
    token = hmac.new(
        secret_key.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return token[:16]  # 先頭16文字のみ使用

def verify_step_token(game_id: str, step_no: int, token: str, secret_key: str) -> bool:
    """ステップトークン検証"""
    expected = generate_step_token(game_id, step_no, secret_key)
    return hmac.compare_digest(expected, token)
```

**API変更:**

`GET /games/{game_id}/choices` レスポンスに `step_token` を追加:
```json
{
  "choices": [...],
  "relation_hint": {...},
  "step_token": "a3f5b2c1d4e6f7a8"
}
```

`POST /games/{game_id}/answer` リクエストに `step_token` を含める:
```json
{
  "term_id": 56,
  "answer_time_ms": 3500,
  "step_token": "a3f5b2c1d4e6f7a8"
}
```

**検証処理:**
```python
@app.post("/games/{game_id}/answer")
async def submit_answer(
    game_id: str,
    request: AnswerRequest,
    db: Session = Depends(get_db)
):
    # ステップトークン検証
    game = get_game(db, game_id)
    if not verify_step_token(game_id, game.current_step, request.step_token, SECRET_KEY):
        raise HTTPException(status_code=400, detail="Invalid step token")

    # 通常の回答処理...
```

**メリット:**
- 開発者ツールでの不正操作防止
- スコアの信頼性向上
- ランキングシステムを将来追加する際に必須

**デメリット:**
- 実装がやや複雑
- 単に楽しむだけなら不要

**結論:** Phase 1 では不要、Phase 2（ランキング追加時）で実装

---

## パフォーマンス要件

### API応答時間
- **GET /routes**: < 100ms
- **POST /games/start**: < 200ms
- **GET /games/{id}/choices**: < 150ms
- **POST /games/{id}/answer**: < 100ms

### データベース最適化
1. **インデックス作成済み**:
   - `relations(src_id)`
   - `relations(dst_id)`
   - `relations(relation_type)`

2. **クエリ最適化**:
   - N+1問題回避（SQLAlchemyのeager loading使用）
   - ルート生成時のBFSキャッシュ

3. **コネクションプール**:
   ```python
   engine = create_engine(
       DATABASE_URL,
       pool_size=10,
       max_overflow=20
   )
   ```

### フロントエンド最適化
- React.memoでコンポーネントメモ化
- useMemoでheavy計算をメモ化
- Code Splitting（React.lazy）

### Position Bias除去

**問題**: 人間は無意識に「正解は左上にある」などの位置バイアスを持つ。これを防ぐため、選択肢を毎回シャッフル。

**実装:**
```typescript
// GET /games/{id}/choices のレスポンス受信後、即座にシャッフル
const shuffleChoices = (choices: Term[]): Term[] => {
  const shuffled = [...choices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// コンポーネント内
const [choices, setChoices] = useState<Term[]>([]);

useEffect(() => {
  fetchChoices(gameId).then(data => {
    // サーバーからの選択肢をシャッフル
    setChoices(shuffleChoices(data.choices));
  });
}, [gameId]);
```

**効果:**
- 正解位置がランダムになり、パターン学習を防止
- より純粋な知識テストが可能

**注意点:**
- サーバー側でシャッフルしてもOKだが、クライアント側で再度シャッフルすることで二重保証
- テスト時はシャッフルを無効化するオプションを用意（`VITE_DISABLE_SHUFFLE=true`）

---

## CI/CD戦略

### GitHub Actions

**.github/workflows/test.yml**
```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: |
          cd backend
          pip install -e .[dev]
          pytest --cov --cov-report=xml
      - uses: codecov/codecov-action@v3

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: |
          cd frontend
          npm ci
          npm run test:coverage
      - uses: codecov/codecov-action@v3
```

**.github/workflows/deploy.yml**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # Render自動デプロイ（webhookトリガー）

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # Vercel自動デプロイ（Vercel CLIまたはGitHub Integration）
```

### デプロイ戦略
- **main ブランチ**: 本番環境に自動デプロイ
- **develop ブランチ**: ステージング環境に自動デプロイ
- **feature/* ブランチ**: プレビュー環境作成（Vercel）

---

## モニタリング・ロギング

### バックエンド
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

@app.post("/games/start")
async def start_game(route_id: int):
    logger.info(f"Game started with route_id={route_id}")
    # ...
```

### フロントエンド
- コンソールエラーをSentryに送信（本番環境）
- パフォーマンスメトリクス（Web Vitals）

---

## データ品質チェック

### 自動テストスクリプト

**database/scripts/check_data_quality.sql**
```sql
-- 1. 死に点チェック（degree < 2のノードがないこと）
SELECT
    COUNT(*) AS dead_points_count,
    CASE
        WHEN COUNT(*) = 0 THEN 'OK'
        ELSE 'NG'
    END AS status
FROM v_dead_points;

-- 2. 用語数チェック（100語）
SELECT
    COUNT(*) AS term_count,
    CASE
        WHEN COUNT(*) = 100 THEN 'OK'
        ELSE 'NG'
    END AS status
FROM terms;

-- 3. リレーション数チェック（300リレーション）
SELECT
    COUNT(*) AS relation_count,
    CASE
        WHEN COUNT(*) = 300 THEN 'OK'
        ELSE 'NG'
    END AS status
FROM relations;

-- 4. 孤立ノードチェック（どこにも繋がっていないノード）
SELECT
    t.id,
    t.name,
    'NG' AS status
FROM terms t
LEFT JOIN relations r ON (r.src_id = t.id OR r.dst_id = t.id)
WHERE r.id IS NULL;

-- 5. リレーションの有向性チェック（src_id != dst_id）
SELECT
    COUNT(*) AS self_loop_count,
    CASE
        WHEN COUNT(*) = 0 THEN 'OK'
        ELSE 'NG'
    END AS status
FROM relations
WHERE src_id = dst_id;
```

**pytest テスト:**
```python
# backend/tests/test_data_quality.py

def test_no_dead_points(db_session):
    """死に点（degree < 2）が存在しないこと"""
    dead_points = db_session.execute(
        text("SELECT COUNT(*) FROM v_dead_points")
    ).scalar()
    assert dead_points == 0, "死に点が存在します"

def test_term_count(db_session):
    """用語数が100であること"""
    count = db_session.execute(
        text("SELECT COUNT(*) FROM terms")
    ).scalar()
    assert count == 100, f"用語数が{count}です（期待値: 100）"

def test_relation_count(db_session):
    """リレーション数が300であること"""
    count = db_session.execute(
        text("SELECT COUNT(*) FROM relations")
    ).scalar()
    assert count == 300, f"リレーション数が{count}です（期待値: 300）"
```

---

## ディレクトリ構成（予定）

```
HistLink/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   │   ├── route_generator.py
│   │   │   └── distractor_generator.py
│   │   └── db/
│   ├── tests/
│   │   ├── test_route_generator.py
│   │   ├── test_distractor_generator.py
│   │   └── test_api.py
│   ├── pyproject.toml
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Card.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   └── ScoreBoard.tsx
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.tsx
│   ├── tests/
│   │   ├── components/
│   │   └── services/
│   ├── package.json
│   ├── vite.config.ts
│   └── vitest.config.ts
├── database/
│   ├── migrations/
│   │   ├── 001_create_tables.sql
│   │   └── 002_seed_data.sql
│   └── scripts/
├── data/
│   ├── 日本史100語厳選リスト.md
│   └── リレーション300.md
├── PLAN.md
└── README.md
```

---

## 開発方針

「作っててわくわくする」を大事に、楽しみながら開発する

- テストを書くことで安心してリファクタリング
- 小さく動くものを作って積み上げる
- コードの品質を保ちながら楽しく開発
