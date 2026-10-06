import os
import hashlib
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from ai.harness import ResQNetHarness

load_dotenv()

app = FastAPI(title="ResQNet API Gateway", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "disaster_cache.db"
harness = ResQNetHarness()

# Initialize SQLite cache table
def init_db():
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS incident_cache (
                cache_key TEXT PRIMARY KEY,
                hazard_type TEXT,
                severity_score INTEGER,
                evacuation_needed INTEGER,
                action_plan TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

init_db()

class IncidentPayload(BaseModel):
    location: str
    geohash: str
    description: str
    image_base64: str | None = None

@app.post("/api/triage")
async def process_incident(payload: IncidentPayload):
    # 1. Generate deterministic cache key: geohash + truncated description hash
    desc_hash = hashlib.md5(payload.description.strip().lower().encode()).hexdigest()[:8]
    cache_key = f"{payload.geohash}:{desc_hash}"

    # 2. Check cache
    with sqlite3.connect(DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT hazard_type, severity_score, evacuation_needed, action_plan FROM incident_cache WHERE cache_key = ?",
            (cache_key,)
        )
        row = cursor.fetchone()
        if row:
            return {
                "source": "cache",
                "cache_hit": True,
                "hazard_type": row[0],
                "severity_score": row[1],
                "evacuation_needed": bool(row[2]),
                "action_plan": row[3],
                "location": payload.location
            }

    # 3. Cache miss: Route through Model Harness
    result = await harness.execute_triage(
        description=f"Location: {payload.location}. Context: {payload.description}",
        image_base64=payload.image_base64
    )

    # 4. Save to cache
    with sqlite3.connect(DB_FILE) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO incident_cache (cache_key, hazard_type, severity_score, evacuation_needed, action_plan) VALUES (?, ?, ?, ?, ?)",
            (cache_key, result["hazard_type"], result["severity_score"], int(result["evacuation_needed"]), result["action_plan"])
        )

    return {
        "source": "model_harness",
        "cache_hit": False,
        **result,
        "location": payload.location
    }

@app.get("/api/simulate")
def get_scripted_replay():
    """Scripted disaster scenario for live judge presentation."""
    return [
        {
            "id": 1,
            "lat": 23.2599,
            "lng": 77.4126,
            "hazard_type": "Flood",
            "severity_score": 5,
            "title": "Severe Flash Flood - Lower Lake Overflow",
            "evacuation_needed": True
        },
        {
            "id": 2,
            "lat": 23.2324,
            "lng": 77.4300,
            "hazard_type": "Structural",
            "severity_score": 4,
            "title": "Bridge Submerged & Road Blockage",
            "evacuation_needed": True
        },
        {
            "id": 3,
            "lat": 23.2156,
            "lng": 77.4100,
            "hazard_type": "Weather",
            "severity_score": 2,
            "title": "Severe Waterlogging on Bypass",
            "evacuation_needed": False
        }
    ]
