FROM node:22-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    supervisor \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY python/requirements.txt ./python/requirements.txt
RUN python3 -m venv /venv && \
    /venv/bin/pip install --upgrade pip && \
    /venv/bin/pip install -r python/requirements.txt

ENV PATH="/venv/bin:$PATH"
ENV VIRTUAL_ENV="/venv"

COPY web/package.json ./web/
RUN cd web && npm install

COPY python/ python/
COPY web/ web/
COPY entrypoint.sh .
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

CMD ["/app/entrypoint.sh"]
