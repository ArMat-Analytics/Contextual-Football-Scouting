from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional
import database
import os

app = FastAPI(title="Football Scouting API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# 1. CORS Configuration (Allows the React frontend to make requests to the backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL, 
        "http://localhost:5173", 
        "http://127.0.0.1:5173"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def test_connection():
    try:
        with database.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "🟢 SUCCESS", "message": "Connection successful!"}
    except Exception as e:
        return {"status": "🔴 ERROR", "message": str(e)}

@app.get("/teams/")
def get_teams(db: Session = Depends(database.get_db)):
    # Fetch all teams ordered alphabetically by name
    result = db.execute(text("SELECT * FROM teams ORDER BY team_name ASC"))
    teams = [dict(row._mapping) for row in result]
    return teams

# NEW ENDPOINT: Fetch dynamic roles directly from the database
@app.get("/roles/")
def get_roles(db: Session = Depends(database.get_db)):
    query_str = "SELECT DISTINCT primary_role FROM player_totals WHERE primary_role IS NOT NULL ORDER BY primary_role"
    result = db.execute(text(query_str))
    # Return a flat list of role strings
    return [row[0] for row in result]

@app.get("/players/")
def get_players(
    search: str = "",
    sort_by: str = "player_name",
    sort_order: str = "asc",
    teams: List[str] = Query(default=[]),
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    role: str = "",
    foot: str = "",
    val_pre_min: Optional[float] = None,
    val_pre_max: Optional[float] = None,
    val_post_min: Optional[float] = None,
    val_post_max: Optional[float] = None,
    val_diff_min: Optional[float] = None,
    val_diff_max: Optional[float] = None,
    db: Session = Depends(database.get_db)
):
    # Using a CTE (Common Table Expression) to pre-calculate market values as numbers
    query_str = """
        WITH PlayerData AS (
            SELECT 
                p.player_id, p.player_name, p.age, p.source_team_name, 
                p.preferred_foot, p.market_value_before_euros, p.market_value_after_euros, 
                pt.primary_role,
                (CASE 
                    WHEN p.market_value_before_euros ILIKE '%m%' THEN CAST(NULLIF(REGEXP_REPLACE(p.market_value_before_euros, '[^0-9.]', '', 'g'), '') AS NUMERIC) * 1000000
                    WHEN p.market_value_before_euros ILIKE '%k%' THEN CAST(NULLIF(REGEXP_REPLACE(p.market_value_before_euros, '[^0-9.]', '', 'g'), '') AS NUMERIC) * 1000
                    ELSE 0 END) as val_pre_num,
                (CASE 
                    WHEN p.market_value_after_euros ILIKE '%m%' THEN CAST(NULLIF(REGEXP_REPLACE(p.market_value_after_euros, '[^0-9.]', '', 'g'), '') AS NUMERIC) * 1000000
                    WHEN p.market_value_after_euros ILIKE '%k%' THEN CAST(NULLIF(REGEXP_REPLACE(p.market_value_after_euros, '[^0-9.]', '', 'g'), '') AS NUMERIC) * 1000
                    ELSE 0 END) as val_post_num
            FROM player_profiles p
            LEFT JOIN player_totals pt ON p.truth_player_id = pt.player_id
        )
        SELECT * FROM PlayerData WHERE 1=1
    """
    params = {}

    if search:
        query_str += " AND player_name ILIKE :search"
        params["search"] = f"%{search}%"

    if teams:
        query_str += " AND source_team_name = ANY(:teams)"
        params["teams"] = teams
        
    if age_min is not None:
        query_str += " AND age >= :age_min"
        params["age_min"] = age_min
    if age_max is not None:
        query_str += " AND age <= :age_max"
        params["age_max"] = age_max
        
    if role:
        query_str += " AND primary_role = :role"
        params["role"] = role
        
    if foot:
        query_str += " AND preferred_foot ILIKE :foot"
        params["foot"] = f"{foot}%"

    if val_pre_min is not None:
        query_str += " AND val_pre_num >= :vpre_min"
        params["vpre_min"] = val_pre_min * 1000000 # Assume input in millions
    if val_pre_max is not None:
        query_str += " AND val_pre_num <= :vpre_max"
        params["vpre_max"] = val_pre_max * 1000000
        
    if val_post_min is not None:
        query_str += " AND val_post_num >= :vpost_min"
        params["vpost_min"] = val_post_min * 1000000
    if val_post_max is not None:
        query_str += " AND val_post_num <= :vpost_max"
        params["vpost_max"] = val_post_max * 1000000
        
    if val_diff_min is not None:
        query_str += " AND (val_post_num - val_pre_num) >= :vdiff_min"
        params["vdiff_min"] = val_diff_min * 1000000
    if val_diff_max is not None:
        query_str += " AND (val_post_num - val_pre_num) <= :vdiff_max"
        params["vdiff_max"] = val_diff_max * 1000000

    # Sorting logic
    valid_sort = ["player_name", "primary_role", "age", "source_team_name", "preferred_foot", "market_value_before_euros", "market_value_after_euros"]
    if sort_by in valid_sort:
        order = "DESC" if sort_order == "desc" else "ASC"
        if sort_by == "market_value_before_euros":
            query_str += f" ORDER BY val_pre_num {order} NULLS LAST"
        elif sort_by == "market_value_after_euros":
            query_str += f" ORDER BY val_post_num {order} NULLS LAST"
        else:
            query_str += f" ORDER BY {sort_by} {order} NULLS LAST"
    else:
        query_str += " ORDER BY player_name ASC"

    result = db.execute(text(query_str), params)
    return [dict(row._mapping) for row in result]

# ENDPOINT: Fetch specific player statistics for the Comparator
@app.get("/players/{player_id}/stats")
def get_player_stats(player_id: int, db: Session = Depends(database.get_db)):
    query_str = """
        SELECT p.player_name, p.source_team_name, pt.* FROM player_profiles p
        JOIN player_totals pt ON p.truth_player_id = pt.player_id
        WHERE p.player_id = :pid
    """
    result = db.execute(text(query_str), {"pid": player_id}).fetchone()
    if not result:
        return {"error": "Stats not found"}
    return dict(result._mapping)

@app.get("/debug/")
def debug_database(db: Session = Depends(database.get_db)):
    """
    Utility endpoint to view the exact structure of a row
    directly from the database.
    """
    try:
        team_row = db.execute(text("SELECT * FROM teams LIMIT 1")).fetchone()
        player_row = db.execute(text("SELECT * FROM player_profiles LIMIT 1")).fetchone()
        
        return {
            "status": "success",
            "sample_team": dict(team_row._mapping) if team_row else None,
            "sample_player": dict(player_row._mapping) if player_row else None
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}