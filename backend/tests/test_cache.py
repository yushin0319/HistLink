"""キャッシュサービスのテスト"""
import pytest
from app.services.cache import get_cache, reset_cache, DataCache


class TestDataCache:
    """DataCacheクラスのテスト"""

    def test_singleton_pattern(self):
        """シングルトンパターンが正しく動作する"""
        cache1 = get_cache()
        cache2 = get_cache()
        assert cache1 is cache2

    def test_get_term(self):
        """用語を取得できる"""
        cache = get_cache()
        # 最初の用語を取得
        if cache.terms:
            first_id = next(iter(cache.terms.keys()))
            term = cache.get_term(first_id)
            assert term is not None
            assert term.id == first_id

    def test_get_term_not_found(self):
        """存在しない用語はNoneを返す"""
        cache = get_cache()
        term = cache.get_term(-99999)
        assert term is None

    def test_get_neighbors(self):
        """隣接ノードを取得できる"""
        cache = get_cache()
        if cache.terms:
            first_id = next(iter(cache.terms.keys()))
            neighbors = cache.get_neighbors(first_id)
            assert isinstance(neighbors, set)

    def test_get_edge(self):
        """エッジを取得できる"""
        cache = get_cache()
        if cache.edges:
            edge = cache.edges[0]
            found_edge = cache.get_edge(edge.term_a, edge.term_b)
            assert found_edge is not None
            assert found_edge.id == edge.id

    def test_get_edge_reverse_order(self):
        """エッジは順序を入れ替えても取得できる"""
        cache = get_cache()
        if cache.edges:
            edge = cache.edges[0]
            # 逆順で取得
            found_edge = cache.get_edge(edge.term_b, edge.term_a)
            assert found_edge is not None
            assert found_edge.id == edge.id

    def test_get_edge_not_found(self):
        """存在しないエッジはNoneを返す"""
        cache = get_cache()
        edge = cache.get_edge(-1, -2)
        assert edge is None

    def test_get_edges_for_term(self):
        """用語に接続するエッジ一覧を取得できる"""
        cache = get_cache()
        if cache.edges:
            edge = cache.edges[0]
            edges = cache.get_edges_for_term(edge.term_a)
            assert isinstance(edges, list)
            assert len(edges) > 0
            # 取得したエッジにterm_aが含まれている
            assert any(e.term_a == edge.term_a or e.term_b == edge.term_a for e in edges)

    def test_get_edges_for_term_not_found(self):
        """存在しない用語のエッジは空リスト"""
        cache = get_cache()
        edges = cache.get_edges_for_term(-99999)
        assert edges == []

    def test_get_terms_by_max_tier(self):
        """指定Tier以下の用語を取得できる"""
        cache = get_cache()
        tier1_terms = cache.get_terms_by_max_tier(1)
        tier2_terms = cache.get_terms_by_max_tier(2)

        # Tier2はTier1を含む
        assert len(tier2_terms) >= len(tier1_terms)

        # Tier1の用語は全てTier1
        for term_id in tier1_terms:
            term = cache.get_term(term_id)
            assert term.tier == 1

    def test_get_neighbors_with_filter(self):
        """フィルタ付きで隣接ノードを取得できる"""
        cache = get_cache()
        if cache.edges:
            edge = cache.edges[0]
            neighbors = cache.get_neighbors_with_filter(
                edge.term_a,
                max_tier=3,
                allowed_difficulties=['easy', 'normal', 'hard']
            )
            assert isinstance(neighbors, list)


class TestResetCache:
    """reset_cache関数のテスト"""

    def test_reset_cache(self):
        """キャッシュをリセットできる"""
        # まずキャッシュを取得
        cache1 = get_cache()
        original_terms_count = len(cache1.terms)

        # リセット
        reset_cache()

        # 再取得（DBから再読み込み）
        cache2 = get_cache()

        # 同じデータが読み込まれる
        assert len(cache2.terms) == original_terms_count

    def test_reset_cache_clears_data(self):
        """reset_cacheがデータをクリアする"""
        cache = get_cache()
        original_count = len(cache.terms)
        assert original_count > 0

        reset_cache()

        # リセット後、新しいキャッシュを取得
        new_cache = get_cache()
        assert len(new_cache.terms) == original_count
