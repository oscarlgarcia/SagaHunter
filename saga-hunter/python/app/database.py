import psycopg2
from psycopg2 import pool
from app.config import settings

_pool = None


def get_pool():
    global _pool
    if _pool is None:
        _pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=settings.DATABASE_URL,
        )
    return _pool


def execute(query: str, params: tuple = None, fetch: bool = False):
    p = get_pool()
    conn = p.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
            if fetch:
                result = cur.fetchall()
            else:
                result = None
            conn.commit()
            return result
    finally:
        p.putconn(conn)


def execute_many(query: str, params_list: list):
    p = get_pool()
    conn = p.getconn()
    try:
        with conn.cursor() as cur:
            for params in params_list:
                cur.execute(query, params)
            conn.commit()
    finally:
        p.putconn(conn)
