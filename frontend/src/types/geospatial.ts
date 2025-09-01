// src/types/geospatial.ts
import type { LatLngExpression, LatLngBounds } from 'leaflet';
import type { Object3D } from 'three';

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface GeospatialData {
  id: string;
  coordinates: Coordinates;
  value: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MapConfig {
  center: LatLngExpression;
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  bounds?: LatLngBounds;
  tileProvider?: TileProvider;
}

export interface TileProvider {
  url: string;
  attribution: string;
  maxZoom?: number;
  subdomains?: string[];
}

export interface Model3D {
  id: string;
  name: string;
  url: string;
  coordinates: Coordinates;
  scale: [number, number, number];
  rotation?: [number, number, number];
  metadata?: Record<string, any>;
}

export interface MarkerData {
  id: string;
  coordinates: Coordinates;
  type: 'default' | 'custom' | 'cluster';
  icon?: string;
  popupContent?: string;
  tooltipContent?: string;
  data?: any;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface SpatialAnalysisResult {
  clusters: Coordinates[][];
  heatmap: number[][];
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  };
}