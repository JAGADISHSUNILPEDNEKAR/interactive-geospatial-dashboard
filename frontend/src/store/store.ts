// src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import mapReducer from './slices/mapSlice';
import dataReducer from './slices/dataSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    map: mapReducer,
    data: dataReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['map/setMapInstance'],
        ignoredPaths: ['map.instance'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;