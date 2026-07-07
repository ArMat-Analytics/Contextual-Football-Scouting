"""Tests for H4 similarity functions (H4_Player_Similarity/src/similarity.py).

Tests the pure scoring / distance functions and the money parser.
Does not test load_dna() or build() which require the full CSV data.
"""
import numpy as np
import pytest

from H4_Player_Similarity.src.similarity import (
    similarity_score,
    _parse_money,
    _distances,
)


# ── similarity_score ───────────────────────────────────────────────────────

class TestSimilarityScore:
    def test_identical_vectors(self):
        """Distance = 0 → score = 100."""
        assert similarity_score(np.array([0.0]), n_axes=11)[0] == pytest.approx(100.0)

    def test_max_distance(self):
        """Distance = sqrt(n_axes) * 100 → score = 0."""
        d_max = np.sqrt(11) * 100.0
        assert similarity_score(np.array([d_max]), n_axes=11)[0] == pytest.approx(0.0)

    def test_half_distance(self):
        """Distance = half of max → score = 50."""
        d_half = np.sqrt(11) * 100.0 / 2.0
        assert similarity_score(np.array([d_half]), n_axes=11)[0] == pytest.approx(50.0)

    def test_vectorised(self):
        dists = np.array([0.0, np.sqrt(11) * 50.0, np.sqrt(11) * 100.0])
        scores = similarity_score(dists, n_axes=11)
        assert scores.shape == (3,)
        assert scores[0] > scores[1] > scores[2]


# ── _parse_money ───────────────────────────────────────────────────────────

class TestParseMoney:
    def test_millions_dot_decimal(self):
        assert _parse_money("€80.00M") == pytest.approx(80_000_000.0)

    def test_millions_comma_decimal(self):
        assert _parse_money("€18,00M") == pytest.approx(18_000_000.0)

    def test_thousands(self):
        assert _parse_money("€300,00K") == pytest.approx(300_000.0)

    def test_no_suffix(self):
        """Plain numeric string with currency symbol."""
        assert _parse_money("€500") == pytest.approx(500.0)

    def test_non_string_returns_nan(self):
        assert np.isnan(_parse_money(None))
        assert np.isnan(_parse_money(42))

    def test_empty_string(self):
        assert np.isnan(_parse_money(""))

    def test_complex_format(self):
        """'€1.50M' → 1,500,000."""
        assert _parse_money("€1.50M") == pytest.approx(1_500_000.0)


# ── _distances (euclidean) ─────────────────────────────────────────────────

class TestDistances:
    def test_euclidean_zero(self):
        mat = np.array([[1.0, 2.0, 3.0]])
        vec = np.array([1.0, 2.0, 3.0])
        d = _distances(mat, vec, "euclidean")
        assert d[0] == pytest.approx(0.0)

    def test_euclidean_known(self):
        """Distance from (0,0,0) to (3,4,0) = 5."""
        mat = np.array([[3.0, 4.0, 0.0]])
        vec = np.array([0.0, 0.0, 0.0])
        d = _distances(mat, vec, "euclidean")
        assert d[0] == pytest.approx(5.0)

    def test_cosine_identical(self):
        """Cosine distance between identical vectors = 0."""
        mat = np.array([[1.0, 2.0, 3.0]])
        vec = np.array([1.0, 2.0, 3.0])
        d = _distances(mat, vec, "cosine")
        assert d[0] == pytest.approx(0.0, abs=1e-6)

    def test_unknown_metric_raises(self):
        with pytest.raises(ValueError, match="unknown metric"):
            _distances(np.array([[1, 2]]), np.array([1, 2]), "manhattan")
