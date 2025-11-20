import React, { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ApiTechPack, TechPack } from '../../../types/techpack';
import { useAuth } from '../../../contexts/AuthContext';
import { Info, RefreshCcw } from 'lucide-react';

interface PackingTabProps {
  techPack: TechPack;
  mode?: 'create' | 'edit' | 'view';
  onUpdate?: (updates: Partial<ApiTechPack>) => void;
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

const PackingTab: React.FC<PackingTabProps> = ({ techPack, mode, onUpdate }) => {
  const { user } = useAuth();
  const canEdit = !(mode === 'view' || user?.role === 'viewer' || user?.role === 'merchandiser');
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
            <h2 className="text-2xl font-semibold text-gray-900">Packing & Folding Guide</h2>
            <p className="text-sm text-gray-600">
              Paste diagrams, photos, checklists, tables, or instructions exactly as you want them to appear in the PDF.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{Math.max(value?.length ?? 0, 0)} characters</span>
            <span>•</span>
            <button
              type="button"
              onClick={handleClear}
              disabled={!canEdit}
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:text-gray-800 hover:border-gray-400 disabled:opacity-50"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Clear
            </button>
          </div>
        </div>

        <div className={`rounded-xl border ${canEdit ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
          <ReactQuill
            theme="snow"
            value={value}
            onChange={handleChange}
            readOnly={!canEdit}
            modules={quillModules}
            formats={quillFormats}
            placeholder="Drop in your packing workflow, folding diagrams, material breakdowns, QA checklist, carton labels, pallet layout, etc..."
            className="min-h-[420px]"
          />
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-1">
              <p className="font-medium">Tips</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Paste directly from Word, Excel, PDF, or any website. Formatting, tables, and bullet points will be preserved.</li>
                <li>Use the image tool or paste inline images to illustrate folding steps, carton layouts, or labeling requirements.</li>
                <li>Checklists can be created using the checklist button or bullet lists.</li>
                <li>All content is embedded in the Techpack PDF exactly as shown here.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackingTab;

