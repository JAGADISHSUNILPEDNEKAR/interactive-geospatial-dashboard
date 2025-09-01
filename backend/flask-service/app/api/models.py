# backend/flask-service/app/api/models.py
from flask import jsonify, request
from app.api import api_bp
from app.models.database import get_db_connection

@api_bp.route('/models/3d', methods=['GET'])
def get_3d_models():
    """Return 3D model data for map overlay"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        models = cursor.execute("""
            SELECT id, name, latitude, longitude, model_url, scale_x, scale_y, scale_z, rotation_x, rotation_y, rotation_z
            FROM models_3d
            WHERE active = 1
        """).fetchall()
        
        conn.close()
        
        result = []
        for model in models:
            result.append({
                'id': model[0],
                'name': model[1],
                'coordinates': {
                    'latitude': model[2],
                    'longitude': model[3]
                },
                'url': model[4],
                'scale': [model[5], model[6], model[7]],
                'rotation': [model[8], model[9], model[10]] if model[8] else None
            })
            
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/models/3d', methods=['POST'])
def add_3d_model():
    """Add a new 3D model to the database"""
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO models_3d (name, latitude, longitude, model_url, scale_x, scale_y, scale_z)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            data['name'],
            data['latitude'],
            data['longitude'],
            data['model_url'],
            data.get('scale', [1, 1, 1])[0],
            data.get('scale', [1, 1, 1])[1],
            data.get('scale', [1, 1, 1])[2]
        ))
        
        conn.commit()
        model_id = cursor.lastrowid
        conn.close()
        
        return jsonify({'id': model_id, 'message': 'Model added successfully'}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500