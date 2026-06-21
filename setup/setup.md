# SagaHunter — Migración a nueva máquina

## Requisitos

- Docker + Docker Compose
- Git
- Bash

## 1. En la máquina ORIGEN — exportar base de datos

```bash
cd saga-hunter
docker compose exec postgres pg_dump -U sagahunter --data-only sagahunter > ../sagahunter_data.sql
```

Esto genera `sagahunter_data.sql` (~8 MB) con todos los seeds, enrichments y stories.

**Archivos a transferir a la máquina destino:**

| Archivo | Descripción |
|---|---|
| `sagahunter_data.sql` | Backup de la BD (solo datos) |
| `.env` | Variables de entorno (opcional, setup.sh lo crea) |

## 2. En la máquina DESTINO — setup automático

Copia los archivos en la misma carpeta donde clonarás el repo:

```
~/proyectos/
├── setup.sh             # ← script de setup
├── sagahunter_data.sql  # ← backup de BD (opcional)
└── .env                 # ← env vars (opcional)
```

Ejecuta:

```bash
bash setup/setup.sh
```

O paso a paso manual:

```bash
# Clonar
git clone https://github.com/oscarlgarcia/SagaHunter.git
cd SagaHunter

# Crear .env
cat > saga-hunter/.env << 'EOF'
DATABASE_URL=postgresql://sagahunter:sagahunter@postgres:5432/sagahunter
REDIS_URL=redis://redis:6379/0
OLLAMA_URL=http://host.docker.internal:11434
LOG_LEVEL=INFO
AGENT_SCHEDULE_INTERVAL_MINUTES=15
EOF

# Arrancar BBDD
cd saga-hunter
docker compose up -d postgres redis

# Esperar a Postgres
sleep 5
docker compose exec postgres pg_isready -U sagahunter

# Restaurar datos (si hay backup)
docker compose exec -T postgres psql -U sagahunter sagahunter < ../sagahunter_data.sql

# Construir y arrancar todo
docker compose build saga-hunter
docker compose up -d

# Ver logs
docker compose logs -f saga-hunter
```

## Arriba

La aplicación queda accesible en **http://localhost:3080**

- `entrypoint.sh` ya corre `prisma db push` (schema) + `prisma db seed` (config inicial: feeds, agent_configs, pipelines)
- El backup con `--data-only` restaura solo datos (seeds, enrichments, stories) sin tocar el schema
- Sin backup, la app arranca con datos de ejemplo del seed
