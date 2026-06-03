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


def market_value_numeric_sql(column_name: str) -> str:
    return (
        f"CASE "
        f"WHEN {column_name} IS NULL OR {column_name} = '' THEN NULL "
        f"WHEN {column_name} ILIKE '%,%' THEN REGEXP_REPLACE(REPLACE(REPLACE({column_name}, '.', ''), ',', '.'), '[^0-9.]', '', 'g') "
        f"ELSE REGEXP_REPLACE({column_name}, '[^0-9.]', '', 'g') "
        f"END"
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
    macro_role: str = "",
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
    pre_value_sql = market_value_numeric_sql("p.market_value_before_euros")
    post_value_sql = market_value_numeric_sql("p.market_value_after_euros")    
    query_str = f"""
        WITH CorrectedSC AS (
            SELECT 
                sc.*,
                CASE 
                    WHEN sc.player = 'Daniel Olmo Carvajal' THEN (SELECT player_id FROM player_profiles WHERE player_name ILIKE '%Olmo%' LIMIT 1)
                    ELSE sc.db_player_id
                END as fixed_db_player_id
            FROM sc_indices sc
        ),
        PlayerData AS (
            SELECT DISTINCT ON (p.player_id)
                p.player_id, p.player_name, p.age, p.source_team_name, 
                p.preferred_foot, p.market_value_before_euros, p.market_value_after_euros, 
                pt.primary_role, sc.macro_role,
                (CASE 
                    WHEN p.market_value_before_euros ILIKE '%m%' THEN CAST(NULLIF({pre_value_sql}, '') AS NUMERIC) * 1000000
                    WHEN p.market_value_before_euros ILIKE '%k%' THEN CAST(NULLIF({pre_value_sql}, '') AS NUMERIC) * 1000
                    ELSE NULL END) as val_pre_num,
                (CASE 
                    WHEN p.market_value_after_euros ILIKE '%m%' THEN CAST(NULLIF({post_value_sql}, '') AS NUMERIC) * 1000000
                    WHEN p.market_value_after_euros ILIKE '%k%' THEN CAST(NULLIF({post_value_sql}, '') AS NUMERIC) * 1000
                    ELSE NULL END) as val_post_num
            FROM player_profiles p
            INNER JOIN player_totals pt ON p.truth_player_id = pt.player_id
            INNER JOIN CorrectedSC sc   ON sc.fixed_db_player_id = p.player_id
            ORDER BY p.player_id, p.player_name
        )
        SELECT * FROM PlayerData WHERE 1=1
    """
    params = {}

    if search:
        query_str += " AND unaccent(player_name) ILIKE unaccent(:search)"
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
        
    if macro_role:
        query_str += " AND macro_role = :macro_role"
        params["macro_role"] = macro_role
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

@app.get("/players/{player_id}/decision-quality")
def get_player_decision_quality(player_id: int, db: Session = Depends(database.get_db)):
    """Return the decision-quality row for a single player, looked up by db_player_id."""
    row = db.execute(text("""
        WITH CorrectedSC AS (
            SELECT 
                sc.*,
                CASE 
                    WHEN sc.player = 'Daniel Olmo Carvajal' THEN (SELECT player_id FROM player_profiles WHERE player_name ILIKE '%Olmo%' LIMIT 1)
                    ELSE sc.db_player_id
                END as fixed_db_player_id
            FROM sc_indices sc
        )
        SELECT dq.*
        FROM player_decision_quality dq
        JOIN CorrectedSC sc ON sc.player = dq.player AND sc.team = dq.team
        WHERE sc.fixed_db_player_id = :pid
        LIMIT 1
    """), {"pid": player_id}).fetchone()

    if not row:
        return JSONResponse(status_code=404, content={"error": "Decision Quality data not found"})
    return dict(row._mapping)

@app.get("/players/{player_id}/off-ball")
def get_player_off_ball(player_id: int, db: Session = Depends(database.get_db)):
    """Return the off-ball movement row for a single player, looked up by db_player_id."""
    row = db.execute(text("""
        WITH CorrectedSC AS (
            SELECT 
                sc.*,
                CASE 
                    WHEN sc.player = 'Daniel Olmo Carvajal' THEN (SELECT player_id FROM player_profiles WHERE player_name ILIKE '%Olmo%' LIMIT 1)
                    ELSE sc.db_player_id
                END as fixed_db_player_id
            FROM sc_indices sc
        )
        SELECT ob.*
        FROM player_off_ball ob
        JOIN CorrectedSC sc ON sc.player = ob.player AND sc.team = ob.team
        WHERE sc.fixed_db_player_id = :pid
        LIMIT 1
    """), {"pid": player_id}).fetchone()

    if not row:
        return JSONResponse(status_code=404, content={"error": "Off-Ball Movement data not found"})
    return dict(row._mapping)

@app.get("/players/{player_id}/space-control")
def get_player_space_control(player_id: int, db: Session = Depends(database.get_db)):
    idx_row = db.execute(text(
        """
        WITH CorrectedSC AS (
            SELECT 
                sc.*,
                CASE 
                    WHEN sc.player = 'Daniel Olmo Carvajal' THEN (SELECT player_id FROM player_profiles WHERE player_name ILIKE '%Olmo%' LIMIT 1)
                    ELSE sc.db_player_id
                END as fixed_db_player_id
            FROM sc_indices sc
        )
        SELECT sc.*, COALESCE(p.player_name, sc.player) as tm_player_name 
        FROM CorrectedSC sc
        LEFT JOIN player_profiles p ON sc.fixed_db_player_id = p.player_id
        WHERE sc.fixed_db_player_id = :pid LIMIT 1
        """
    ), {"pid": player_id}).fetchone()

    agg_row = None
    if idx_row:
        # sc_aggregated uses StatsBomb player names + team, so we need to query using those values
        agg_row = db.execute(text(
            "SELECT * FROM sc_aggregated WHERE player = :player AND team = :team LIMIT 1"
        ), {"player": idx_row.player, "team": idx_row.team}).fetchone()

        # Use Transfermarkt name for frontend compatibility
        idx_dict = dict(idx_row._mapping)
        idx_dict["player"] = idx_dict.pop("tm_player_name")
        idx_row_final = idx_dict
    else:
        idx_row_final = None

    return {
        "indices":    idx_row_final,
        "aggregated": dict(agg_row._mapping) if agg_row else None,
    }


@app.get("/decision-quality/similar")
def get_similar_dq(
    macro_role: str,
    exclude_player: Optional[str] = None,
    db: Session = Depends(database.get_db),
):
    """Return all DQ rows for a given macro_role, excluding one player by name."""
    try:
        q = """
            WITH CorrectedSC AS (
                SELECT 
                    sc.*,
                    CASE 
                        WHEN sc.player = 'Daniel Olmo Carvajal' THEN (SELECT player_id FROM player_profiles WHERE player_name ILIKE '%Olmo%' LIMIT 1)
                        ELSE sc.db_player_id
                    END as fixed_db_player_id
                FROM sc_indices sc
            )
            SELECT dq.*, COALESCE(p.player_name, sc.player) as player
            FROM player_decision_quality dq
            JOIN CorrectedSC sc ON sc.player = dq.player AND sc.team = dq.team
            LEFT JOIN player_profiles p ON sc.fixed_db_player_id = p.player_id
            WHERE dq.macro_role = :macro_role
        """
        params: dict = {"macro_role": macro_role}

        if exclude_player:
            q += """
              AND COALESCE(p.player_name, sc.player) != :excl
            """
            params["excl"] = exclude_player

        q += " ORDER BY COALESCE(p.player_name, sc.player) ASC"

        rows = [dict(r._mapping) for r in db.execute(text(q), params)]
        return rows
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "hint": "Run import_decision_quality.py to create player_decision_quality table"},
        )


