"""ルート関連のAPIエンドポイント"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.schemas import RouteResponse, RouteListResponse

router = APIRouter(prefix="/routes", tags=["routes"])


@router.get("", response_model=RouteListResponse)
async def get_routes(db: Session = Depends(get_db)):
    """
    ルート一覧を取得

    Returns:
        RouteListResponse: ルート一覧とtotal数
    """
    # ルート数を取得
    count_result = db.execute(text("SELECT COUNT(*) FROM routes")).fetchone()
    total = count_result[0] if count_result else 0

    # ルート一覧を取得
    result = db.execute(
        text("""
            SELECT id, name, start_term_id, length, difficulty, relation_filter
            FROM routes
            ORDER BY id
        """)
    )

    routes = []
    for row in result:
        routes.append(
            RouteResponse(
                id=row[0],
                name=row[1],
                start_term_id=row[2],
                length=row[3],
                difficulty=row[4],
            )
        )

    return RouteListResponse(routes=routes, total=total)
