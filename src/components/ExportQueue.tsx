import React, { useState, useEffect } from 'react';
import { ExportQueue as ExportQueueType, ExportJob, ExportStatus, ExportFormat } from '../types';
import { 
  Play, 
  Pause, 
  Square, 
  RefreshCw, 
  Download, 
  Trash2, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Settings
} from 'lucide-react';

interface ExportQueueProps {
  queue: ExportQueueType;
  onQueueUpdate: (queue: ExportQueueType) => void;
  className?: string;
}

export const ExportQueue: React.FC<ExportQueueProps> = ({
  queue,
  onQueueUpdate,
  className = ''
}) => {
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<ExportStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'status' | 'name'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const updateQueue = (updates: Partial<ExportQueueType>) => {
    onQueueUpdate({ ...queue, ...updates, updatedAt: new Date() });
  };

  const updateJob = (jobId: string, updates: Partial<ExportJob>) => {
    const updatedJobs = queue.jobs.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    );
    updateQueue({ jobs: updatedJobs });
  };

  const startQueue = () => {
    if (queue.isProcessing) return;
    
    updateQueue({ isProcessing: true });
    processNextJob();
  };

  const pauseQueue = () => {
    updateQueue({ isProcessing: false });
  };

  const stopQueue = () => {
    updateQueue({ 
      isProcessing: false, 
      currentJob: undefined 
    });
    
    // Cancel all pending jobs
    queue.jobs.forEach(job => {
      if (job.status === 'processing') {
        updateJob(job.id, { status: 'cancelled' });
      }
    });
  };

  const processNextJob = async () => {
    const pendingJob = queue.jobs.find(job => job.status === 'pending');
    if (!pendingJob) {
      updateQueue({ isProcessing: false, currentJob: undefined });
      return;
    }

    updateQueue({ currentJob: pendingJob.id });
    updateJob(pendingJob.id, { 
      status: 'processing', 
      startedAt: new Date() 
    });

    // Simulate job processing
    try {
      await simulateJobProcessing(pendingJob);
      updateJob(pendingJob.id, { 
        status: 'completed', 
        progress: 100,
        completedAt: new Date(),
        fileSize: Math.floor(Math.random() * 5000000) + 1000000,
        downloadUrl: `#download-${pendingJob.id}`
      });
    } catch (error) {
      updateJob(pendingJob.id, { 
        status: 'failed', 
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Process next job if queue is still running
    if (queue.isProcessing) {
      setTimeout(processNextJob, 1000);
    }
  };

  const simulateJobProcessing = async (job: ExportJob) => {
    const steps = [
      'Initializing...',
      'Processing template...',
      'Generating content...',
      'Optimizing images...',
      'Finalizing document...'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateJob(job.id, { progress: (i + 1) * 20 });
    }
  };

  const removeJob = (jobId: string) => {
    const updatedJobs = queue.jobs.filter(job => job.id !== jobId);
    updateQueue({ jobs: updatedJobs });
  };

  const removeSelectedJobs = () => {
    const updatedJobs = queue.jobs.filter(job => !selectedJobs.includes(job.id));
    updateQueue({ jobs: updatedJobs });
    setSelectedJobs([]);
  };

  const retryJob = (jobId: string) => {
    updateJob(jobId, { 
      status: 'pending', 
      progress: 0, 
      errorMessage: undefined,
      startedAt: undefined,
      completedAt: undefined
    });
  };

  const downloadJob = (job: ExportJob) => {
    if (job.downloadUrl) {
      // In real app, this would trigger actual download
      console.log(`Downloading ${job.fileName}`);
    }
  };

  const getStatusIcon = (status: ExportStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled': return <Square className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ExportStatus) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'PDF': return <FileText className="w-4 h-4 text-red-500" />;
      case 'DOCX': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'XLSX': return <FileText className="w-4 h-4 text-green-500" />;
      case 'HTML': return <FileText className="w-4 h-4 text-orange-500" />;
      case 'JSON': return <FileText className="w-4 h-4 text-purple-500" />;
    }
  };

  const filteredJobs = queue.jobs
    .filter(job => filterStatus === 'all' || job.status === filterStatus)
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const pendingJobs = queue.jobs.filter(job => job.status === 'pending').length;
  const completedJobs = queue.jobs.filter(job => job.status === 'completed').length;
  const failedJobs = queue.jobs.filter(job => job.status === 'failed').length;

  return (
    <div className={`export-queue ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Queue</h3>
            <p className="text-sm text-gray-600">
              Manage and monitor your PDF export jobs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={startQueue}
              disabled={queue.isProcessing || pendingJobs === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Start Queue
            </button>
            <button
              onClick={pauseQueue}
              disabled={!queue.isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
            <button
              onClick={stopQueue}
              disabled={!queue.isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          </div>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{pendingJobs}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {queue.isProcessing ? '1' : '0'}
              </div>
              <div className="text-sm text-gray-600">Processing</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{completedJobs}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{failedJobs}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ExportStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'created' | 'status' | 'name')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created">Created Date</option>
                <option value="status">Status</option>
                <option value="name">File Name</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedJobs.length > 0 && (
              <button
                onClick={removeSelectedJobs}
                className="flex items-center gap-2 px-3 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Remove Selected ({selectedJobs.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedJobs.length === filteredJobs.length && filteredJobs.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedJobs(filteredJobs.map(job => job.id));
                      } else {
                        setSelectedJobs([]);
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Job</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Progress</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Format</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredJobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedJobs.includes(job.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedJobs([...selectedJobs, job.id]);
                        } else {
                          setSelectedJobs(selectedJobs.filter(id => id !== job.id));
                        }
                      }}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{job.fileName}</div>
                      <div className="text-sm text-gray-500">Tech Pack ID: {job.techPackId}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getFormatIcon(job.format)}
                      <span className="text-sm text-gray-600">{job.format}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600">
                      <div>{job.createdAt.toLocaleDateString()}</div>
                      <div className="text-xs">{job.createdAt.toLocaleTimeString()}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {job.status === 'completed' && job.downloadUrl && (
                        <button
                          onClick={() => downloadJob(job)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {job.status === 'failed' && (
                        <button
                          onClick={() => retryJob(job.id)}
                          className="text-yellow-600 hover:text-yellow-700"
                          title="Retry"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => removeJob(job.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No jobs found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Current Job Info */}
      {queue.currentJob && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="font-medium">Currently Processing</span>
          </div>
          <div className="text-sm text-blue-600">
            {queue.jobs.find(job => job.id === queue.currentJob)?.fileName}
          </div>
        </div>
      )}
    </div>
  );
};
