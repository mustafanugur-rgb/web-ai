from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import create_indexes
from app.routers import admin, analytics, auth, bills, dashboard, pos, restaurants, reviews, tables

tags_metadata = [
    {"name": "auth", "description": "JWT authentication"},
    {"name": "restaurants", "description": "Restaurant profiles and menu"},
    {"name": "tables", "description": "QR tables and scan"},
    {"name": "bills", "description": "Adisyon / bill sessions"},
    {"name": "reviews", "description": "Verified reviews"},
    {"name": "restaurant-dashboard", "description": "Restaurant panel data"},
    {"name": "analytics", "description": "Platform and restaurant analytics"},
    {"name": "admin", "description": "Admin operations"},
    {"name": "pos", "description": "External POS sync (future)"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_indexes()
    yield


def _cors_origins() -> list[str]:
    s = settings.cors_origins.strip()
    if s == "*":
        return ["*"]
    return [x.strip() for x in s.split(",") if x.strip()]


app = FastAPI(
    title="GidApp API",
    description="Restaurant discovery, smart bill (adisyon), and POS-ready backend.",
    version="0.1.0",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(restaurants.router, prefix="/api")
app.include_router(tables.router, prefix="/api")
app.include_router(bills.router, prefix="/api")
app.include_router(reviews.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(pos.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gidapp-api"}
