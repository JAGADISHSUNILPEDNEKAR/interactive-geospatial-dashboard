// src/components/GeospatialMap/GeospatialMap.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box, Button, HStack, Select, useToast } from '@chakra-ui/react';
import { ThreeOverlay } from './ThreeOverlay';
import { useVisualizationSync } from '@/hooks';
import type { Model3D, MarkerData } from '@/types';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface GeospatialMapProps {
  center: [number, number];
  zoom: number;
  modelData?: Model3D[];
  markers?: MarkerData[];
  onMapClick?: (coords: [number, number]) => void;
}

export const GeospatialMap: React.FC<GeospatialMapProps> = ({
  center,
  zoom,
  modelData = [],
  markers = [],
  onMapClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const threeOverlayRef = useRef<ThreeOverlay | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedTileProvider, setSelectedTileProvider] = useState('osm');
  const toast = useToast();
  const { syncVisualizationState } = useVisualizationSync();

  // Tile providers configuration
  const tileProviders = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
    },
    cartoDark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '© CARTO',
    },
    cartoLight: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '© CARTO',
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '© Esri',
    },
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Add initial tile layer
    const tileLayer = L.tileLayer(
      tileProviders.osm.url,
      {
        attribution: tileProviders.osm.attribution,
        maxZoom: 19,
      }
    );
    tileLayer.addTo(map);

    // Create markers layer group
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Initialize Three.js overlay
    const threeOverlay = new ThreeOverlay(map);
    threeOverlay.addTo(map);
    threeOverlayRef.current = threeOverlay;

    // Map event handlers
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    });

    map.on('moveend', () => {
      const bounds = map.getBounds();
      if (syncVisualizationState) {
        syncVisualizationState(bounds, []);
      }
    });

    mapRef.current = map;
    setMapReady(true);

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      threeOverlayRef.current = null;
      markersLayerRef.current = null;
    };
  }, []); // Only run once on mount

  // Update tile provider
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove all tile layers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add new tile layer
    const provider = tileProviders[selectedTileProvider as keyof typeof tileProviders];
    L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: 19,
    }).addTo(mapRef.current);
  }, [selectedTileProvider]);

  // Load and position 3D models
  useEffect(() => {
    if (!mapReady || !threeOverlayRef.current || !modelData.length) return;

    const loader = new GLTFLoader();
    const overlay = threeOverlayRef.current;

    modelData.forEach((model) => {
      loader.load(
        model.url,
        (gltf) => {
          const object = gltf.scene;

          // Convert lat/lng to Three.js coordinates
          const position = overlay.latLngToLayerPoint(
            model.coordinates.latitude,
            model.coordinates.longitude
          );

          object.position.set(position.x, position.y, position.z || 0);
          object.scale.set(...model.scale);

          if (model.rotation) {
            object.rotation.set(...model.rotation);
          }

          overlay.addObject(object);

          toast({
            title: '3D Model Loaded',
            description: `${model.name} has been added to the map`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        },
        (progress) => {
          console.log(`Loading ${model.name}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
          console.error(`Error loading model ${model.name}:`, error);
          toast({
            title: 'Model Loading Failed',
            description: `Failed to load ${model.name}`,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        }
      );
    });
  }, [modelData, mapReady, toast]);

  // Add markers to map
  useEffect(() => {
    if (!mapReady || !markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Add new markers
    markers.forEach((markerData) => {
      const marker = L.marker([
        markerData.coordinates.latitude,
        markerData.coordinates.longitude,
      ]);

      if (markerData.popupContent) {
        marker.bindPopup(markerData.popupContent);
      }

      if (markerData.tooltipContent) {
        marker.bindTooltip(markerData.tooltipContent);
      }

      marker.addTo(markersLayerRef.current!);
    });

    // Implement marker clustering for performance
    if (markers.length > 100) {
      // TODO: Implement marker clustering with Leaflet.markercluster
      console.log('Marker clustering would be implemented for', markers.length, 'markers');
    }
  }, [markers, mapReady]);

  // Handle map controls
  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut();
  }, []);

  const handleResetView = useCallback(() => {
    mapRef.current?.setView(center, zoom);
  }, [center, zoom]);

  const handleToggle3D = useCallback(() => {
    if (threeOverlayRef.current) {
      threeOverlayRef.current.toggle();
    }
  }, []);

  return (
    <Box position="relative" w="100%" h="100%">
      {/* Map container */}
      <Box
        ref={mapContainerRef}
        w="100%"
        h="100%"
        position="absolute"
        top={0}
        left={0}
        zIndex={0}
      />

      {/* Map controls overlay */}
      <Box
        position="absolute"
        top={4}
        right={4}
        zIndex={1000}
        bg="white"
        borderRadius="md"
        p={2}
        shadow="md"
      >
        <HStack spacing={2}>
          <Select
            size="sm"
            value={selectedTileProvider}
            onChange={(e) => setSelectedTileProvider(e.target.value)}
            w="150px"
          >
            <option value="osm">OpenStreetMap</option>
            <option value="cartoDark">Dark Mode</option>
            <option value="cartoLight">Light Mode</option>
            <option value="satellite">Satellite</option>
          </Select>
          <Button size="sm" onClick={handleZoomIn}>+</Button>
          <Button size="sm" onClick={handleZoomOut}>-</Button>
          <Button size="sm" onClick={handleResetView}>Reset</Button>
          <Button size="sm" onClick={handleToggle3D}>3D</Button>
        </HStack>
      </Box>
    </Box>
  );
};