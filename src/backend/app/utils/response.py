from typing import Any


def success_response(data: Any) -> dict[str, Any]:
    """Tạo response thành công theo chuẩn chung của API."""
    return {
        "success": True,
        "data": data,
        "error": None,
    }


def error_response(message: str) -> dict[str, Any]:
    """Tạo response lỗi theo chuẩn chung của API."""
    return {
        "success": False,
        "data": None,
        "error": message,
    }
