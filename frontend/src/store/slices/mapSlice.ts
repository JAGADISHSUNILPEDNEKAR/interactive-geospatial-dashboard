// src/store/slices/mapSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { MapConfig, Model3D, MarkerData } from '@/types';

interface MapState {
  config: MapConfig;
  models: Model3D[];
  markers: MarkerData[];
  selectedTileProvider: string;
  is3DEnabled: boolean;
}

const initialState: MapState = {
  config: {
    center: [51.505, -0.09],
    zoom: 13,
    minZoom: 2,
    maxZoom: 19,
  },
  models: [],
  markers: [],
  selectedTileProvider: 'osm',
  is3DEnabled: true,
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setMapConfig: (state, action: PayloadAction<Partial<MapConfig>>) => {
      state.config = { ...state.config, ...action.payload };
    },
    setModels: (state, action: PayloadAction<Model3D[]>) => {
      state.models = action.payload;
    },
    addModel: (state, action: PayloadAction<Model3D>) => {
      state.models.push(action.payload);
    },
    setMarkers: (state, action: PayloadAction<MarkerData[]>) => {
      state.markers = action.payload;
    },
    addMarker: (state, action: PayloadAction<MarkerData>) => {
      state.markers.push(action.payload);
    },
    setTileProvider: (state, action: PayloadAction<string>) => {
      state.selectedTileProvider = action.payload;
    },
    toggle3D: (state) => {
      state.is3DEnabled = !state.is3DEnabled;
    },
  },
});

export const {
  setMapConfig,
  setModels,
  addModel,
  setMarkers,
  addMarker,
  setTileProvider,
  toggle3D,
} = mapSlice.actions;

export default mapSlice.reducer;
