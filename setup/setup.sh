#!/bin/bash
set -e

echo ""
echo "============================================"
echo "  SagaHunter - Setup completo"
echo "============================================"
echo ""

# ---------- Config ----------
REPO_URL="https://github.com/oscarlgarcia/SagaHunter.git"
BRANCH="master"
COMPOSE_FILE="saga-hunter/docker-compose.yml"
ENV_FILE="saga-hunter/.env"

# ---------- 1. Clonar repo ----------
if [ ! -d "SagaHunter" ]; then
    echo "[1/6] Clonando repositorio..."
    git clone --branch "$BRANCH" "$REPO_URL"
    echo "OK"
else
    echo "[1/6] Repositorio ya existe, actualizando..."
    cd SagaHunter
    git pull origin "$BRANCH"
    cd ..
    echo "OK"
fi

cd SagaHunter

# ---------- 2. Crear .env ----------
echo "[2/6] Creando .env..."
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" << 'EOF'
DATABASE_URL=postgresql://sagahunter:sagahunter@postgres:5432/sagahunter
REDIS_URL=redis://redis:6379/0
OLLAMA_URL=http://host.docker.internal:11434
LOG_LEVEL=INFO
AGENT_SCHEDULE_INTERVAL_MINUTES=15
EOF
    echo "Creado $ENV_FILE con valores por defecto"
else
    echo "Ya existe, se mantiene"
fi
echo "OK"

# ---------- 3. Colocar backup si existe ----------
echo "[3/6] Buscando backup de base de datos..."
BACKUP_FILE="../sagahunter_data.sql"
if [ -f "$BACKUP_FILE" ]; then
    echo "Backup encontrado: $BACKUP_FILE"
    cp "$BACKUP_FILE" ./
    echo "Copiado a ./sagahunter_data.sql"
else
    echo "No se encontró backup. Se usará BD limpia (seed por defecto)."
fi
echo "OK"

# ---------- 4. Arrancar Postgres + Redis ----------
echo "[4/6] Arrancando Postgres y Redis..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis

echo "Esperando a que Postgres esté listo..."
until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U sagahunter 2>/dev/null; do
    sleep 2
done
echo "Postgres listo."
echo "OK"

# ---------- 5. Restaurar datos ----------
echo "[5/6] Restaurando datos..."

if [ -f "sagahunter_data.sql" ]; then
    echo "Restaurando datos desde backup..."
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U sagahunter sagahunter < sagahunter_data.sql
    echo "Datos restaurados correctamente"
else
    echo "Ejecutando seed inicial (feeds, agent_configs, pipelines)..."
    docker compose -f "$COMPOSE_FILE" run --rm saga-hunter sh -c "cd /app/web && npx prisma db seed"
    echo "Seed completado"
fi
echo "OK"

# ---------- 6. Build y arranque completo ----------
echo "[6/6] Construyendo imagen y arrancando todos los servicios..."
docker compose -f "$COMPOSE_FILE" build saga-hunter
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "============================================"
echo "  SagaHunter listo!"
echo "  Accede en: http://localhost:3080"
echo "============================================"
echo ""

docker compose -f "$COMPOSE_FILE" logs -f saga-hunter
