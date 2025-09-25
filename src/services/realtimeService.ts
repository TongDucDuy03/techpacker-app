import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { 
  handleRealtimeUpdate, 
  setConnectionStatus, 
  setError,
  addPendingUpdate,
  removePendingUpdate,
  incrementRetryCount,
  updateLastActivity
} from '../store/slices/realtimeSlice';
import { 
  handleRealtimeUpdate as handleTechPackUpdate 
} from '../store/slices/techPackSlice';
import { 
  handleRealtimeUpdate as handleBOMUpdate 
} from '../store/slices/bomSlice';
import { 
  handleRealtimeUpdate as handleMeasurementUpdate 
} from '../store/slices/measurementSlice';
import { 
  handleRealtimeUpdate as handleConstructionUpdate 
} from '../store/slices/constructionSlice';
import { 
  handleRealtimeUpdate as handleCareUpdate 
} from '../store/slices/careSlice';

class RealtimeService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private subscriptions = new Set<string>();
  private pendingUpdates = new Map<string, any>();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to real-time server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      store.dispatch(setConnectionStatus('connected'));
      store.dispatch(updateLastActivity());
      
      // Rejoin all subscriptions
      this.subscriptions.forEach(techPackId => {
        this.joinTechPack(techPackId);
      });
      
      // Process pending updates
      this.processPendingUpdates();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from real-time server:', reason);
      this.isConnected = false;
      
      store.dispatch(setConnectionStatus('disconnected'));
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.isConnected = false;
      
      store.dispatch(setConnectionStatus('error'));
      store.dispatch(setError(error.message));
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      store.dispatch(setConnectionStatus('connected'));
      store.dispatch(updateLastActivity());
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      this.reconnectAttempts = attemptNumber;
      
      store.dispatch(setConnectionStatus('connecting'));
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
      store.dispatch(setError(error.message));
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
      this.isConnected = false;
      
      store.dispatch(setConnectionStatus('error'));
      store.dispatch(setError('Failed to reconnect to server'));
    });

    // TechPack updates
    this.socket.on('techpack-updated', (data) => {
      console.log('📦 TechPack updated:', data);
      this.handleTechPackUpdate(data);
    });

    // Module-specific updates
    this.socket.on('bom-updated', (data) => {
      console.log('📋 BOM updated:', data);
      this.handleModuleUpdate('bom', data);
    });

    this.socket.on('measurement-updated', (data) => {
      console.log('📏 Measurement updated:', data);
      this.handleModuleUpdate('measurement', data);
    });

    this.socket.on('construction-updated', (data) => {
      console.log('🔧 Construction updated:', data);
      this.handleModuleUpdate('construction', data);
    });

    this.socket.on('care-updated', (data) => {
      console.log('🏷️ Care instructions updated:', data);
      this.handleModuleUpdate('care', data);
    });

    // Validation updates
    this.socket.on('validation-completed', (data) => {
      console.log('✅ Validation completed:', data);
      this.handleValidationUpdate(data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      store.dispatch(setError(error.message || 'Unknown error'));
    });
  }

  private handleTechPackUpdate(data: any) {
    const { techPackId, module, updateData, timestamp } = data;
    
    // Update general realtime state
    store.dispatch(handleRealtimeUpdate({
      techPackId,
      module,
      updateData,
      timestamp
    }));
    
    // Update specific module state
    this.handleModuleUpdate(module, { techPackId, updateData, timestamp });
  }

  private handleModuleUpdate(module: string, data: any) {
    const { techPackId, updateData, timestamp } = data;
    
    switch (module) {
      case 'bom':
        store.dispatch(handleBOMUpdate({ techPackId, module, updateData }));
        break;
      case 'measurement':
        store.dispatch(handleMeasurementUpdate({ techPackId, module, updateData }));
        break;
      case 'construction':
        store.dispatch(handleConstructionUpdate({ techPackId, module, updateData }));
        break;
      case 'care':
        store.dispatch(handleCareUpdate({ techPackId, module, updateData }));
        break;
      default:
        store.dispatch(handleTechPackUpdate({ techPackId, module, updateData, timestamp }));
    }
  }

  private handleValidationUpdate(data: any) {
    // This would update the validation state
    console.log('Validation update received:', data);
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.socket?.connect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  private processPendingUpdates() {
    this.pendingUpdates.forEach((update, id) => {
      this.sendUpdate(update);
      this.pendingUpdates.delete(id);
    });
  }

  // Public methods
  public connect() {
    if (!this.socket || this.isConnected) return;
    
    this.socket.connect();
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      this.subscriptions.clear();
      this.pendingUpdates.clear();
    }
  }

  public joinTechPack(techPackId: string) {
    if (!this.socket || !this.isConnected) {
      // Store for later when connected
      this.subscriptions.add(techPackId);
      return;
    }

    this.socket.emit('join-techpack', techPackId);
    this.subscriptions.add(techPackId);
    
    console.log(`📦 Joined techpack: ${techPackId}`);
  }

  public leaveTechPack(techPackId: string) {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('leave-techpack', techPackId);
    this.subscriptions.delete(techPackId);
    
    console.log(`📦 Left techpack: ${techPackId}`);
  }

  public sendUpdate(data: {
    techPackId: string;
    module: string;
    updateData: any;
  }) {
    if (!this.socket || !this.isConnected) {
      // Store for later when connected
      const id = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.pendingUpdates.set(id, data);
      store.dispatch(addPendingUpdate({ id, type: 'update', data }));
      return;
    }

    this.socket.emit('techpack-update', data);
    store.dispatch(updateLastActivity());
  }

  public sendBOMUpdate(techPackId: string, updateData: any) {
    this.sendUpdate({
      techPackId,
      module: 'bom',
      updateData
    });
  }

  public sendMeasurementUpdate(techPackId: string, updateData: any) {
    this.sendUpdate({
      techPackId,
      module: 'measurement',
      updateData
    });
  }

  public sendConstructionUpdate(techPackId: string, updateData: any) {
    this.sendUpdate({
      techPackId,
      module: 'construction',
      updateData
    });
  }

  public sendCareUpdate(techPackId: string, updateData: any) {
    this.sendUpdate({
      techPackId,
      module: 'care',
      updateData
    });
  }

  public getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      subscriptions: Array.from(this.subscriptions),
      pendingUpdates: this.pendingUpdates.size
    };
  }

  public retryPendingUpdates() {
    this.pendingUpdates.forEach((update, id) => {
      store.dispatch(incrementRetryCount(id));
      this.sendUpdate(update);
    });
  }

  public clearPendingUpdates() {
    this.pendingUpdates.clear();
    store.dispatch(removePendingUpdate('all'));
  }

  // Cleanup
  public destroy() {
    this.disconnect();
    this.socket = null;
    this.subscriptions.clear();
    this.pendingUpdates.clear();
  }
}

// Create singleton instance
export const realtimeService = new RealtimeService();

// Export for use in components
export default realtimeService;