@app.get("/space-control/similar")
def get_similar_players(
    macro_role: str,
    exclude_player: Optional[str] = None,
    db: Session = Depends(database.get_db)
):
    try:
        q = """
            WITH CorrectedSC AS (
                SELECT 
                    sc.*,
                    CASE 
                        WHEN sc.player = 'Daniel Olmo Carvajal' THEN (SELECT player_id FROM player_profiles WHERE player_name ILIKE '%Olmo%' LIMIT 1)
                        ELSE sc.db_player_id
                    END as fixed_db_player_id
                FROM sc_indices sc
            )
            SELECT sc.*, COALESCE(p.player_name, sc.player) as player, p.player_id 
            FROM CorrectedSC sc
            LEFT JOIN player_profiles p ON sc.fixed_db_player_id = p.player_id
            WHERE sc.macro_role = :macro_role
        """
        params: dict = {"macro_role": macro_role}
        
        # Exclude the original player from results if specified (using Transfermarkt name for comparison)
        if exclude_player:
            q += " AND COALESCE(p.player_name, sc.player) != :exclude_player"
            params["exclude_player"] = exclude_player
            
        q += " ORDER BY COALESCE(p.player_name, sc.player) ASC"
        
        rows = [dict(r._mapping) for r in db.execute(text(q), params)]
        for r in rows:
            r["similarity_score"] = None
        return rows
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "hint": "Run import_space_control.py to create sc_indices table"}
        )
    

