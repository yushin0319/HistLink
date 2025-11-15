"""Hypothesis (property-based testing) examples"""
from hypothesis import given
from hypothesis import strategies as st


@given(st.integers())
def test_addition_commutative(x):
    """Test that addition is commutative"""
    y = 5
    assert x + y == y + x


@given(st.lists(st.integers(), min_size=1))
def test_list_length_positive(lst):
    """Test that list length is always positive"""
    assert len(lst) > 0


@given(st.text(min_size=1, max_size=100))
def test_string_reversal(s):
    """Test that reversing a string twice gives original string"""
    assert s == s[::-1][::-1]


# Example of testing game logic constraints
@given(st.integers(min_value=0, max_value=100))
def test_term_id_range(term_id):
    """Test that term IDs are in valid range"""
    # In our database, we have 100 terms (IDs 1-100)
    assert 0 <= term_id <= 100
