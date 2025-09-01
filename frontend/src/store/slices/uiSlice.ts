// src/store/slices/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
  activePanel: string | null;
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>;
}

const initialState: UIState = {
  sidebarOpen: true,
  activePanel: null,
  notifications: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setActivePanel: (state, action: PayloadAction<string | null>) => {
      state.activePanel = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push({
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
  },
});

export const {
  toggleSidebar,
  setActivePanel,
  addNotification,
  removeNotification,
} = uiSlice.actions;

export default uiSlice.reducer;