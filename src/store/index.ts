import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import reducers
import techPackReducer from './slices/techPackSlice';
import bomReducer from './slices/bomSlice';
import measurementReducer from './slices/measurementSlice';
import constructionReducer from './slices/constructionSlice';
import careReducer from './slices/careSlice';
import validationReducer from './slices/validationSlice';
import uiReducer from './slices/uiSlice';
import realtimeReducer from './slices/realtimeSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['techPack', 'ui'], // Only persist these reducers
  blacklist: ['realtime'], // Don't persist realtime data
};

// Root reducer
const rootReducer = combineReducers({
  techPack: techPackReducer,
  bom: bomReducer,
  measurement: measurementReducer,
  construction: constructionReducer,
  care: careReducer,
  validation: validationReducer,
  ui: uiReducer,
  realtime: realtimeReducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['_persist'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Store hooks
export { useAppDispatch, useAppSelector } from './hooks';
