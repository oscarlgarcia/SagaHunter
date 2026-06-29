import sys
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

if len(sys.argv) < 2:
    print("Usage: python run_agent.py <agent_name>", file=sys.stderr)
    sys.exit(1)

agent_name = sys.argv[1]
sys.path.insert(0, "/app/python")

from app.orchestrator import run_agent_once
run_agent_once(agent_name)
