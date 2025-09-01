# backend/flask-service/app/api/visualization.py
from flask import jsonify, request
from app.api import api_bp
from app.services.seaborn_generator import SeabornGenerator
from app.services.data_processor import DataProcessor
import json

@api_bp.route('/visualizations/<viz_type>', methods=['GET'])
def get_visualization_data(viz_type):
    """Get data formatted for specific visualization types"""
    try:
        processor = DataProcessor()
        generator = SeabornGenerator()
        
        # Get base data
        df = processor.get_sensor_data('24h')
        
        # Format data based on visualization type
        if viz_type == 'time_series':
            data = processor.prepare_time_series(df)
            plot = generator.create_time_series_plot(df)
        elif viz_type == 'distribution':
            data = processor.prepare_distribution(df)
            plot = generator.create_distribution_plot(df)
        elif viz_type == 'correlation':
            data = processor.prepare_correlation(df)
            plot = generator.create_correlation_matrix(df)
        elif viz_type == 'geospatial':
            data = processor.prepare_geospatial(df)
            plot = generator.create_geospatial_plot(df)
        else:
            return jsonify({'error': 'Invalid visualization type'}), 400
            
        return jsonify({
            'data': data,
            'statistical_plot': plot,
            'summary_stats': df.describe().to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/visualizations/custom', methods=['POST'])
def create_custom_visualization():
    """Create custom visualization based on user parameters"""
    try:
        params = request.json
        viz_type = params.get('type', 'scatter')
        x_column = params.get('x_column')
        y_column = params.get('y_column')
        hue_column = params.get('hue_column')
        
        processor = DataProcessor()
        generator = SeabornGenerator()
        
        df = processor.get_sensor_data('24h')
        
        plot = generator.create_custom_plot(
            df, 
            viz_type=viz_type,
            x=x_column,
            y=y_column,
            hue=hue_column
        )
        
        return jsonify({
            'plot': plot,
            'data_shape': df.shape,
            'columns': df.columns.tolist()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500