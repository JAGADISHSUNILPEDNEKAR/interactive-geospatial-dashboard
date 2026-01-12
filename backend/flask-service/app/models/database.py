import sqlite3
import os
from flask import g, current_app

def get_db_connection():
    if 'db' not in g:
        # Create directory if it doesn't exist, just in case
        db_path = current_app.config['DATABASE_PATH']
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        g.db = sqlite3.connect(db_path)
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db(database_path):
    os.makedirs(os.path.dirname(database_path), exist_ok=True)
    conn = sqlite3.connect(database_path)
    # Placeholder for schema loading if needed in future
    conn.close()
