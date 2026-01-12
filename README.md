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
