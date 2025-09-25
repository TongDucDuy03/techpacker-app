import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RealtimeState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivity: number | null;
  subscriptions: string[]; // Array of techpack IDs being subscribed to
  pendingUpdates: Array<{
    id: string;
    type: string;
    data: any;
    timestamp: number;
    retryCount: number;
  }>;
  error: string | null;
}

const initialState: RealtimeState = {
  isConnected: false,
  connectionStatus: 'disconnected',
  lastActivity: null,
  subscriptions: [],
  pendingUpdates: [],
  error: null
};

const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<RealtimeState['connectionStatus']>) => {
      state.connectionStatus = action.payload;
      state.isConnected = action.payload === 'connected';
      
      if (action.payload === 'connected') {
        state.error = null;
        state.lastActivity = Date.now();
      }
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.connectionStatus = 'error';
        state.isConnected = false;
      }
    },
    
    addSubscription: (state, action: PayloadAction<string>) => {
      if (!state.subscriptions.includes(action.payload)) {
        state.subscriptions.push(action.payload);
      }
    },
    
    removeSubscription: (state, action: PayloadAction<string>) => {
      state.subscriptions = state.subscriptions.filter(id => id !== action.payload);
    },
    
    clearSubscriptions: (state) => {
      state.subscriptions = [];
    },
    
    addPendingUpdate: (state, action: PayloadAction<{
      id: string;
      type: string;
      data: any;
    }>) => {
      state.pendingUpdates.push({
        ...action.payload,
        timestamp: Date.now(),
        retryCount: 0
      });
    },
    
    removePendingUpdate: (state, action: PayloadAction<string>) => {
      state.pendingUpdates = state.pendingUpdates.filter(update => update.id !== action.payload);
    },
    
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const update = state.pendingUpdates.find(u => u.id === action.payload);
      if (update) {
        update.retryCount += 1;
      }
    },
    
    clearPendingUpdates: (state) => {
      state.pendingUpdates = [];
    },
    
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    
    // Handle incoming real-time updates
    handleIncomingUpdate: (state, action: PayloadAction<{
      techPackId: string;
      module: string;
      updateData: any;
      timestamp: string;
    }>) => {
      state.lastActivity = Date.now();
      // This will be handled by the specific slice that needs the update
    },
    
    // Handle connection events
    handleConnection: (state) => {
      state.connectionStatus = 'connected';
      state.isConnected = true;
      state.error = null;
      state.lastActivity = Date.now();
    },
    
    handleDisconnection: (state) => {
      state.connectionStatus = 'disconnected';
      state.isConnected = false;
      state.lastActivity = Date.now();
    },
    
    handleReconnection: (state) => {
      state.connectionStatus = 'connecting';
      state.isConnected = false;
      state.error = null;
    },
    
    // Reset state
    reset: () => initialState
  }
});

export const {
  setConnectionStatus,
  setError,
  addSubscription,
  removeSubscription,
  clearSubscriptions,
  addPendingUpdate,
  removePendingUpdate,
  incrementRetryCount,
  clearPendingUpdates,
  updateLastActivity,
  handleIncomingUpdate,
  handleConnection,
  handleDisconnection,
  handleReconnection,
  reset
} = realtimeSlice.actions;

export default realtimeSlice.reducer;
