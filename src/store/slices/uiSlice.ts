import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  // Navigation
  currentPage: string;
  sidebarCollapsed: boolean;
  breadcrumbs: Array<{
    label: string;
    path: string;
  }>;
  
  // Modals and dialogs
  modals: {
    isOpen: boolean;
    type: string | null;
    data: any;
  };
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
  }>;
  
  // Loading states
  loading: {
    global: boolean;
    techPack: boolean;
    bom: boolean;
    measurement: boolean;
    construction: boolean;
    care: boolean;
    validation: boolean;
  };
  
  // Theme and appearance
  theme: {
    mode: 'light' | 'dark';
    primaryColor: string;
    fontSize: 'small' | 'medium' | 'large';
  };
  
  // User preferences
  preferences: {
    autoSave: boolean;
    autoValidate: boolean;
    realtimeUpdates: boolean;
    notifications: boolean;
    compactMode: boolean;
  };
  
  // Form states
  forms: {
    techPackForm: {
      isDirty: boolean;
      hasErrors: boolean;
      lastSaved: number | null;
    };
    bomForm: {
      isDirty: boolean;
      hasErrors: boolean;
      lastSaved: number | null;
    };
    measurementForm: {
      isDirty: boolean;
      hasErrors: boolean;
      lastSaved: number | null;
    };
    constructionForm: {
      isDirty: boolean;
      hasErrors: boolean;
      lastSaved: number | null;
    };
    careForm: {
      isDirty: boolean;
      hasErrors: boolean;
      lastSaved: number | null;
    };
  };
  
  // Search and filters
  search: {
    query: string;
    filters: Record<string, any>;
    results: any[];
    isSearching: boolean;
  };
  
  // Offline mode
  offline: {
    isOffline: boolean;
    pendingChanges: number;
    lastSync: number | null;
  };
}

const initialState: UIState = {
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  breadcrumbs: [],
  
  modals: {
    isOpen: false,
    type: null,
    data: null
  },
  
  notifications: [],
  
  loading: {
    global: false,
    techPack: false,
    bom: false,
    measurement: false,
    construction: false,
    care: false,
    validation: false
  },
  
  theme: {
    mode: 'light',
    primaryColor: '#3b82f6',
    fontSize: 'medium'
  },
  
  preferences: {
    autoSave: true,
    autoValidate: true,
    realtimeUpdates: true,
    notifications: true,
    compactMode: false
  },
  
  forms: {
    techPackForm: {
      isDirty: false,
      hasErrors: false,
      lastSaved: null
    },
    bomForm: {
      isDirty: false,
      hasErrors: false,
      lastSaved: null
    },
    measurementForm: {
      isDirty: false,
      hasErrors: false,
      lastSaved: null
    },
    constructionForm: {
      isDirty: false,
      hasErrors: false,
      lastSaved: null
    },
    careForm: {
      isDirty: false,
      hasErrors: false,
      lastSaved: null
    }
  },
  
  search: {
    query: '',
    filters: {},
    results: [],
    isSearching: false
  },
  
  offline: {
    isOffline: false,
    pendingChanges: 0,
    lastSync: null
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Navigation
    setCurrentPage: (state, action: PayloadAction<string>) => {
      state.currentPage = action.payload;
    },
    
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    
    setBreadcrumbs: (state, action: PayloadAction<UIState['breadcrumbs']>) => {
      state.breadcrumbs = action.payload;
    },
    
    addBreadcrumb: (state, action: PayloadAction<{
      label: string;
      path: string;
    }>) => {
      state.breadcrumbs.push(action.payload);
    },
    
    removeBreadcrumb: (state, action: PayloadAction<number>) => {
      state.breadcrumbs.splice(action.payload, 1);
    },
    
    // Modals
    openModal: (state, action: PayloadAction<{
      type: string;
      data?: any;
    }>) => {
      state.modals = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data || null
      };
    },
    
    closeModal: (state) => {
      state.modals = {
        isOpen: false,
        type: null,
        data: null
      };
    },
    
    // Notifications
    addNotification: (state, action: PayloadAction<{
      type: 'success' | 'error' | 'warning' | 'info';
      title: string;
      message: string;
    }>) => {
      const notification = {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...action.payload,
        timestamp: Date.now(),
        read: false
      };
      state.notifications.unshift(notification);
      
      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    
    markAllNotificationsAsRead: (state) => {
      state.notifications.forEach(n => n.read = true);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Loading states
    setLoading: (state, action: PayloadAction<{
      key: keyof UIState['loading'];
      loading: boolean;
    }>) => {
      state.loading[action.payload.key] = action.payload.loading;
    },
    
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    
    // Theme
    setTheme: (state, action: PayloadAction<Partial<UIState['theme']>>) => {
      state.theme = { ...state.theme, ...action.payload };
    },
    
    toggleTheme: (state) => {
      state.theme.mode = state.theme.mode === 'light' ? 'dark' : 'light';
    },
    
    // Preferences
    setPreferences: (state, action: PayloadAction<Partial<UIState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    
    // Form states
    setFormState: (state, action: PayloadAction<{
      form: keyof UIState['forms'];
      state: Partial<UIState['forms'][keyof UIState['forms']]>;
    }>) => {
      const { form, state: formState } = action.payload;
      state.forms[form] = { ...state.forms[form], ...formState };
    },
    
    markFormAsDirty: (state, action: PayloadAction<keyof UIState['forms']>) => {
      state.forms[action.payload].isDirty = true;
    },
    
    markFormAsClean: (state, action: PayloadAction<keyof UIState['forms']>) => {
      state.forms[action.payload].isDirty = false;
      state.forms[action.payload].lastSaved = Date.now();
    },
    
    setFormErrors: (state, action: PayloadAction<{
      form: keyof UIState['forms'];
      hasErrors: boolean;
    }>) => {
      const { form, hasErrors } = action.payload;
      state.forms[form].hasErrors = hasErrors;
    },
    
    // Search
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.search.query = action.payload;
    },
    
    setSearchFilters: (state, action: PayloadAction<Record<string, any>>) => {
      state.search.filters = action.payload;
    },
    
    setSearchResults: (state, action: PayloadAction<any[]>) => {
      state.search.results = action.payload;
    },
    
    setSearching: (state, action: PayloadAction<boolean>) => {
      state.search.isSearching = action.payload;
    },
    
    clearSearch: (state) => {
      state.search.query = '';
      state.search.filters = {};
      state.search.results = [];
      state.search.isSearching = false;
    },
    
    // Offline mode
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.offline.isOffline = action.payload;
    },
    
    setPendingChanges: (state, action: PayloadAction<number>) => {
      state.offline.pendingChanges = action.payload;
    },
    
    setLastSync: (state, action: PayloadAction<number>) => {
      state.offline.lastSync = action.payload;
    },
    
    // Reset
    resetUI: () => initialState
  }
});

export const {
  setCurrentPage,
  toggleSidebar,
  setSidebarCollapsed,
  setBreadcrumbs,
  addBreadcrumb,
  removeBreadcrumb,
  openModal,
  closeModal,
  addNotification,
  removeNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotifications,
  setLoading,
  setGlobalLoading,
  setTheme,
  toggleTheme,
  setPreferences,
  setFormState,
  markFormAsDirty,
  markFormAsClean,
  setFormErrors,
  setSearchQuery,
  setSearchFilters,
  setSearchResults,
  setSearching,
  clearSearch,
  setOfflineMode,
  setPendingChanges,
  setLastSync,
  resetUI
} = uiSlice.actions;

export default uiSlice.reducer;
