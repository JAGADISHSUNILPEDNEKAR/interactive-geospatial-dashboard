import seaborn as sns
import matplotlib.pyplot as plt
import io
import base64
import pandas as pd

class SeabornGenerator:
    @staticmethod
    def create_plot(data, plot_type='scatter', x=None, y=None):
        """
        Create a seaborn plot and return as base64 string
        """
        try:
            df = pd.DataFrame(data)
            plt.figure(figsize=(10, 6))
            
            if plot_type == 'scatter':
                sns.scatterplot(data=df, x=x, y=y)
            elif plot_type == 'line':
                sns.lineplot(data=df, x=x, y=y)
            elif plot_type == 'bar':
                sns.barplot(data=df, x=x, y=y)
                
            # Save to buffer
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            buf.seek(0)
            plt.close()
            
            # Convert to base64
            image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
            return {'image': image_base64}
        except Exception as e:
            return {'error': str(e)}
