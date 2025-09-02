from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic_settings import BaseSettings
from pydantic import BaseModel
from pathlib import Path
import shutil, datetime as dt
from sqlalchemy import create_engine, Column, String, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# ----- settings -----
class Settings(BaseSettings):
    BASE_DIR: str = "./journal_data"
    ORIGINS: str = "http://localhost:5173"
    class Config:
        env_file = ".env"

settings = Settings()
BASE_DIR = Path(settings.BASE_DIR)

# ----- app -----
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ORIGINS.split(",") if o.strip()],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# Ensure base dir exists and mount it for static serving
BASE_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=str(BASE_DIR)), name="files")

# ----- DB (SQLite) -----
Base = declarative_base()
engine = create_engine("sqlite:///journal.sqlite3", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

class Trade(Base):
    __tablename__ = "trades"
    id = Column(String, primary_key=True)
    date_key = Column(String, index=True)  # YYYY-MM-DD
    title = Column(String)
    pair = Column(String)
    status = Column(String)
    side = Column(String)
    open_time = Column(String)
    entry = Column(String); stop = Column(String); tp = Column(String); rr = Column(String)
    confidence = Column(Integer); rating = Column(Integer)
    tags = Column(Text)       # comma-separated
    notes = Column(Text)
    pnl = Column(Float, default=0.0)
    screenshots = relationship("Screenshot", cascade="all,delete-orphan")

class Screenshot(Base):
    __tablename__ = "screenshots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_id = Column(String, ForeignKey("trades.id"))
    name = Column(String)
    path = Column(String)     # relative path under BASE_DIR, POSIX style (with /)

Base.metadata.create_all(engine)

# ----- helpers -----
def trade_dir(date_key: str, trade_id: str) -> Path:
    y, m, d = date_key.split("-")
    p = BASE_DIR / y / m / d / trade_id
    p.mkdir(parents=True, exist_ok=True)
    return p

def as_rel_posix(p: Path) -> str:
    return p.relative_to(BASE_DIR).as_posix()

# ----- models -----
class TradeIn(BaseModel):
    id: str
    dateKey: str
    title: str = ""
    pair: str = ""
    status: str = "Win"
    side: str = "Long"
    openTime: str
    entry: str = ""; stop: str = ""; tp: str = ""; rr: str = ""
    confidence: int = 1; rating: int = 0
    tags: list[str] = []
    notes: str = ""
    pnl: float = 0.0

class TradeOut(TradeIn):
    screenshots: list[dict] = []  # [{name, path, url}]

# ----- endpoints -----
@app.post("/api/trades", response_model=TradeOut)
def upsert_trade(trade: TradeIn):
    db = SessionLocal()
    t = db.get(Trade, trade.id) or Trade(id=trade.id)
    t.date_key = trade.dateKey; t.title = trade.title; t.pair = trade.pair
    t.status = trade.status; t.side = trade.side; t.open_time = trade.openTime
    t.entry = trade.entry; t.stop = trade.stop; t.tp = trade.tp; t.rr = trade.rr
    t.confidence = trade.confidence; t.rating = trade.rating
    t.tags = ",".join(trade.tags); t.notes = trade.notes; t.pnl = trade.pnl
    db.add(t); db.commit(); db.refresh(t)
    shots = [{"name": s.name, "path": s.path, "url": f"/files/{s.path}"} for s in t.screenshots]
    db.close()
    return {**trade.model_dump(), "screenshots": shots}

@app.post("/api/upload")
async def upload_file(tradeId: str = Form(...), dateKey: str = Form(...), file: UploadFile = File(...)):
    target_dir = trade_dir(dateKey, tradeId)
    target_path = target_dir / file.filename
    with target_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    rel = as_rel_posix(target_path)

    db = SessionLocal()
    t = db.get(Trade, tradeId)
    if not t:
        t = Trade(id=tradeId, date_key=dateKey, open_time=dt.datetime.now().isoformat())
        db.add(t); db.commit(); db.refresh(t)
    db.add(Screenshot(trade_id=tradeId, name=file.filename, path=rel))
    db.commit(); db.close()
    return {"ok": True, "path": rel, "url": f"/files/{rel}"}

@app.get("/api/trades/{date_key}", response_model=list[TradeOut])
def list_trades_by_day(date_key: str):
    db = SessionLocal()
    rows = db.query(Trade).filter(Trade.date_key==date_key).all()
    out = []
    for t in rows:
        out.append({
            "id": t.id, "dateKey": t.date_key, "title": t.title, "pair": t.pair,
            "status": t.status, "side": t.side, "openTime": t.open_time,
            "entry": t.entry, "stop": t.stop, "tp": t.tp, "rr": t.rr,
            "confidence": t.confidence, "rating": t.rating,
            "tags": (t.tags.split(",") if t.tags else []),
            "notes": t.notes, "pnl": t.pnl,
            "screenshots": [{"name": s.name, "path": s.path, "url": f"/files/{s.path}"} for s in t.screenshots],
        })
    db.close()
    return out
