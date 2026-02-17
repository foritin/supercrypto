"""
Request Context 模块单元测试

测试 contextvars 的 request_id 传播机制：
- 默认值返回 "-"
- 设置后返回正确值
- reset 后恢复默认值

_Requirements: 3.3, 3.2_
"""

from src.context import get_request_id, request_id_var


class TestGetRequestId:
    """get_request_id() 函数测试"""

    def test_default_returns_dash(self):
        """默认情况下 get_request_id() 应返回 '-'"""
        assert get_request_id() == "-"

    def test_returns_set_value(self):
        """设置 request_id_var 后，get_request_id() 应返回设置的值"""
        token = request_id_var.set("test-request-id-123")
        try:
            assert get_request_id() == "test-request-id-123"
        finally:
            request_id_var.reset(token)

    def test_reset_restores_default(self):
        """reset 后 get_request_id() 应恢复默认值 '-'"""
        token = request_id_var.set("some-id")
        request_id_var.reset(token)
        assert get_request_id() == "-"

    def test_multiple_set_reset_cycles(self):
        """多次 set/reset 循环后仍能正确恢复默认值"""
        for i in range(3):
            token = request_id_var.set(f"id-{i}")
            assert get_request_id() == f"id-{i}"
            request_id_var.reset(token)
            assert get_request_id() == "-"

    def test_nested_set_reset(self):
        """嵌套 set/reset 应正确恢复到上一层的值"""
        token1 = request_id_var.set("outer-id")
        assert get_request_id() == "outer-id"

        token2 = request_id_var.set("inner-id")
        assert get_request_id() == "inner-id"

        request_id_var.reset(token2)
        assert get_request_id() == "outer-id"

        request_id_var.reset(token1)
        assert get_request_id() == "-"
