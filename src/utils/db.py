"""Database query utilities."""

async def query_all(db, sql):
    """Execute SQL and return all results as list of dicts."""
    return [dict(r.to_py()) for r in (await db.prepare(sql).all()).results]

async def query_first(db, sql):
    """Execute SQL and return first result as dict or None."""
    r = await db.prepare(sql).first()
    return dict(r.to_py()) if r else None
