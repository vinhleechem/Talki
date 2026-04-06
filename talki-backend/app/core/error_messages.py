"""Utilities for safe, user-facing error messages."""

from typing import Any


_SENSITIVE_HINTS = [
    "permission_denied",
    "api key",
    "leaked",
    "traceback",
    "stack",
    "exception",
    "gemini",
    "openai",
    "{'error'",
    '{"error"',
    "'status':",
    '"status":',
]


def _default_message(status_code: int) -> str:
    if status_code == 401:
        return "Bạn cần đăng nhập lại để tiếp tục."
    if status_code == 403:
        return "Bạn không có quyền thực hiện thao tác này."
    if status_code == 404:
        return "Không tìm thấy dữ liệu yêu cầu."
    if status_code == 402:
        return "Bạn không đủ năng lượng để thực hiện thao tác này."
    if status_code == 503:
        return "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau."
    if status_code >= 500:
        return "Có lỗi hệ thống. Vui lòng thử lại sau."
    return "Không thể xử lý yêu cầu. Vui lòng thử lại."


def to_public_error_message(detail: Any, status_code: int) -> str:
    """Convert raw exception detail to a safe message for clients."""
    if isinstance(detail, str):
        text = detail.strip()
    else:
        text = str(detail).strip() if detail is not None else ""

    if not text:
        return _default_message(status_code)

    lowered = text.lower()
    if any(hint in lowered for hint in _SENSITIVE_HINTS):
        return _default_message(status_code)

    # Remove attached raw payload blocks if present.
    for token in (" ({", " ({'", " ({\""):
        idx = text.find(token)
        if idx > 0:
            text = text[:idx].strip()
            break

    if len(text) > 220:
        return _default_message(status_code)

    return text
