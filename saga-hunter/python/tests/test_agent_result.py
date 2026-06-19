from agents.base import AgentResult


def test_agent_result_defaults():
    r = AgentResult(success=True)
    assert r.success is True
    assert r.message == ""
    assert r.seeds_created == 0


def test_agent_result_full():
    r = AgentResult(success=True, message="ok", seeds_created=5)
    assert r.success is True
    assert r.message == "ok"
    assert r.seeds_created == 5


def test_agent_result_failure():
    r = AgentResult(success=False, message="error")
    assert r.success is False
    assert r.message == "error"
    assert r.seeds_created == 0
