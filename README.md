# Interactive Geospatial Dashboard

A production-ready, enterprise-grade geospatial visualization platform featuring real-time data streaming, 3D model integration, and advanced analytics.

## 🚀 Features

### Core Capabilities
- **Interactive Geospatial Mapping**: Leaflet-based maps with multiple tile providers
- **3D Visualization**: Three.js integration for 3D model overlay on maps
- **Real-Time Data Streaming**: WebSocket and SSE for live data updates
- **Advanced Analytics**: D3.js visualizations with Seaborn statistical plots
- **Performance Optimization**: WebAssembly modules for heavy computations
- **Microservices Architecture**: Hybrid Flask/Node.js backend for optimal performance

### Technical Highlights
- **Frontend**: Next.js 14 with TypeScript, ChakraUI, Redux Toolkit
- **Visualization**: Leaflet + Three.js + D3.js integration
- **Backend**: Flask (ML/data processing) + Node.js (real-time/gateway)
- **Database**: SQLite with Redis caching
- **Deployment**: Docker containerization with CI/CD pipeline

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker and Docker Compose
- Git

## 🛠️ Installation

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/your-org/interactive-geospatial-dashboard.git
cd interactive-geospatial-dashboard

# Copy environment variables
cp .env.example .env

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Flask API: http://localhost:5000
# Node.js API: http://localhost:3001
```

### Development Setup

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Flask Service
```bash
cd backend/flask-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

#### Node.js Service
```bash
cd backend/node-service
npm install
npm run dev
```

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Next.js      │────▶│   Node.js       │────▶│     Flask       │
│    Frontend     │     │   Gateway       │     │   ML Service    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                        │
        │                       ▼                        │
        │               ┌─────────────────┐              │
        │               │                 │              │
        └──────────────▶│   WebSocket     │◀─────────────┘
                        │   Real-time     │
                        │                 │
                        └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │                 │
                        │   SQLite/Redis  │
                        │                 │
                        └─────────────────┘
```

## 📁 Project Structure

```
interactive-geospatial-dashboard/
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   ├── store/         # Redux store
│   │   └── types/         # TypeScript definitions
├── backend/
│   ├── flask-service/     # Python Flask service
│   │   ├── app/           # Flask application
│   │   └── tests/         # Python tests
│   └── node-service/      # Node.js service
│       ├── src/           # TypeScript source
│       └── tests/         # Node tests
├── docker/                # Docker configurations
├── wasm/                  # WebAssembly modules
└── .github/               # CI/CD workflows
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Frontend
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001

# Flask Service
FLASK_ENV=development
DATABASE_PATH=./data/dashboard.db
REDIS_URL=redis://localhost:6379

# Node Service
NODE_ENV=development
PORT=3001
FLASK_SERVICE_URL=http://localhost:5000
```

## 📊 API Documentation

### Flask Service Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/data/geospatial` | GET | Get geospatial data with analysis |
| `/api/visualizations/{type}` | GET | Get visualization data |
| `/api/models/3d` | GET | Get 3D model configurations |
| `/api/data/spatial-analysis` | POST | Perform spatial analysis |

### Node.js Service Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stream/realtime` | GET | SSE real-time data stream |
| `/api/stream/subscribe` | POST | Subscribe to WebSocket channel |
| `/health` | GET | Health check endpoint |

## 🧪 Testing

### Run All Tests
```bash
# Frontend tests
cd frontend && npm test

# Flask tests
cd backend/flask-service
pytest --cov=app tests/

# Node.js tests
cd backend/node-service
npm test

# E2E tests
npm run test:e2e
```

### Test Coverage
- Unit Tests: >90% coverage
- Integration Tests: API and data flow testing
- E2E Tests: Critical user journeys
- Performance Tests: Load and stress testing

## 🚀 Deployment

### Production Deployment

1. **Build Docker Images**
```bash
docker-compose -f docker-compose.yml build
```

2. **Run Production Stack**
```bash
docker-compose -f docker-compose.yml up -d
```

3. **Scale Services**
```bash
docker-compose up -d --scale node-service=3
```

### CI/CD Pipeline

The project includes GitHub Actions workflows for:
- Automated testing on pull requests
- Docker image building and pushing
- Automated deployment to production
- Health checks and monitoring

## 📈 Performance Optimization

- **Code Splitting**: Automatic code splitting with Next.js
- **Lazy Loading**: Dynamic imports for heavy components
- **WebAssembly**: WASM modules for computationally intensive tasks
- **Caching**: Redis caching layer for frequently accessed data
- **CDN**: Static assets served through CDN
- **Image Optimization**: Next.js automatic image optimization

## 🔒 Security

- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection
- HTTPS enforcement
- Environment variable management

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, email support@geospatial-dashboard.com or open an issue in the GitHub repository.

## 🙏 Acknowledgments

- OpenStreetMap for map tiles
- Three.js community for 3D visualization
- D3.js for data visualization capabilities
- Flask and Node.js communities