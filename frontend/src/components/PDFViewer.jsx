import React, { useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PDFViewer = ({ isOpen, onClose, pdf }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 44);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    console.error('[PDFViewer] load error:', err);
    setLoading(false);
    setError('No se pudo cargar el PDF. Intenta de nuevo.');
  }, []);

  if (!isOpen || !pdf) return null;

  const containerWidth = Math.min(window.innerWidth, 800);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#1a1a1a',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: `${safeTop}px`,
        paddingBottom: '14px',
        paddingLeft: '16px',
        paddingRight: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        background: '#111',
      }}>
        <span style={{ color: 'var(--text2)', fontSize: '13px', minWidth: '36px' }}>📄</span>
        <span style={{
          color: 'var(--text)', fontSize: '14px', fontWeight: 600,
          flex: 1, textAlign: 'center', padding: '0 12px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {pdf.titulo}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'var(--text)',
            fontSize: '22px', cursor: 'pointer', lineHeight: 1,
            padding: '2px 6px', minWidth: '36px', textAlign: 'right',
          }}
        >✕</button>
      </div>

      {/* PDF content */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          background: '#2a2a2a',
        }}
      >
        {error ? (
          <div style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '40px', textAlign: 'center', padding: '0 24px' }}>
            {error}
          </div>
        ) : (
          <Document
            file={pdf.url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '40px' }}>
                Cargando PDF...
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              width={containerWidth}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              loading={
                <div style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '20px' }}>
                  Cargando página...
                </div>
              }
            />
          </Document>
        )}
      </div>

      {/* Navigation bar */}
      {numPages && numPages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '12px 16px',
          background: '#111',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            style={{
              background: pageNumber <= 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)',
              border: 'none', borderRadius: '8px',
              color: pageNumber <= 1 ? 'rgba(255,255,255,0.3)' : '#fff',
              fontSize: '18px', cursor: pageNumber <= 1 ? 'default' : 'pointer',
              width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >‹</button>

          <span style={{ color: 'var(--text)', fontSize: '14px', minWidth: '80px', textAlign: 'center' }}>
            {pageNumber} / {numPages}
          </span>

          <button
            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            style={{
              background: pageNumber >= numPages ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)',
              border: 'none', borderRadius: '8px',
              color: pageNumber >= numPages ? 'rgba(255,255,255,0.3)' : '#fff',
              fontSize: '18px', cursor: pageNumber >= numPages ? 'default' : 'pointer',
              width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >›</button>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
