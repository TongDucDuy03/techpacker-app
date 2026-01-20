import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ApiTechPack, TechPack } from '../../../types/techpack';
import { useAuth } from '../../../contexts/AuthContext';
import { Info, Upload, X, AlertCircle, CheckCircle, Plus, Edit, Trash2, Copy } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';
import { api } from '../../../lib/api';
import ZoomableImage from '../../common/ZoomableImage';
import Modal from '../shared/Modal';
import Textarea from '../shared/Textarea';

interface PackingTabProps {
  techPack: TechPack;
  mode?: 'create' | 'edit' | 'view';
  onUpdate?: (updates: Partial<ApiTechPack>) => void;
  canEdit?: boolean;
  isReadOnly?: boolean;
}

interface PackingItem {
  id: string;
  imageUrl: string;
  noteText: string; // Plain text, not HTML
}

// Simple ID generator
const generateId = (): string => {
  return `packing-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

// Helper to extract plain text from HTML
const htmlToPlainText = (html: string): string => {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent || doc.body.innerText || '';
};

// Helper to convert plain text to HTML (escape and wrap in <p>)
const plainTextToHtml = (text: string): string => {
  if (!text) return '';
  // Escape HTML entities
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  // Wrap in <p> tags, preserving line breaks
  return escaped.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('');
};

// Helper to extract list of packing items (ảnh + ghi chú) từ HTML cũ
const parsePackingNotes = (html?: string): PackingItem[] => {
  if (!html) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const layouts = Array.from(doc.querySelectorAll('.packing-layout'));

    // Nếu đã có layout mới: mỗi .packing-layout là 1 item
    if (layouts.length > 0) {
      return layouts.map((el, index) => {
        const imageEl =
          el.querySelector('.packing-layout__image img') ||
          el.querySelector('img');

        const noteEl =
          el.querySelector('.packing-layout__note') || el;

        const imageUrl = imageEl?.getAttribute('src') || '';

        // Convert HTML to plain text
        const noteText = htmlToPlainText(noteEl.innerHTML || '');

        return {
          id: generateId() + '-' + index,
          imageUrl,
          noteText,
        };
      });
    }

    // Fallback: HTML cũ chỉ có 1 block text, không có cấu trúc packing-layout
    const bodyClone = doc.body.cloneNode(true) as HTMLElement;
    bodyClone.querySelectorAll('img').forEach((img) => img.remove());
    const noteText = htmlToPlainText(bodyClone.innerHTML || html);

    return [{
      id: generateId(),
      imageUrl: '',
      noteText,
    }];
  } catch {
    return [{
      id: generateId(),
      imageUrl: '',
      noteText: htmlToPlainText(html || ''),
    }];
  }
};

// Helper build HTML từ danh sách items
const buildPackingNotesHtml = (items: PackingItem[]): string => {
  if (!items || items.length === 0) return '';

  const blocks = items
    .map((item) => {
      const hasImage = item.imageUrl && item.imageUrl.trim().length > 0;
      const hasNote = item.noteText && item.noteText.trim().length > 0;
      if (!hasImage && !hasNote) return '';

      const imgBlock = hasImage
        ? `<div class="packing-layout__image"><img src="${item.imageUrl}" alt="Packing Image" /></div>`
        : '';

      // Convert plain text to HTML
      const noteHtml = hasNote ? plainTextToHtml(item.noteText) : '';
      const noteBlock = noteHtml
        ? `<div class="packing-layout__note">${noteHtml}</div>`
        : '';

      return `<div class="packing-layout">${imgBlock}${noteBlock}</div>`;
    })
    .filter(Boolean);

  return blocks.join('');
};

// Helper for building public URL similar to Construction tab
const getPublicImageUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';
  const strippedBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const FILE_BASE_URL = strippedBase || API_BASE_URL;

  const trimmed = rawUrl.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const sanitizedPath = parsed.pathname.replace(/^\/api\/v1/, '');
      return `${parsed.origin}${sanitizedPath}${parsed.search}${parsed.hash}`;
    } catch {
      return trimmed;
    }
  }

  const sanitizedPath = trimmed.replace(/^\/api\/v1/, '');
  if (sanitizedPath.startsWith('/')) {
    return `${FILE_BASE_URL}${sanitizedPath}`;
  }
  return `${FILE_BASE_URL}/${sanitizedPath}`;
};

const PackingTab: React.FC<PackingTabProps> = ({ techPack, mode, onUpdate, canEdit: propCanEdit }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  
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

  const initialItems = useMemo(
    () => parsePackingNotes(techPack.packingNotes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [techPack.id]
  );

  const [items, setItems] = useState<PackingItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalNoteValue, setModalNoteValue] = useState<string>('');
  const [modalImageUrl, setModalImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const updatePackingNotes = useCallback(
    (nextItems: PackingItem[]) => {
      const html = buildPackingNotesHtml(nextItems);
      onUpdate?.({ packingNotes: html });
    },
    [onUpdate]
  );

  useEffect(() => {
    const parsedItems = parsePackingNotes(techPack.packingNotes);
    setItems(parsedItems);
  }, [techPack.packingNotes]);

  const handleNoteChange = (value: string) => {
    setModalNoteValue(value);
  };

  const handleDuplicate = (item: PackingItem) => {
    setEditingId(null);
    setModalNoteValue(item.noteText || '');
    setModalImageUrl(item.imageUrl || '');
    setUploadError(null);
    setShowModal(true);
  };

  const wordCount = useMemo(() => {
    const combinedText = items.map((i) => i.noteText || '').join(' ');
    const text = combinedText.trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [items]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload JPEG, PNG, GIF, or SVG image.');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setUploadError('Image is too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formDataObj = new FormData();
    formDataObj.append('constructionImage', file);

    try {
      const response = await api.post('/techpacks/upload-construction-image', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.success && response.data.data?.url) {
        const uploadedUrl = getPublicImageUrl(response.data.data.url);
        setModalImageUrl(uploadedUrl);
        setUploadError(null);
      } else {
        setUploadError(response.data?.message || 'Upload image failed.');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Upload image failed.';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setModalNoteValue('');
    setModalImageUrl('');
    setUploadError(null);
    setShowModal(true);
  };

  const openEditModal = (item: PackingItem) => {
    setEditingId(item.id);
    setModalNoteValue(item.noteText || '');
    setModalImageUrl(item.imageUrl || '');
    setUploadError(null);
    setShowModal(true);
  };

  const handleDeleteItem = (id: string) => {
    if (!window.confirm(t('form.packing.deleteConfirm'))) {
      return;
    }
    const nextItems = items.filter((i) => i.id !== id);
    setItems(nextItems);
    updatePackingNotes(nextItems);
  };

  const handleSaveModal = () => {
    const noteText = modalNoteValue.trim();
    const hasImage = modalImageUrl && modalImageUrl.trim().length > 0;
    const hasNote = noteText.length > 0;

    // Nếu không có gì thì không lưu
    if (!hasImage && !hasNote) {
      setShowModal(false);
      return;
    }

    let nextItems: PackingItem[];

    if (editingId) {
      nextItems = items.map((item) =>
        item.id === editingId
          ? { ...item, imageUrl: modalImageUrl, noteText }
          : item
      );
    } else {
      const newItem: PackingItem = {
        id: generateId(),
        imageUrl: modalImageUrl,
        noteText,
      };
      nextItems = [...items, newItem];
    }

    setItems(nextItems);
    updatePackingNotes(nextItems);
    setShowModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{t('form.packing.title')}</h2>
            <p className="text-sm text-gray-600">
              {t('form.packing.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{t('form.packing.wordCount', { count: wordCount })}</span>
            <span>•</span>
            <span>{t('form.packing.charCount', { count: Math.max(items.map(i => i.noteText || '').join('').length, 0) })}</span>
          </div>
        </div>

        {/* Danh sách packing giống Construction: 1 dòng ảnh + ghi chú + thao tác */}
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">{t('form.packing.listTitle')}</h3>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('form.packing.addButton')}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('form.packing.imageColumn')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('form.packing.noteColumn')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">
                    {t('form.packing.empty')}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  return (
                    <tr key={item.id}>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="w-32 h-32 border border-gray-200 rounded-md bg-gray-50 flex items-center justify-center overflow-hidden">
                          {item.imageUrl ? (
                            <ZoomableImage
                              src={item.imageUrl}
                              alt="Packing Image"
                              containerClassName="w-full h-full flex items-center justify-center"
                              className="object-contain"
                              fallback={
                                <span className="text-xs text-gray-400 px-2 text-center leading-tight">
                                  {t('form.bom.noImage') || 'No image'}
                                </span>
                              }
                            />
                          ) : (
                            <span className="text-xs text-gray-400 px-2 text-center leading-tight">
                              {t('form.bom.noImage') || 'No image'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 align-top">
                        {item.noteText ? (
                          <p className="whitespace-pre-wrap">{item.noteText}</p>
                        ) : (
                          <span className="text-gray-400 italic">
                            {t('form.packing.noNote')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="text-blue-600 hover:text-blue-900"
                                title={t('common.edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(item)}
                                className="text-purple-600 hover:text-purple-900"
                                title={t('form.packing.duplicate')}
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-600 hover:text-red-900"
                                title={t('common.delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal chỉnh sửa giống Construction: 1 ảnh + 1 ghi chú */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setUploadError(null);
          }}
          title={t('form.packing.modalTitle')}
          size="lg"
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setUploadError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('form.saveDraft')}
              </button>
            </>
          }
        >
          <div className="space-y-6">
            {/* Image field */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {t('form.packing.imageLabel')}
              </label>
              <div
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                  modalImageUrl ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="space-y-2 text-center w-full">
                  {modalImageUrl ? (
                    <>
                      <div className="relative inline-block">
                        <ZoomableImage
                          src={modalImageUrl}
                          alt="Packing Image"
                          containerClassName="max-w-full h-auto max-h-56 rounded-lg shadow-sm border border-gray-200 bg-white"
                          className="max-h-56"
                          fallback={
                            <div className="flex flex-col items-center justify-center text-gray-400 py-12">
                              <Upload className="w-10 h-10 mb-2" />
                              <p className="text-sm">{t('form.cannotDisplayImage') || 'Cannot display image'}</p>
                            </div>
                          }
                        />
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setModalImageUrl('');
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                        <p className="text-xs text-green-600 flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t('form.packing.imageUploaded')}
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="packing-image-upload"
                          className={`relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 ${
                            !canEdit ? 'pointer-events-none opacity-60' : ''
                          }`}
                        >
                          <span>{t('form.uploadImage')}</span>
                          <input
                            id="packing-image-upload"
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml"
                            onChange={handleImageUpload}
                            disabled={!canEdit || uploading}
                          />
                        </label>
                        <p className="pl-1">{t('form.orDragAndDrop')}</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {t('form.packing.imageHint')}
                      </p>
                    </>
                  )}
                  {uploading && (
                    <div className="flex items-center justify-center text-xs text-blue-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                      {t('form.uploading')}
                    </div>
                  )}
                  {uploadError && (
                    <p className="text-xs text-red-600 flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {uploadError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Note field - Textarea giống Construction */}
            <Textarea
              label={t('form.packing.noteLabel')}
              value={modalNoteValue}
              onChange={handleNoteChange}
              placeholder={t('form.packing.placeholder')}
              rows={6}
              disabled={!canEdit}
            />
          </div>
        </Modal>

        {/* <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
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
        </div> */}
      </div>
    </div>
  );
};

export default PackingTab;

