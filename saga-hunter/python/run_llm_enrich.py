import sys
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

if len(sys.argv) < 2:
    print("Usage: python run_llm_enrich.py <enrichment_id>", file=sys.stderr)
    sys.exit(1)

enrichment_id = sys.argv[1]
sys.path.insert(0, "/app/python")

from app.llm_enrich import run_llm_enrichment
run_llm_enrichment(enrichment_id)
