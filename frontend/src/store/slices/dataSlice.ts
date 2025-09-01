// src/store/slices/dataSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { GeospatialData, VisualizationData } from '@/types';

interface DataState {
  geospatialData: GeospatialData[];
  visualizationData: VisualizationData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: DataState = {
  geospatialData: [],
  visualizationData: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setGeospatialData: (state, action: PayloadAction<GeospatialData[]>) => {
      state.geospatialData = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    setVisualizationData: (state, action: PayloadAction<VisualizationData>) => {
      state.visualizationData = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setGeospatialData,
  setVisualizationData,
  setLoading,
  setError,
} = dataSlice.actions;

export default dataSlice.reducer;
