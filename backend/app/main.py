"""FastAPI application entry point"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import games, admin
# routes.py は routesテーブル依存のため削除
from app.services.cache import get_cache


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーション起動時にキャッシュを初期化"""
    # 起動時: キャッシュを初期化
    get_cache()
    yield
    # 終了時: 特に何もしない


app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
    description="歴史をつなごう",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",           # ローカル開発 (frontend)
        "http://localhost:5174",           # ローカル開発 (studio)
        "https://histlink.onrender.com",   # 本番フロントエンド
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(games.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router)


@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    """Health check endpoint"""
    return {"message": "HistLink API is running", "version": "0.1.0"}


@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}
