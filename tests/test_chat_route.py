from main import app


def test_chat_route_registered() -> None:
    paths = {route.path for route in app.routes}
    assert "/chat" in paths
