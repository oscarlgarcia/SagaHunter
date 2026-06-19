# SagaHunter Roadmap

## Fase 0: Fundación ✅ COMPLETED
- docker-compose.yml con saga-hunter, postgres, redis, ollama
- Supervisord config (python + node en mismo contenedor)
- Next.js app con dashboard feed vacío
- Prisma schema migrado
- Agent Orchestrator esqueleto
- Auth básica

## Fase 1: Mining ✅ COMPLETED
- News Aggregator: RSS feeds + Newspaper3k + score
- Curiosity Engine: Wikipedia API + queries temáticas
- Trend Hunter: Reddit API + RSS
- Agent Builder: conectar Mining → guardar en BD

### Pendiente
- Dashboard en tiempo real (SSE infra existe, consumir en page.tsx)

## Fase 2: Analysis ✅ COMPLETED
- Find The Angle: clasificación de género + formato narrativo
- Story Structure Mapper: detección de estructuras
- Kindle Pre-Check: categorías Amazon (mock inicial)
- Kanban board funcional
- Modo Auto/Manual funcional

## Fase 3: Creative ✅ COMPLETED
- What If Generator
- World Builder
- Character Harvester
- Voice & Tone Tuner
- Seed Detail View con tabs de enrichments

## Fase 4: Publishing + Integración ✅ COMPLETED
- Blurb Generator
- Series Connector
- Plot Hole Detector
- API de exportación JSON (`/api/seeds/[id]/export`)
- SSE event stream + EventIndicator en layout

## Fase 5: Multi-language & Performance 🟡 IN PROGRESS

### Subfase 5a — i18n UI
- [ ] Instalar `next-intl` y activar plugin en `next.config.js`
- [ ] Refactorizar componentes para usar `useTranslations()` (nav, agents, feeds, seed detail, dashboard)
- [ ] Añadir selector de idioma en el layout

### Subfase 5b — Agentes multilingüe
- [ ] `voice_tone_tuner.py` — ✅ keywords FR/IT añadidos (mood, pacing, tense, register)
- [ ] `world_builder.py` — ⬜ añadir keywords FR/IT (setting types, geography, atmosphere, magic, factions)
- [ ] `character_harvester.py` — ⬜ añadir ROLE_MARKERS, PERSONALITY_TRAITS, ARC_TYPES, MOTIVATIONS en FR/IT
- [ ] `what_if_generator.py` — ⬜ templates FR/IT + genre keywords FR/IT
- [ ] `story_structurer.py` — ⬜ THREE_ACT_MARKERS y HERO_JOURNEY_MARKERS en FR/IT
- [ ] `blurb_generator.py` — ⬜ BLURB_TEMPLATES en FR/IT
- [ ] `angle_finder.py` — ⬜ usar el parámetro `language` que ya recibe con keywords FR/IT
- [ ] Tests `test_multilingual.py` — ✅ 24 tests covering FR/IT

### Subfase 5c — Performance
- [ ] Índices DB — ✅ añadidos en schema.prisma (seeds, enrichments, agent_configs, agent_run_logs)
- [ ] Singleton Prisma — ✅ migrado en todos los API routes y trpc
- [ ] Paginación cursor — ✅ en `/api/seeds`
- [ ] Caché de enrichments vía Redis (TTL por agente)
- [ ] Lazy loading en seed detail para seeds con 10+ enrichments

## Fase 6: Integración LLM ⬜ PENDING
- [ ] Implementar `llm_client.py` (Ollama / OpenAI-compatible)
- [ ] Modo híbrido: heurístico + LLM para agentes analysis/creative
- [ ] Agente "Story Critique" potenciado por LLM
- [ ] Resúmenes automáticos con LLM

## Fase 7: Pipeline & UX ⬜ PENDING
- [ ] UI para encadenar agentes (trigger → action)
- [ ] Historial de ejecuciones con timeline
- [ ] Notificaciones push/browser
- [ ] Modo oscuro
- [ ] Dashboard en tiempo real (consumir SSE)

---

## Progreso Actual

| Fase | Estado |
|------|--------|
| Fase 0 | ✅ |
| Fase 1 | ✅ (1 pendiente) |
| Fase 2 | ✅ |
| Fase 3 | ✅ |
| Fase 4 | ✅ |
| Fase 5a | ⬜ |
| Fase 5b | 🟡 Parcial (voice_tone_tuner + tests ✅) |
| Fase 5c | 🟡 Parcial (indexes, Prisma singleton, cursor pagination ✅) |
| Fase 6 | ⬜ |
| Fase 7 | ⬜ |

*Última actualización: Junio 2026*
