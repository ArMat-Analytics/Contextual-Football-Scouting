from fastapi import FastAPI
from sqlalchemy import text
import database

app = FastAPI(title="Test Connection")

@app.get("/")
def test_connection():
    try:
        with database.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            
        return {
            "status": "🟢 SUCCESS", 
            "message": "Connection successful!"
        }
    except Exception as e:
        return {
            "status": "🔴 ERROR", 
            "message": "Impossible to connect to the database.",
            "technical_details": str(e)
        }