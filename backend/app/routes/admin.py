"""Admin API endpoints for HistLink Studio"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import verify_admin_token
from app.schemas.admin import (
    TermCreate,
    TermUpdate,
    TermResponse,
    EdgeCreate,
    EdgeUpdate,
    EdgeResponse,
    PaginatedResponse,
)
from app.services.cache import get_cache

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(verify_admin_token)])

# Sort column allowlists: query param name -> actual SQL column reference
_TERM_SORT_COLUMNS: dict[str, str] = {
    "id": "id",
    "name": "name",
    "category": "category",
    "tier": "tier",
}
_EDGE_SORT_COLUMNS: dict[str, str] = {
    "id": "e.id",
    "keyword": "e.keyword",
    "difficulty": "e.difficulty",
}
_GAME_SORT_COLUMNS: dict[str, str] = {
    "id": "id",
    "score": "score",
    "created_at": "created_at",
    "difficulty": "difficulty",
}


def build_order_clause(sort_by: str, order: str, allowed: dict[str, str]) -> str:
    """Validate sort_by against allowlist and return ORDER BY clause."""
    if sort_by not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid sort field: {sort_by}")
    direction = "DESC" if order.upper() == "DESC" else "ASC"
    return f"ORDER BY {allowed[sort_by]} {direction}"


def refresh_cache():
    """Refresh the data cache after CRUD operations"""
    cache = get_cache()
    cache.load_from_db()


# ========== Terms CRUD ==========

@router.get("/terms/all")
async def list_all_terms():
    """Get all terms from cache (for client-side caching)"""
    cache = get_cache()

    return [
        {
            "id": term.id,
            "name": term.name,
            "tier": term.tier,
            "category": term.category,
            "description": term.description,
        }
        for term in sorted(cache.terms.values(), key=lambda t: t.tier)
    ]


@router.get("/terms", response_model=PaginatedResponse)
async def list_terms(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("id"),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    """Get paginated list of terms"""
    order_clause = build_order_clause(sort_by, sort_order, _TERM_SORT_COLUMNS)

    count_result = db.execute(text("SELECT COUNT(*) FROM terms"))
    total = count_result.scalar()

    query = text(f"""
        SELECT id, name, tier, category, description
        FROM terms
        {order_clause}
        LIMIT :limit OFFSET :skip
    """)
    result = db.execute(query, {"limit": limit, "skip": skip})
    rows = result.fetchall()

    items = [
        {
            "id": row[0],
            "name": row[1],
            "tier": row[2],
            "category": row[3],
            "description": row[4],
        }
        for row in rows
    ]

    return {"items": items, "total": total}


@router.get("/terms/{term_id}", response_model=TermResponse)
async def get_term(term_id: int, db: Session = Depends(get_db)):
    """Get a single term by ID"""
    query = text("SELECT id, name, tier, category, description FROM terms WHERE id = :id")
    result = db.execute(query, {"id": term_id})
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Term not found")

    return {
        "id": row[0],
        "name": row[1],
        "tier": row[2],
        "category": row[3],
        "description": row[4],
    }


@router.get("/terms/{term_id}/edges")
async def get_term_edges(term_id: int, db: Session = Depends(get_db)):
    """Get all edges connected to a term"""
    query = text("""
        SELECT
            e.id, e.term_a, e.term_b, e.keyword, e.description, e.difficulty,
            t1.name as from_name, t2.name as to_name
        FROM edges e
        JOIN terms t1 ON e.term_a = t1.id
        JOIN terms t2 ON e.term_b = t2.id
        WHERE e.term_a = :term_id OR e.term_b = :term_id
        ORDER BY e.id
    """)
    result = db.execute(query, {"term_id": term_id})
    rows = result.fetchall()

    return [
        {
            "id": row[0],
            "from_term_id": row[1],
            "to_term_id": row[2],
            "keyword": row[3],
            "description": row[4],
            "difficulty": row[5],
            "from_term_name": row[6],
            "to_term_name": row[7],
        }
        for row in rows
    ]


@router.post("/terms", response_model=TermResponse)
async def create_term(term: TermCreate, db: Session = Depends(get_db)):
    """Create a new term"""
    tier = 1 if term.tier == 1 else 3 if term.tier == 3 else 2

    query = text("""
        INSERT INTO terms (name, tier, category, description)
        VALUES (:name, :tier, :category, :description)
        RETURNING id, name, tier, category, description
    """)
    result = db.execute(query, {
        "name": term.name,
        "tier": tier,
        "category": term.category,
        "description": term.description,
    })
    db.commit()
    row = result.fetchone()

    refresh_cache()

    return {
        "id": row[0],
        "name": row[1],
        "tier": row[2],
        "category": row[3],
        "description": row[4],
    }


@router.put("/terms/{term_id}", response_model=TermResponse)
async def update_term(term_id: int, term: TermUpdate, db: Session = Depends(get_db)):
    """Update an existing term"""
    tier = 1 if term.tier == 1 else 3 if term.tier == 3 else 2

    query = text("""
        UPDATE terms
        SET name = :name, tier = :tier, category = :category, description = :description
        WHERE id = :id
        RETURNING id, name, tier, category, description
    """)
    result = db.execute(query, {
        "id": term_id,
        "name": term.name,
        "tier": tier,
        "category": term.category,
        "description": term.description,
    })
    db.commit()
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Term not found")

    refresh_cache()

    return {
        "id": row[0],
        "name": row[1],
        "tier": row[2],
        "category": row[3],
        "description": row[4],
    }


@router.delete("/terms/{term_id}")
async def delete_term(term_id: int, db: Session = Depends(get_db)):
    """Delete a term"""
    check = db.execute(text("SELECT id FROM terms WHERE id = :id"), {"id": term_id})
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Term not found")

    db.execute(text("DELETE FROM edges WHERE term_a = :id OR term_b = :id"), {"id": term_id})
    db.execute(text("DELETE FROM terms WHERE id = :id"), {"id": term_id})
    db.commit()

    refresh_cache()

    return {"message": "Term deleted"}


# ========== Edges CRUD ==========

@router.get("/edges/all")
async def list_all_edges():
    """Get all edges from cache (for client-side caching)"""
    cache = get_cache()

    return [
        {
            "id": edge.id,
            "from_term_id": edge.term_a,
            "to_term_id": edge.term_b,
            "keyword": edge.keyword,
            "description": edge.description,
            "difficulty": edge.difficulty,
            "from_term_name": cache.get_term(edge.term_a).name if cache.get_term(edge.term_a) else "",
            "to_term_name": cache.get_term(edge.term_b).name if cache.get_term(edge.term_b) else "",
        }
        for edge in cache.edges
    ]


@router.get("/edges", response_model=PaginatedResponse)
async def list_edges(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("id"),
    sort_order: str = Query("asc"),
    db: Session = Depends(get_db),
):
    """Get paginated list of edges with term names"""
    order_clause = build_order_clause(sort_by, sort_order, _EDGE_SORT_COLUMNS)

    count_result = db.execute(text("SELECT COUNT(*) FROM edges"))
    total = count_result.scalar()

    query = text(f"""
        SELECT
            e.id, e.term_a, e.term_b, e.keyword, e.description, e.difficulty,
            t1.name as from_name, t2.name as to_name
        FROM edges e
        JOIN terms t1 ON e.term_a = t1.id
        JOIN terms t2 ON e.term_b = t2.id
        {order_clause}
        LIMIT :limit OFFSET :skip
    """)
    result = db.execute(query, {"limit": limit, "skip": skip})
    rows = result.fetchall()

    items = [
        {
            "id": row[0],
            "from_term_id": row[1],
            "to_term_id": row[2],
            "keyword": row[3],
            "description": row[4],
            "difficulty": row[5],
            "from_term_name": row[6],
            "to_term_name": row[7],
        }
        for row in rows
    ]

    return {"items": items, "total": total}


@router.get("/edges/{edge_id}", response_model=EdgeResponse)
async def get_edge(edge_id: int, db: Session = Depends(get_db)):
    """Get a single edge by ID"""
    query = text("""
        SELECT
            e.id, e.term_a, e.term_b, e.keyword, e.description, e.difficulty,
            t1.name as from_name, t2.name as to_name
        FROM edges e
        JOIN terms t1 ON e.term_a = t1.id
        JOIN terms t2 ON e.term_b = t2.id
        WHERE e.id = :id
    """)
    result = db.execute(query, {"id": edge_id})
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Edge not found")

    return {
        "id": row[0],
        "from_term_id": row[1],
        "to_term_id": row[2],
        "keyword": row[3],
        "description": row[4],
        "difficulty": row[5],
        "from_term_name": row[6],
        "to_term_name": row[7],
    }


@router.post("/edges", response_model=EdgeResponse)
async def create_edge(edge: EdgeCreate, db: Session = Depends(get_db)):
    """Create a new edge"""
    term_a = min(edge.from_term_id, edge.to_term_id)
    term_b = max(edge.from_term_id, edge.to_term_id)

    if term_a == term_b:
        raise HTTPException(status_code=400, detail="Cannot create edge between same terms")

    query = text("""
        INSERT INTO edges (term_a, term_b, keyword, description, difficulty)
        VALUES (:term_a, :term_b, :keyword, :description, :difficulty)
        RETURNING id
    """)
    try:
        result = db.execute(query, {
            "term_a": term_a,
            "term_b": term_b,
            "keyword": edge.keyword,
            "description": edge.description,
            "difficulty": edge.difficulty,
        })
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    edge_id = result.fetchone()[0]
    refresh_cache()

    return await get_edge(edge_id, db)


@router.put("/edges/{edge_id}", response_model=EdgeResponse)
async def update_edge(edge_id: int, edge: EdgeUpdate, db: Session = Depends(get_db)):
    """Update an existing edge"""
    term_a = min(edge.from_term_id, edge.to_term_id)
    term_b = max(edge.from_term_id, edge.to_term_id)

    query = text("""
        UPDATE edges
        SET term_a = :term_a, term_b = :term_b, keyword = :keyword,
            description = :description, difficulty = :difficulty
        WHERE id = :id
        RETURNING id
    """)
    result = db.execute(query, {
        "id": edge_id,
        "term_a": term_a,
        "term_b": term_b,
        "keyword": edge.keyword,
        "description": edge.description,
        "difficulty": edge.difficulty,
    })
    db.commit()
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Edge not found")

    refresh_cache()

    return await get_edge(edge_id, db)


@router.delete("/edges/{edge_id}")
async def delete_edge(edge_id: int, db: Session = Depends(get_db)):
    """Delete an edge"""
    check = db.execute(text("SELECT id FROM edges WHERE id = :id"), {"id": edge_id})
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Edge not found")

    db.execute(text("DELETE FROM edges WHERE id = :id"), {"id": edge_id})
    db.commit()

    refresh_cache()

    return {"message": "Edge deleted"}


# ========== Games (Read-only) ==========

@router.get("/games", response_model=PaginatedResponse)
async def list_games(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
):
    """Get paginated list of games"""
    order_clause = build_order_clause(sort_by, sort_order, _GAME_SORT_COLUMNS)

    count_result = db.execute(text("SELECT COUNT(*) FROM games"))
    total = count_result.scalar()

    query = text(f"""
        SELECT id, difficulty, score, array_length(terms, 1) as total_stages,
               cleared_steps, lives, user_name, created_at
        FROM games
        {order_clause}
        LIMIT :limit OFFSET :skip
    """)
    result = db.execute(query, {"limit": limit, "skip": skip})
    rows = result.fetchall()

    items = [
        {
            "id": str(row[0]),
            "difficulty": row[1],
            "score": row[2],
            "total_stages": row[3] or 0,
            "cleared_steps": row[4],
            "lives": row[5],
            "player_name": row[6],
            "is_completed": row[5] > 0 and row[4] >= (row[3] or 0) - 1,
            "created_at": row[7].isoformat() if row[7] else None,
        }
        for row in rows
    ]

    return {"items": items, "total": total}


@router.get("/games/{game_id}")
async def get_game(game_id: str, db: Session = Depends(get_db)):
    """Get a single game by ID"""
    query = text("""
        SELECT id, difficulty, score, terms, cleared_steps, lives,
               user_name, false_steps, created_at
        FROM games
        WHERE id = :id
    """)
    result = db.execute(query, {"id": game_id})
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Game not found")

    total_stages = len(row[3]) if row[3] else 0

    return {
        "id": str(row[0]),
        "difficulty": row[1],
        "score": row[2],
        "route": row[3] or [],
        "total_stages": total_stages,
        "cleared_steps": row[4],
        "lives": row[5],
        "player_name": row[6],
        "false_steps": row[7] or [],
        "is_completed": row[5] > 0 and row[4] >= total_stages - 1,
        "created_at": row[8].isoformat() if row[8] else None,
    }


@router.delete("/games/{game_id}")
async def delete_game(game_id: str, db: Session = Depends(get_db)):
    """Delete a game"""
    check = db.execute(text("SELECT id FROM games WHERE id = :id"), {"id": game_id})
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Game not found")

    db.execute(text("DELETE FROM games WHERE id = :id"), {"id": game_id})
    db.commit()

    return {"message": "Game deleted"}
