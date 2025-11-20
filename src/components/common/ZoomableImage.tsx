import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import clsx from 'clsx';

interface ZoomableImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  containerClassName?: string;
  enableZoom?: boolean;
  fit?: 'contain' | 'cover';
  fallback?: React.ReactNode;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({
  src,
  alt = 'Preview image',
  className = '',
  containerClassName = '',
  enableZoom = true,
  fit = 'contain',
  fallback = null,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = useMemo(() => {
    if (!src) return '';
    if (typeof src !== 'string') return '';
    return src.trim();
  }, [src]);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || hasError) {
    return (
      <div className={clsx('flex items-center justify-center', containerClassName)}>
        {fallback}
      </div>
    );
  }

  const image = (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      className={clsx(
        'w-full h-full',
        fit === 'contain' ? 'object-contain' : 'object-cover',
        className
      )}
    />
  );

  return (
    <>
      <div className={clsx('relative group', containerClassName)}>
        {image}
        {enableZoom && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsZoomed(true);
            }}
            className="absolute top-3 right-3 inline-flex items-center justify-center rounded-full bg-black/40 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/80"
            aria-label="Phóng to hình ảnh"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isZoomed && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resolvedSrc}
              alt={alt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setIsZoomed(false)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full p-2 shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Đóng phóng to"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ZoomableImage;

