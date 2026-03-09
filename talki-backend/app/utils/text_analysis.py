"""Vietnamese filler-word detection and text analysis utilities."""

FILLER_WORDS = [
    "à", "ừ", "ờ", "uh", "um", "thì", "là", "mà", "thế",
    "kiểu như", "kiểu như là", "tức là", "thật ra", "kia mà",
    "bạn biết đó", "nói chung", "như kiểu", "ý tôi là",
]


def count_filler_words(text: str) -> dict[str, int]:
    """Return a dict of {filler_phrase: count} found in the text."""
    text_lower = text.lower()
    counts: dict[str, int] = {}
    for word in FILLER_WORDS:
        count = text_lower.count(word)
        if count:
            counts[word] = count
    return counts


def total_filler_count(text: str) -> int:
    return sum(count_filler_words(text).values())


def is_too_short(text: str, min_words: int = 5) -> bool:
    """Check if user response is too short (triggers AI follow-up)."""
    return len(text.split()) < min_words
