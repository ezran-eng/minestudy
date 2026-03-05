import React, { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const PDFViewer = ({ isOpen, onClose, pdf }) => {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(null);

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 44);

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    console.error('[PDFViewer] load error:', err);
    setError('No se pudo cargar el PDF. Intenta de nuevo.');
  }, []);

  if (!isOpen || !pdf) return null;

  const pageWidth = Math.min(window.innerWidth, 800);

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

      {/* Scrollable PDF content — all pages stacked */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: '#2a2a2a',
        display: 'flex',
        justifyContent: 'center',
      }}>
        {error ? (
          <div style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '40px', textAlign: 'center', padding: '0 24px' }}>
            {error}
          </div>
        ) : (
          <Document
            key={pdf.id}
            file={`${API_URL}/pdfs/${pdf.id}/file`}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '40px' }}>
                Cargando PDF...
              </div>
            }
          >
            {numPages && Array.from({ length: numPages }, (_, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </div>
            ))}
          </Document>
        )}
      </div>

      {/* Page count indicator */}
      {numPages && numPages > 1 && (
        <div style={{
          textAlign: 'center',
          padding: '8px',
          background: '#111',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          fontSize: '12px',
          color: 'var(--text2)',
        }}>
          {numPages} páginas · deslizá para leer
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
