import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Quill from 'quill';
import { ApiTechPack, TechPack } from '../../../types/techpack';
import { useAuth } from '../../../contexts/AuthContext';
import { Info } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';

// Import Clipboard and Delta for custom plain text paste handler
const Clipboard: any = Quill.import('modules/clipboard');
const Delta: any = Quill.import('delta');

// Track if paste handler is currently processing to prevent duplicate execution
// Use WeakMap to track per-instance to avoid conflicts between multiple editors
const pasteInProgress = new WeakMap<any, boolean>();

// Custom clipboard class that forces plain text paste only
// This prevents any HTML formatting, boxes, or duplicate content
class PlainTextClipboard extends Clipboard {
  onPaste(e: ClipboardEvent) {
    // Check if paste is already in progress for this Quill instance
    if (pasteInProgress.get(this.quill)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }

    if (!e || !e.clipboardData) {
      // Fallback to default if clipboard data unavailable
      return super.onPaste(e);
    }

    // Mark as processing for this instance
    pasteInProgress.set(this.quill, true);

    try {
      // Prevent default paste behavior completely
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Get plain text only - no HTML, no formatting
      const text = e.clipboardData.getData('text/plain') || '';
      
      if (!text.trim()) {
        pasteInProgress.delete(this.quill);
        return false;
      }

      // Get current selection
      const range = this.quill.getSelection(true);
      const index = range ? range.index : this.quill.getLength();
      const length = range ? range.length : 0;

      // Insert plain text only - no formatting attributes
      const delta = new Delta()
        .retain(index)
        .delete(length)
        .insert(text);

      // Use 'user' source but ensure it only fires once
      this.quill.updateContents(delta, 'user');
      this.quill.setSelection(index + text.length, 0, 'silent');
      
      // Clear the flag after a short delay to allow the operation to complete
      setTimeout(() => {
        pasteInProgress.delete(this.quill);
      }, 100);
      
      return false; // Prevent further processing
    } catch (error) {
      pasteInProgress.delete(this.quill);
      console.error('Paste error:', error);
      return false;
    }
  }
}

// Register custom clipboard globally
Quill.register('modules/clipboard', PlainTextClipboard, true);

interface PackingTabProps {
  techPack: TechPack;
  mode?: 'create' | 'edit' | 'view';
  onUpdate?: (updates: Partial<ApiTechPack>) => void;
  canEdit?: boolean;
  isReadOnly?: boolean;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, false] }],
    [{ font: [] }],
    [{ size: [] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
    [{ color: [] }, { background: [] }],
    [{ script: 'sub' }, { script: 'super' }],
    [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['link', 'image', 'video'],
    ['clean'],
  ],
  clipboard: {
    matchVisual: false,
  },
  history: {
    delay: 500,
    maxStack: 100,
    userOnly: true,
  },
};

const quillFormats = [
  'header',
  'font',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'blockquote',
  'code-block',
  'color',
  'background',
  'script',
  'list',
  'bullet',
  'check',
  'indent',
  'align',
  'link',
  'image',
  'video',
];

const PackingTab: React.FC<PackingTabProps> = ({ techPack, mode, onUpdate, canEdit: propCanEdit, isReadOnly: propIsReadOnly }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const quillRef = useRef<ReactQuill>(null);
  
  // Use canEdit from props if provided, otherwise calculate it
  let canEdit: boolean;
  if (propCanEdit !== undefined) {
    canEdit = propCanEdit;
  } else {
    // Fallback: calculate canEdit based on mode and user role
    // Get user's techpack role for this specific techpack
    const getUserTechPackRole = (): string | undefined => {
      if (!user || !techPack) return undefined;
      
      const userId = String((user as any)?.id || (user as any)?._id || '');
      
      // Check if user is owner
      const createdBy = (techPack as any).createdBy;
      const createdById = createdBy && typeof createdBy === 'object' ? createdBy._id : createdBy;
      if (createdById && String(createdById) === userId) {
        return 'owner';
      }
      
      // Check if user is global admin
      if (user.role?.toLowerCase() === 'admin') {
        return 'admin';
      }
      
      // Check sharedWith array - also check in techpack state if available
      let sharedWith = (techPack as any).sharedWith || [];
      const shared = sharedWith.find((s: any) => {
        const shareUserId = s.userId?._id?.toString() || s.userId?.toString();
        return shareUserId === userId;
      });
      
      return shared?.role?.toLowerCase();
    };
    
    const userTechPackRole = getUserTechPackRole();
    
    // Allow edit if:
    // 1. Mode is 'create' (new techpack) - always allow
    // 2. User has global role admin/designer AND techpack role is owner/admin/editor
    canEdit = mode === 'create' || (
      (user?.role === 'admin' || user?.role === 'designer') &&
      (userTechPackRole === 'owner' || userTechPackRole === 'admin' || userTechPackRole === 'editor')
    );
  }
  // Debug logging
  console.log('[PackingTab] Permission check:', {
    mode,
    userRole: user?.role,
    propCanEdit,
    canEdit,
    techPackId: (techPack as any).id,
    sharedWithCount: (techPack as any).sharedWith?.length || 0
  });

  const [value, setValue] = useState<string>(techPack.packingNotes || '');

  useEffect(() => {
    setValue(techPack.packingNotes || '');
  }, [techPack.packingNotes]);

  const handleChange = (content: string) => {
    setValue(content);
    onUpdate?.({ packingNotes: content });
  };

  const handleClear = () => {
    setValue('');
    onUpdate?.({ packingNotes: '' });
  };

  const wordCount = useMemo(() => {
    const text = value
      ?.replace(/<[^>]+>/g, ' ')
      ?.replace(/\s+/g, ' ')
      ?.trim();
    if (!text) return 0;
    return text.split(' ').length;
  }, [value]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{t('form.packing.title')}</h2>
            <p className="text-sm text-gray-600">
              {t('form.packing.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{t('form.packing.wordCount', { count: wordCount })}</span>
            <span>•</span>
            <span>{t('form.packing.charCount', { count: Math.max(value?.length ?? 0, 0) })}</span>
            {/* Hidden: Clear button */}
            {/* <span>•</span>
            <button
              type="button"
              onClick={handleClear}
              disabled={!canEdit}
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 disabled:opacity-50"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              {t('form.packing.clear')}
            </button> */}
          </div>
        </div>

        <div className={`rounded-xl border ${canEdit ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
          <ReactQuill
            key={`quill-${canEdit ? 'editable' : 'readonly'}`}
            ref={quillRef}
            theme="snow"
            value={value}
            onChange={handleChange}
            readOnly={!canEdit}
            modules={canEdit ? quillModules : { toolbar: false }}
            formats={quillFormats}
            placeholder={canEdit ? t('form.packing.placeholder') : ''}
            className="min-h-[420px]"
          />
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-1">
              <p className="font-medium">{t('form.packing.tipsTitle')}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t('form.packing.tip1')}</li>
                <li>{t('form.packing.tip2')}</li>
                <li>{t('form.packing.tip3')}</li>
                <li>{t('form.packing.tip4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingTab;

