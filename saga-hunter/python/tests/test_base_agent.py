from unittest.mock import patch
from agents.base import BaseAgent, AgentResult


class SimpleAgent(BaseAgent):
    name = "test_agent"
    description = "An agent for testing"

    def execute(self) -> AgentResult:
        return AgentResult(success=True, message="test", seeds_created=1)


def test_agent_name():
    agent = SimpleAgent()
    assert agent.name == "test_agent"


def test_agent_description():
    agent = SimpleAgent()
    assert agent.description == "An agent for testing"


def test_agent_execute():
    agent = SimpleAgent()
    result = agent.execute()
    assert result.success is True
    assert result.seeds_created == 1


def test_save_enrichment():
    agent = SimpleAgent()
    with (
        patch("agents.base.execute") as mock_execute,
        patch("agents.base.publish_event") as mock_publish,
    ):
        agent._save_enrichment("seed-1", "test_agent", {"genre": "mystery"})

    mock_execute.assert_called_once()
    args, _ = mock_execute.call_args
    assert "enrichments" in args[0]
    assert "seed-1" in args[1]
    assert "test_agent" in args[1]
    mock_publish.assert_called_once_with("enrichment:new", "test_agent enriched seed seed-1")
