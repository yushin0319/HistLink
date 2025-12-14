"""
データキャッシュサービス

起動時にDBからterms/edgesを読み込み、メモリにキャッシュする。
DBアクセスなしでルート生成・ダミー生成が可能になる。
"""

from typing import Dict, List, Set, Optional
from dataclasses import dataclass
from sqlalchemy import text

from app.database import SessionLocal


@dataclass
class Term:
    """用語データ"""
    id: int
    name: str
    tier: int
    category: str
    description: str


@dataclass
class Edge:
    """エッジデータ"""
    id: int
    term_a: int
    term_b: int
    difficulty: str
    keyword: str
    description: str


class DataCache:
    """データキャッシュ（シングルトン）"""

    _instance: Optional['DataCache'] = None
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.terms: Dict[int, Term] = {}
        self.edges: List[Edge] = []

        # 高速検索用インデックス
        self._terms_by_tier: Dict[int, List[int]] = {}  # tier -> [term_ids]
        self._neighbors: Dict[int, Set[int]] = {}  # term_id -> {neighbor_ids}
        self._edges_by_term: Dict[int, List[Edge]] = {}  # term_id -> [edges]
        self._edge_map: Dict[tuple, Edge] = {}  # (min_id, max_id) -> edge

        self._initialized = True

    def load_from_db(self):
        """DBからデータを読み込む"""
        db = SessionLocal()
        try:
            # terms読み込み
            terms_result = db.execute(text("SELECT id, name, tier, category, description FROM terms"))
            for row in terms_result:
                term = Term(
                    id=row.id,
                    name=row.name,
                    tier=row.tier,
                    category=row.category,
                    description=row.description or ""
                )
                self.terms[term.id] = term

            # edges読み込み
            edges_result = db.execute(text("SELECT id, term_a, term_b, difficulty, keyword, description FROM edges"))
            for row in edges_result:
                edge = Edge(
                    id=row.id,
                    term_a=row.term_a,
                    term_b=row.term_b,
                    difficulty=row.difficulty,
                    keyword=row.keyword or "",
                    description=row.description or ""
                )
                self.edges.append(edge)

            # インデックス構築
            self._build_indexes()
        finally:
            db.close()

    def _build_indexes(self):
        """高速検索用インデックスを構築"""
        # terms_by_tier: tier -> [term_ids]
        self._terms_by_tier = {}
        for term_id, term in self.terms.items():
            if term.tier not in self._terms_by_tier:
                self._terms_by_tier[term.tier] = []
            self._terms_by_tier[term.tier].append(term_id)

        # neighbors: term_id -> {neighbor_ids}
        # edges_by_term: term_id -> [edges]
        # edge_map: (min_id, max_id) -> edge
        self._neighbors = {term_id: set() for term_id in self.terms}
        self._edges_by_term = {term_id: [] for term_id in self.terms}
        self._edge_map = {}

        for edge in self.edges:
            # 隣接関係（双方向）
            self._neighbors[edge.term_a].add(edge.term_b)
            self._neighbors[edge.term_b].add(edge.term_a)

            # term -> edges
            self._edges_by_term[edge.term_a].append(edge)
            self._edges_by_term[edge.term_b].append(edge)

            # (min, max) -> edge
            key = (min(edge.term_a, edge.term_b), max(edge.term_a, edge.term_b))
            self._edge_map[key] = edge

    def get_term(self, term_id: int) -> Optional[Term]:
        """用語を取得"""
        return self.terms.get(term_id)

    def get_terms_by_max_tier(self, max_tier: int) -> List[int]:
        """指定Tier以下の全用語IDを取得"""
        result = []
        for tier in range(1, max_tier + 1):
            result.extend(self._terms_by_tier.get(tier, []))
        return result

    def get_neighbors(self, term_id: int) -> Set[int]:
        """隣接ノード（1hop）を取得"""
        return self._neighbors.get(term_id, set())

    def get_edge(self, term_a: int, term_b: int) -> Optional[Edge]:
        """2つの用語間のエッジを取得"""
        key = (min(term_a, term_b), max(term_a, term_b))
        return self._edge_map.get(key)

    def get_edges_for_term(self, term_id: int) -> List[Edge]:
        """用語に接続するエッジ一覧を取得"""
        return self._edges_by_term.get(term_id, [])

    def get_neighbors_with_filter(
        self,
        term_id: int,
        max_tier: int,
        allowed_difficulties: List[str]
    ) -> List[int]:
        """
        フィルタ付きで隣接ノードを取得

        Args:
            term_id: 現在のノードID
            max_tier: 最大Tier
            allowed_difficulties: 許可されるエッジ難易度リスト

        Returns:
            条件を満たす隣接ノードIDリスト
        """
        result = []
        for edge in self._edges_by_term.get(term_id, []):
            # エッジ難易度チェック
            if edge.difficulty not in allowed_difficulties:
                continue

            # 隣接ノードを特定
            neighbor_id = edge.term_b if edge.term_a == term_id else edge.term_a

            # Tierチェック
            neighbor = self.terms.get(neighbor_id)
            if neighbor and neighbor.tier <= max_tier:
                result.append(neighbor_id)

        return result


# グローバルキャッシュインスタンス
_cache: Optional[DataCache] = None


def get_cache() -> DataCache:
    """キャッシュインスタンスを取得"""
    global _cache
    if _cache is None:
        _cache = DataCache()
        _cache.load_from_db()
    return _cache


def reset_cache():
    """キャッシュをリセット（テスト用）"""
    global _cache
    if _cache is not None:
        _cache._initialized = False
        _cache.terms = {}
        _cache.edges = []
        _cache._terms_by_tier = {}
        _cache._neighbors = {}
        _cache._edges_by_term = {}
        _cache._edge_map = {}
    _cache = None
