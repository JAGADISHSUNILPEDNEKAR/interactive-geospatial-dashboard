# backend/flask-service/app/__init__.py
from flask import Flask
from flask_cors import CORS
from config import config

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize CORS
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Register blueprints
    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Initialize database
    from app.models.database import init_db
    with app.app_context():
        init_db(app.config['DATABASE_PATH'])
    
    return app