@app.get("/space-control/aggregated")
def get_sc_aggregated(player: str, team: str, db: Session = Depends(database.get_db)):
    """Return sc_aggregated row for a single player by StatsBomb name OR Transfermarkt name."""
    # 1. Try to find the player using the StatsBomb name (which is what's in sc_aggregated)
    row = db.execute(text(
        "SELECT * FROM sc_aggregated WHERE player = :player AND team = :team LIMIT 1"
    ), {"player": player, "team": team}).fetchone()
    
    if not row:
        # If not found, it might be because the player is listed under a different name in sc_indices (e.g. Daniel Olmo Carvajal vs Daniel Olmo).
        q = """
            WITH CorrectedSC AS (
                SELECT sc.player as sb_player_name, sc.team, p.player_name
                FROM sc_indices sc
                LEFT JOIN player_profiles p ON (
                    CASE 
                        WHEN sc.player = 'Daniel Olmo Carvajal' THEN (SELECT player_id FROM player_profiles WHERE player_name ILIKE '%Olmo%' LIMIT 1)
                        ELSE sc.db_player_id
                    END
                ) = p.player_id
            )
            SELECT agg.* FROM sc_aggregated agg
            JOIN CorrectedSC c ON agg.player = c.sb_player_name AND agg.team = c.team
            WHERE c.player_name = :player AND agg.team = :team
            LIMIT 1
        """
        row = db.execute(text(q), {"player": player, "team": team}).fetchone()
        
    if not row:
        return None
    return dict(row._mapping)


@app.get("/space-control/search")
def search_space_control(
    macro_role: Optional[str] = None,
    role: Optional[str] = None,
    prog_min: Optional[float] = Query(None),
    prog_max: Optional[float] = Query(None),
    danger_min: Optional[float] = Query(None),
    danger_max: Optional[float] = Query(None),
    recep_min: Optional[float] = Query(None),
    recep_max: Optional[float] = Query(None),
    grav_min: Optional[float] = Query(None),
    grav_max: Optional[float] = Query(None),
    db: Session = Depends(database.get_db)
):
    """
    Filter sc_indices by macro_role, primary_role, and index ranges.
    Returns players ordered by average index score descending.
    """
    q = """
        WITH CorrectedSC AS (
            SELECT 
                sc.*,
                CASE 
                    WHEN sc.player = 'Daniel Olmo Carvajal' THEN (SELECT player_id FROM player_profiles WHERE player_name ILIKE '%Olmo%' LIMIT 1)
                    ELSE sc.db_player_id
                END as fixed_db_player_id
            FROM sc_indices sc
        )
        SELECT sc.*, COALESCE(p.player_name, sc.player) as player, p.player_id, dq."DQ_index", ob.urs_pct_within_role
        FROM CorrectedSC sc
        LEFT JOIN player_profiles p ON sc.fixed_db_player_id = p.player_id
        LEFT JOIN player_decision_quality dq
            ON sc.player = dq.player AND sc.team = dq.team
        LEFT JOIN player_off_ball ob
            ON sc.player = ob.player AND sc.team = ob.team
        WHERE 1=1
    """
    params: dict = {}
    
    if macro_role:
        q += " AND sc.macro_role = :macro_role"
        params["macro_role"] = macro_role
    if role:
        q += " AND sc.primary_role = :role"
        params["role"] = role
        
    # Using CAST to NUMERIC for safe comparison, and allowing nulls to be ignored in filtering
    if prog_min is not None:
        q += ' AND CAST(sc."idx__PROGRESSION" AS NUMERIC) >= :prog_min'
        params["prog_min"] = prog_min
    if prog_max is not None:
        q += ' AND CAST(sc."idx__PROGRESSION" AS NUMERIC) <= :prog_max'
        params["prog_max"] = prog_max
        
    if danger_min is not None:
        q += ' AND CAST(sc."idx__DANGEROUSNESS" AS NUMERIC) >= :danger_min'
        params["danger_min"] = danger_min
    if danger_max is not None:
        q += ' AND CAST(sc."idx__DANGEROUSNESS" AS NUMERIC) <= :danger_max'
        params["danger_max"] = danger_max
        
    if recep_min is not None:
        q += ' AND CAST(sc."idx__RECEPTION" AS NUMERIC) >= :recep_min'
        params["recep_min"] = recep_min
    if recep_max is not None:
        q += ' AND CAST(sc."idx__RECEPTION" AS NUMERIC) <= :recep_max'
        params["recep_max"] = recep_max
        
    if grav_min is not None:
        q += ' AND CAST(sc."idx__GRAVITY" AS NUMERIC) >= :grav_min'
        params["grav_min"] = grav_min
    if grav_max is not None:
        q += ' AND CAST(sc."idx__GRAVITY" AS NUMERIC) <= :grav_max'
        params["grav_max"] = grav_max
        
    q += ' ORDER BY (COALESCE(sc."idx__PROGRESSION",0) + COALESCE(sc."idx__DANGEROUSNESS",0) + COALESCE(sc."idx__RECEPTION",0) + COALESCE(sc."idx__GRAVITY",0)) / 4 DESC'
    
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