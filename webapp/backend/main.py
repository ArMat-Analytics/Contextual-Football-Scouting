from fastapi import FastAPI, Depends, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Optional
import database
import os

app = FastAPI(title="Football Scouting API")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# CORS — allow both localhost and 127.0.0.1 variants so the browser never blocks
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        FRONTEND_URL,
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
            -- INNER JOIN: only players that exist in sc_indices (the 272 with space-control data)
            -- Join via db_player_id (pre-computed in import_space_control.py) to handle name mismatches
            INNER JOIN player_totals pt ON p.truth_player_id = pt.player_id
            INNER JOIN sc_indices sc   ON sc.db_player_id = p.player_id
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


@app.get("/players/{player_id}/space-control")
def get_player_space_control(player_id: int, db: Session = Depends(database.get_db)):
    # Use db_player_id join — robust to name/team-name mismatches between datasets
    idx_row = db.execute(text(
        "SELECT * FROM sc_indices WHERE db_player_id = :pid LIMIT 1"
    ), {"pid": player_id}).fetchone()

    agg_row = None
    if idx_row:
        # sc_aggregated has no db_player_id — join via sc_indices player+team keys
        agg_row = db.execute(text(
            "SELECT * FROM sc_aggregated WHERE player = :player AND team = :team LIMIT 1"
        ), {"player": idx_row.player, "team": idx_row.team}).fetchone()

    return {
        "indices":    dict(idx_row._mapping) if idx_row else None,
        "aggregated": dict(agg_row._mapping) if agg_row else None,
    }


@app.get("/space-control/similar")
def get_similar_players(
    macro_role: str,
    exclude_player: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    try:
        q = "SELECT * FROM sc_indices WHERE macro_role = :macro_role"
        params: dict = {"macro_role": macro_role}
        if exclude_player:
            q += " AND player != :exclude_player"
            params["exclude_player"] = exclude_player
        q += " ORDER BY player ASC"
        rows = [dict(r._mapping) for r in db.execute(text(q), params)]
        for r in rows:
            r["similarity_score"] = None
        return rows
    except Exception as e:
        # Return a structured error instead of a 500 so the frontend can handle it gracefully
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "hint": "Run import_space_control.py to create sc_indices table"}
        )



@app.get("/space-control/search")
def search_space_control(
    macro_role: Optional[str] = None,
    role: Optional[str] = None,
    prog_min: Optional[float] = None,
    prog_max: Optional[float] = None,
    danger_min: Optional[float] = None,
    danger_max: Optional[float] = None,
    recep_min: Optional[float] = None,
    recep_max: Optional[float] = None,
    grav_min: Optional[float] = None,
    grav_max: Optional[float] = None,
    db: Session = Depends(database.get_db)
):
    """
    Filter sc_indices by macro_role, primary_role, and index ranges.
    Returns players ordered by average index score descending.
    """
    q = "SELECT * FROM sc_indices WHERE 1=1"
    params: dict = {}
    if macro_role:
        q += " AND macro_role = :macro_role"
        params["macro_role"] = macro_role
    if role:
        q += " AND primary_role = :role"
        params["role"] = role
    if prog_min is not None:
        q += ' AND "idx__PROGRESSION" >= :prog_min'
        params["prog_min"] = prog_min
    if prog_max is not None:
        q += ' AND "idx__PROGRESSION" <= :prog_max'
        params["prog_max"] = prog_max
    if danger_min is not None:
        q += ' AND "idx__DANGEROUSNESS" >= :danger_min'
        params["danger_min"] = danger_min
    if danger_max is not None:
        q += ' AND "idx__DANGEROUSNESS" <= :danger_max'
        params["danger_max"] = danger_max
    if recep_min is not None:
        q += ' AND "idx__RECEPTION" >= :recep_min'
        params["recep_min"] = recep_min
    if recep_max is not None:
        q += ' AND "idx__RECEPTION" <= :recep_max'
        params["recep_max"] = recep_max
    if grav_min is not None:
        q += ' AND "idx__GRAVITY" >= :grav_min'
        params["grav_min"] = grav_min
    if grav_max is not None:
        q += ' AND "idx__GRAVITY" <= :grav_max'
        params["grav_max"] = grav_max
    q += ' ORDER BY (COALESCE("idx__PROGRESSION",0) + COALESCE("idx__DANGEROUSNESS",0) + COALESCE("idx__RECEPTION",0) + COALESCE("idx__GRAVITY",0)) / 4 DESC'
    rows = [dict(r._mapping) for r in db.execute(text(q), params)]
    return rows

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