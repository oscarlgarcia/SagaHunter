# SagaHunter — Contexto de desarrollo

Este archivo carga en la memoria de opencode todo el estado actual del proyecto para continuar el desarrollo desde donde lo dejamos.

---

## Arquitectura del proyecto

```
SagaHunter/
└── saga-hunter/
    ├── docker-compose.yml          # Postgres (pgvector) + Redis + app
    ├── Dockerfile                  # Node + Python en un solo contenedor
    ├── entrypoint.sh               # Prisma db push + seed + supervisord
    ├── supervisord.conf            # Lanza orchestrator.py y next dev
    ├── .env                        # 5 vars de entorno (gitignored)
    ├── python/
    │   ├── requirements.txt
    │   ├── app/
    │   │   ├── orchestrator.py     # APScheduler, pipeline runner
    │   │   ├── llm_enrich.py       # LLM enrichment helper
    │   │   └── db.py               # Conexión PostgreSQL (psycopg2)
    │   ├── agents/
    │   │   ├── base.py             # BaseAgent con _already_enriched, _save_enrichment
    │   │   ├── mining/
    │   │   │   ├── news_aggregator.py
    │   │   │   ├── curiosity_engine.py
    │   │   │   └── trend_hunter.py
    │   │   ├── analysis/
    │   │   │   ├── angle_finder.py
    │   │   │   ├── story_structurer.py
    │   │   │   └── genre_classifier.py
    │   │   ├── creative/
    │   │   │   ├── character_harvester.py
    │   │   │   ├── voice_tone_tuner.py
    │   │   │   ├── what_if_generator.py
    │   │   │   └── world_builder.py
    │   │   └── publishing/
    │   │       ├── blurb_generator.py
    │   │       ├── series_connector.py
    │   │       └── plot_hole_detector.py
    └── web/
        ├── package.json
        ├── prisma/
        │   ├── schema.prisma
        │   └── seed.ts              # Feeds, agent_configs, pipeline connections
        └── src/
            ├── app/api/             # Next.js API routes
            └── components/          # React components
```

## Pipeline de agentes

```
MINING  →  ANALYSIS  →  CREATIVE  →  PUBLISHING

news_aggregator
curiosity_engine     →  angle_finder       →  what_if_generator    →  blurb_generator
trend_hunter            story_structurer       world_builder           series_connector
                        genre_classifier        character_harvester    plot_hole_detector
                                                voice_tuner
```

- El `orchestrator.py` programa agentes con `IntervalTrigger(minutes=N)` desde `agent_configs.params.interval_minutes`
- Cuando un mining agent termina, el orquestador recorre sus **conexiones de pipeline** en la tabla `pipeline_connections` y ejecuta el downstream agent inmediatamente
- Los downstream se ejecutan **sin importar** si el mining produjo seeds nuevas o no

## Bug corregido — Query de análisis de seeds

**Problema:** 9 agentes (analysis, creative, publishing) usaban:
```python
"SELECT id, raw_text, title, language FROM seeds ORDER BY discovered_at ASC LIMIT 20"
```
Esto solo procesaba los 20 seeds más viejos. Al llegar a 20+ seeds todos ya procesados, los nuevos quedaban fuera.

**Solución (commit `05f805a`):** Los 9 agentes ahora usan:
```python
f"SELECT s.id, s.raw_text, s.title, s.language FROM seeds s LEFT JOIN enrichments e ON e.seed_id = s.id AND e.agent_name = '{self.name}' WHERE e.id IS NULL ORDER BY s.discovered_at DESC"
```

**Archivos modificados:**
- `python/agents/analysis/angle_finder.py:17`
- `python/agents/analysis/story_structurer.py:98`
- `python/agents/analysis/genre_classifier.py:68`
- `python/agents/creative/character_harvester.py:260`
- `python/agents/creative/voice_tone_tuner.py:257`
- `python/agents/creative/what_if_generator.py:124`
- `python/agents/creative/world_builder.py:278`
- `python/agents/publishing/blurb_generator.py:287`
- `python/agents/publishing/plot_hole_detector.py:173`

El `series_connector.py` no tenía el bug (ya usaba `LEFT JOIN`).

El `_already_enriched()` en `BaseAgent` se mantiene como safety net (cache en memoria durante la vida del agente).

## Estado actual de los datos

- **Total seeds:** ~139
- **Total enrichments generados:** ~1,000+ (todos los agentes excepto mining corrieron sobre 119 seeds)
- **Seed de ejemplo:** `3154ea5d-592c-42e8-ae8c-fbbaedfbb6a4` — "Serena Williams to make singles comeback at Wimbledon"
  - Status: `discovered`, narrativeScore: 4
  - Tiene 9 enrichments: angle_finder, character_harvester, blurb_generator, plot_hole_detector, voice_tuner, what_if_generator, world_builder, genre_classifier, story_structurer
  - Enrichments son datos estructurados JSON (no LLM) guardados en tabla `enrichments`
  - No tiene `story` asociada

## Configuración

- **Postgres:** `localhost:5440`, db=`sagahunter`, user=`sagahunter`, pass=`sagahunter`
- **Redis:** `localhost:6381`
- **App:** `http://localhost:3080` (Next.js dev mode)
- **Ollama:** Se espera en `http://host.docker.internal:11434` (anfitrión del contenedor)
- **Schedule agents:** Cada 15 min por defecto (`news_aggregator` cada 5 min)

## Convenciones del código

- Python agents heredan de `BaseAgent` en `agents/base.py`
- Cada agente implementa `execute() -> AgentResult`
- Los resultados se guardan vía `self._save_enrichment(seed_id, self.name, result)`
- Las queries SQL se ejecutan con `execute(sql, params, fetch=True/False)` desde `app/db.py`
- No se usa ORM en Python — queries raw con `psycopg2`
- El frontend usa Prisma + Next.js. Los API routes son de tipo Route Handler (`app/api/*/route.ts`)
- Pipeline connections están en tabla `pipeline_connections` con columnas `trigger_agent` / `action_agent`

## Cómo correr en desarrollo

```bash
cd saga-hunter
docker compose up -d                     # Todo junto
docker compose logs -f saga-hunter       # Ver logs

# Solo BBDD (si trabajas fuera del contenedor)
docker compose up -d postgres redis

# Python directo (si tienes python3 + venv)
python3 -m venv venv
source venv/bin/activate
pip install -r python/requirements.txt
cd python && python -m app.orchestrator   # (ajustar DATABASE_URL a localhost:5440)
```
