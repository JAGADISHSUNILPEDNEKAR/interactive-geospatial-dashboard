// src/hooks/useVisualizationSync.ts
import { useState, useCallback, useRef } from 'react';
import type { Map as LeafletMap, LatLngBounds } from 'leaflet';
import * as THREE from 'three';
import * as d3 from 'd3';

export const useVisualizationSync = () => {
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [threeScene, setThreeScene] = useState<THREE.Scene | null>(null);
  const [d3Container, setD3Container] = useState<d3.Selection<any, unknown, null, undefined> | null>(null);
  const syncCallbacksRef = useRef<Set<(bounds: LatLngBounds, data: any[]) => void>>(new Set());

  const syncVisualizationState = useCallback((bounds: LatLngBounds, data: any[]) => {
    // Notify all registered callbacks
    syncCallbacksRef.current.forEach(callback => {
      callback(bounds, data);
    });

    // Update Three.js objects based on map bounds
    if (threeScene && mapInstance) {
      const center = bounds.getCenter();
      const zoom = mapInstance.getZoom();
      
      // Update camera position based on map view
      threeScene.traverse((child) => {
        if (child instanceof THREE.Camera) {
          const scale = Math.pow(2, zoom);
          child.position.z = 1000 / scale;
          child.lookAt(0, 0, 0);
        }
      });
    }

    // Update D3.js visualizations with filtered data
    if (d3Container) {
      // Filter data based on bounds
      const filteredData = data.filter(item => {
        if (item.lat && item.lng) {
          return bounds.contains([item.lat, item.lng]);
        }
        return true;
      });

      // Update D3 visualizations
      d3Container.dispatch('dataUpdate', { detail: filteredData });
    }
  }, [mapInstance, threeScene, d3Container]);

  const registerSyncCallback = useCallback((callback: (bounds: LatLngBounds, data: any[]) => void) => {
    syncCallbacksRef.current.add(callback);
    
    return () => {
      syncCallbacksRef.current.delete(callback);
    };
  }, []);

  return {
    mapInstance,
    setMapInstance,
    threeScene,
    setThreeScene,
    d3Container,
    setD3Container,
    syncVisualizationState,
    registerSyncCallback,
  };
};