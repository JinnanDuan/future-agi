import io

import pytest

from model_hub.utils.file_reader import FileProcessor


@pytest.mark.unit
class TestReadCsvSmartQuotes:
    """Tests for CSV parsing with smart/curly quotes (TH-3546)."""

    def _make_file(self, content: str) -> io.BytesIO:
        """Create a file-like object from string content."""
        f = io.BytesIO(content.encode("utf-8"))
        f.name = "test.csv"
        return f

    def test_csv_with_straight_quotes(self):
        """Standard CSV with straight quotes should parse correctly."""
        csv = (
            "user_message,bot_response\n"
            'Hello,"I hear you, friend."\n'
            'How are you?,"I am fine, thanks."\n'
        )
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert list(df.columns) == ["user_message", "bot_response"]
        assert len(df) == 2
        assert df.iloc[0]["bot_response"] == "I hear you, friend."

    def test_csv_with_smart_quotes(self):
        """CSV with smart/curly quotes should parse correctly (TH-3546)."""
        csv = (
            "user_message,bot_response\n"
            "Hello,\u201cI hear you, friend.\u201d\n"
            "How are you?,\u201cI am fine, thanks.\u201d\n"
        )
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert list(df.columns) == ["user_message", "bot_response"]
        assert len(df) == 2
        # Smart quotes should be normalised to straight quotes in content
        assert df.iloc[0]["bot_response"] == "I hear you, friend."

    def test_csv_with_low9_quotes(self):
        """CSV with low-9 double quotes (\u201e) should parse correctly."""
        csv = "col_a,col_b\n" "foo,\u201ebar, baz\u201d\n"
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert list(df.columns) == ["col_a", "col_b"]
        assert df.iloc[0]["col_b"] == "bar, baz"

    def test_csv_without_commas_in_values(self):
        """CSV without commas in values should parse correctly regardless of quotes."""
        csv = "user_message,bot_response\n" "Hello,World\n" "Foo,Bar\n"
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert list(df.columns) == ["user_message", "bot_response"]
        assert len(df) == 2

    def test_csv_mixed_quoted_unquoted(self):
        """CSV with mix of quoted and unquoted fields should work."""
        csv = (
            "user_message,bot_response\n"
            "Hello,No commas here\n"
            'Question?,"Answer with, commas"\n'
        )
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert len(df) == 2
        assert df.iloc[0]["bot_response"] == "No commas here"
        assert df.iloc[1]["bot_response"] == "Answer with, commas"

    def test_csv_smart_quotes_multi_column(self):
        """CSV with smart quotes across multiple columns."""
        csv = "a,b,c\n" "\u201cfoo, bar\u201d,\u201cbaz, qux\u201d,plain\n"
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert list(df.columns) == ["a", "b", "c"]
        assert df.iloc[0]["a"] == "foo, bar"
        assert df.iloc[0]["b"] == "baz, qux"
        assert df.iloc[0]["c"] == "plain"

    def test_csv_underscore_headers_with_smart_quotes(self):
        """Underscore headers + smart quotes should not confuse Sniffer (TH-3546).

        The Sniffer can misdetect the delimiter (e.g. 'o') when smart quotes
        break normal quoting recognition and underscored header names skew
        character frequency patterns.
        """
        csv = (
            "user_message,bot_response\n"
            "I've been feeling stressed at work lately. How do I manage it?,"
            "\u201cI hear you, Suhani. Want to share a bit more about what's been going on?\u201d\n"
            "What is anxiety?,"
            "Anxiety is a feeling of worry or fear. It can come up when we face stress.\n"
            "What are some breathing exercises I can do when I feel overwhelmed?,"
            "\u201cI can't share specific exercises, but I can support you.\u201d\n"
        )
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert list(df.columns) == ["user_message", "bot_response"]
        assert len(df) == 3
        assert "Suhani" in df.iloc[0]["bot_response"]

    def test_csv_underscore_headers_without_smart_quotes(self):
        """Underscore headers with straight quotes should work normally."""
        csv = (
            "user_message,bot_response\n"
            'Hello world?,"I hear you, friend. How are you doing?"\n'
            "Simple question,Simple answer with no commas\n"
        )
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert list(df.columns) == ["user_message", "bot_response"]
        assert len(df) == 2
        assert df.iloc[0]["bot_response"] == "I hear you, friend. How are you doing?"

    def test_csv_underscore_headers_straight_quotes_realistic(self):
        """Realistic CSV matching the ticket data but with straight quotes.

        Ensures underscore headers (user_message, bot_response) with properly
        quoted comma-containing values parse into the correct two columns.
        """
        csv = (
            "user_message,bot_response\n"
            "I've been feeling stressed at work lately. How do I manage it?,"
            '"I hear you, Suhani. Want to share a bit more about what\'s been going on?"\n'
            "What is anxiety?,"
            "Anxiety is a feeling of worry or fear. It can come up when we face stress.\n"
            "What are some breathing exercises I can do when I feel overwhelmed?,"
            '"I can\'t share specific exercises, but I can support you in finding a calming way to breathe."\n'
            "How does cognitive behavioral therapy work?,"
            '"I\'m not a therapist, but I can offer some gentle support. CBT focuses on how our thoughts affect our feelings and actions."\n'
            "I've been feeling a bit low lately. Any tips to boost my mood?,"
            '"It sounds like you\'ve been going through a tough time. One small thing we could try is making a gratitude list."\n'
        )
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert list(df.columns) == ["user_message", "bot_response"]
        assert len(df) == 5
        assert "Suhani" in df.iloc[0]["bot_response"]
        # Unquoted row without commas should also parse fine
        assert df.iloc[1]["bot_response"].startswith("Anxiety is a feeling")

    def test_csv_many_underscore_headers_straight_quotes(self):
        """Multiple underscore headers with straight-quoted values."""
        csv = (
            "first_name,last_name,user_message,bot_response,created_at\n"
            'John,Doe,Hello,"I hear you, friend.",2024-01-01\n'
            'Jane,Smith,Hi,"Sure, I can help.",2024-01-02\n'
        )
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert list(df.columns) == [
            "first_name",
            "last_name",
            "user_message",
            "bot_response",
            "created_at",
        ]
        assert len(df) == 2
        assert df.iloc[0]["bot_response"] == "I hear you, friend."
        assert df.iloc[1]["bot_response"] == "Sure, I can help."

    def test_csv_many_underscore_headers_with_smart_quotes(self):
        """Multiple underscore headers with smart-quoted values."""
        csv = (
            "first_name,last_name,user_message,bot_response\n"
            "John,Doe,Hi there,"
            "\u201cHello, John. How can I help you today?\u201d\n"
            "Jane,Smith,Question?,"
            "\u201cSure, I can help with that.\u201d\n"
        )
        df, err = FileProcessor.process_file(self._make_file(csv))
        assert err is None
        assert list(df.columns) == [
            "first_name",
            "last_name",
            "user_message",
            "bot_response",
        ]
        assert len(df) == 2
        assert df.iloc[0]["first_name"] == "John"
        assert df.iloc[0]["bot_response"] == "Hello, John. How can I help you today?"
