import React from 'react';

const PDFViewer = ({ isOpen, onClose, pdf }) => {
  if (!isOpen || !pdf) return null;

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 44);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000',
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
        background: '#000',
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

      {/* PDF iframe — Google Docs Viewer for compatibility on low-end Android */}
      <iframe
        src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdf.url)}&embedded=true`}
        title={pdf.titulo}
        style={{
          flex: 1,
          border: 'none',
          width: '100%',
          background: '#fff',
        }}
      />
    </div>
  );
};

export default PDFViewer;
