import os
import importlib
import app.config


def test_settings_reads_database_url_from_env(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost:9999/test")
    importlib.reload(app.config)
    from app.config import settings
    assert settings.DATABASE_URL == "postgresql://test:test@localhost:9999/test"


def test_settings_reads_redis_url_from_env(monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://test:6379/1")
    importlib.reload(app.config)
    from app.config import settings
    assert settings.REDIS_URL == "redis://test:6379/1"


def test_settings_reads_ollama_url_from_env(monkeypatch):
    monkeypatch.setenv("OLLAMA_URL", "http://ollama:11434")
    importlib.reload(app.config)
    from app.config import settings
    assert settings.OLLAMA_URL == "http://ollama:11434"


def test_settings_reads_log_level_from_env(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    importlib.reload(app.config)
    from app.config import settings
    assert settings.LOG_LEVEL == "DEBUG"


def test_settings_reads_agent_interval_from_env(monkeypatch):
    monkeypatch.setenv("AGENT_SCHEDULE_INTERVAL_MINUTES", "30")
    importlib.reload(app.config)
    from app.config import settings
    assert settings.AGENT_SCHEDULE_INTERVAL_MINUTES == 30
