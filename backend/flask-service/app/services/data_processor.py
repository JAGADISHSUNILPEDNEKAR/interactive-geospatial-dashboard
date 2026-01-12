import pandas as pd
import numpy as np

class DataProcessor:
    @staticmethod
    def process_data(data):
        """
        Process incoming data
        """
        try:
            df = pd.DataFrame(data)
            # Basic cleaning
            df = df.dropna()
            return df.to_dict('records')
        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def aggregate_by_category(data, category_col, value_col):
        """
        Aggregate data by category
        """
        try:
            df = pd.DataFrame(data)
            if category_col not in df.columns or value_col not in df.columns:
                 return {'error': 'Missing columns'}
            
            result = df.groupby(category_col)[value_col].sum().reset_index()
            return result.to_dict('records')
        except Exception as e:
            return {'error': str(e)}
