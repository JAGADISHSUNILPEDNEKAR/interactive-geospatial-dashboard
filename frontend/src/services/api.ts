// src/services/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async getGeospatialData(timeRange: string = '24h', bounds?: string) {
    const params = new URLSearchParams({ time_range: timeRange });
    if (bounds) params.append('bounds', bounds);
    
    return this.request(`/api/data/geospatial?${params}`);
  }

  async getVisualizationData(vizType: string) {
    return this.request(`/api/visualizations/${vizType}`);
  }

  async get3DModels() {
    return this.request('/api/models/3d');
  }

  async addSensorData(data: any) {
    return this.request('/api/data/sensor', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async performSpatialAnalysis(type: string, points: number[][], options?: any) {
    return this.request('/api/data/spatial-analysis', {
      method: 'POST',
      body: JSON.stringify({ type, points, ...options }),
    });
  }
}

export const api = new ApiService();