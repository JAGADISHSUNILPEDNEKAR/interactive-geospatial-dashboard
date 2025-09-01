# backend/flask-service/app/api/geospatial.py
from flask import jsonify, request
from app.api import api_bp
from app.services.spatial_analysis import SpatialAnalysis
from app.services.data_processor import DataProcessor
import pandas as pd
import numpy as np

@api_bp.route('/data/geospatial', methods=['GET'])
def get_geospatial_data():
    """Process and return geospatial data with statistical analysis"""
    try:
        # Get query parameters
        time_range = request.args.get('time_range', '24h')
        bounds = request.args.get('bounds')
        
        # Get data from processor
        processor = DataProcessor()
        df = processor.get_sensor_data(time_range)
        
        # Apply spatial filtering if bounds provided
        if bounds:
            bounds_list = [float(x) for x in bounds.split(',')]
            df = processor.filter_by_bounds(df, bounds_list)
        
        # Perform spatial analysis
        spatial = SpatialAnalysis()
        clusters = spatial.cluster_points(
            df[['latitude', 'longitude']].values,
            n_clusters=5
        )
        
        heatmap_data = spatial.generate_heatmap(
            df[['latitude', 'longitude', 'value']].values
        )
        
        # Calculate statistics
        stats = {
            'mean': float(df['value'].mean()),
            'median': float(df['value'].median()),
            'std': float(df['value'].std()),
            'min': float(df['value'].min()),
            'max': float(df['value'].max()),
            'count': len(df)
        }
        
        # Generate Seaborn plot
        import io
        import base64
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        plt.figure(figsize=(10, 6))
        sns.scatterplot(
            data=df, 
            x='longitude', 
            y='latitude', 
            hue='value',
            size='value',
            sizes=(20, 200),
            palette='coolwarm'
        )
        plt.title('Geospatial Data Distribution')
        
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format='png', dpi=100, bbox_inches='tight')
        img_buffer.seek(0)
        plot_data = base64.b64encode(img_buffer.getvalue()).decode()
        plt.close()
        
        return jsonify({
            'data': df.to_dict('records'),
            'clusters': clusters.tolist() if clusters is not None else [],
            'heatmap': heatmap_data.tolist() if heatmap_data is not None else [],
            'statistics': stats,
            'statistical_plot': f'data:image/png;base64,{plot_data}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/data/spatial-analysis', methods=['POST'])
def perform_spatial_analysis():
    """Perform advanced spatial analysis on provided data"""
    try:
        data = request.json
        analysis_type = data.get('type', 'cluster')
        points = np.array(data.get('points', []))
        
        spatial = SpatialAnalysis()
        
        if analysis_type == 'cluster':
            result = spatial.cluster_points(points, n_clusters=data.get('n_clusters', 5))
        elif analysis_type == 'interpolate':
            result = spatial.interpolate_surface(points)
        elif analysis_type == 'buffer':
            result = spatial.create_buffers(points, radius=data.get('radius', 100))
        else:
            return jsonify({'error': 'Invalid analysis type'}), 400
            
        return jsonify({
            'result': result.tolist() if hasattr(result, 'tolist') else result,
            'type': analysis_type
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500