import services.llm_extractor as llm_extractor
import services.logic_analyzer as logic_analyzer


def _assert_strict_json_schema(response_format: dict) -> None:
    assert response_format["type"] == "json_schema"
    assert response_format["json_schema"]["strict"] is True
    assert "schema" in response_format["json_schema"]


def test_timeline_response_format_is_strict_json_schema() -> None:
    response_format = llm_extractor._build_structured_response_format()
    _assert_strict_json_schema(response_format)


def test_logic_response_format_is_strict_json_schema() -> None:
    response_format = logic_analyzer._build_structured_response_format()
    _assert_strict_json_schema(response_format)
