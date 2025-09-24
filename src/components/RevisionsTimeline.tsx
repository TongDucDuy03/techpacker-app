import React, { useEffect, useState } from 'react';
import { api, isApiConfigured } from '../lib/api';

interface RevisionsTimelineProps {
  techpackId: string;
}

export function RevisionsTimeline({ techpackId }: RevisionsTimelineProps) {
  const [revisions, setRevisions] = useState<any[]>([]);
  const [commentText, setCommentText] = useState<string>('');
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>('');

  useEffect(() => {
    if (!isApiConfigured()) return;
    (async () => {
      const data = await api.listRevisions(techpackId);
      setRevisions(data);
    })();
  }, [techpackId]);

  const addComment = async () => {
    if (!selectedRevisionId || !commentText.trim()) return;
    const comment = {
      id: `c${Date.now()}`,
      user: 'You',
      message: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = await api.addRevisionComment(selectedRevisionId, comment);
    setRevisions(prev => prev.map(r => r.id === updated.id ? updated : r));
    setCommentText('');
  };

  const approve = async (revId: string) => {
    const updated = await api.approveRevision(revId);
    setRevisions(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const reject = async (revId: string) => {
    const updated = await api.rejectRevision(revId);
    setRevisions(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  if (!isApiConfigured()) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Revision History</h3>
        <p className="text-sm text-gray-500">Set VITE_API_BASE_URL to enable revision tracking.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Revision History</h3>
      <div className="space-y-4">
        {revisions.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Version v{r.version} • {new Date(r.createdAt).toLocaleString()}</div>
              <span className={`px-2 py-1 rounded text-xs ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
            </div>
            <div className="text-sm text-gray-700 mb-2">By {r.user}</div>
            <details className="text-sm text-gray-800">
              <summary className="cursor-pointer select-none">View change details</summary>
              <pre className="mt-2 bg-gray-50 p-2 rounded overflow-auto text-xs">{JSON.stringify(r.changes, null, 2)}</pre>
            </details>
            <div className="mt-3 space-y-2">
              <div className="text-sm font-medium">Comments</div>
              <div className="space-y-1">
                {(r.comments || []).map((c: any) => (
                  <div key={c.id} className="text-sm text-gray-800">
                    <span className="font-medium">{c.user}</span>: {c.message}
                    <span className="text-gray-500 ml-2">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                ))}
                {(r.comments || []).length === 0 && (
                  <div className="text-sm text-gray-500">No comments.</div>
                )}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 border rounded px-3 py-2" placeholder="Add a comment" value={selectedRevisionId === r.id ? commentText : ''} onChange={(e) => { setSelectedRevisionId(r.id); setCommentText(e.target.value); }} />
                <button className="px-3 py-2 border rounded" onClick={addComment}>Comment</button>
                <button className="px-3 py-2 border rounded text-green-700" onClick={() => approve(r.id)}>Approve</button>
                <button className="px-3 py-2 border rounded text-red-700" onClick={() => reject(r.id)}>Reject</button>
              </div>
            </div>
          </div>
        ))}
        {revisions.length === 0 && <div className="text-sm text-gray-500">No revisions yet.</div>}
      </div>
    </div>
  );
}


