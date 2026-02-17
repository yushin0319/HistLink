"""Shared dependencies for HistLink backend"""
import os
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


def verify_admin_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    admin_secret = os.environ.get("ADMIN_SECRET")
    if not admin_secret:
        raise HTTPException(status_code=500, detail="ADMIN_SECRET not configured")
    if credentials.credentials != admin_secret:
        raise HTTPException(status_code=401, detail="Invalid admin token")
