import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://sagahunter:sagahunter@localhost:5432/sagahunter")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    AGENT_SCHEDULE_INTERVAL_MINUTES: int = int(os.getenv("AGENT_SCHEDULE_INTERVAL_MINUTES", "15"))


settings = Settings()
