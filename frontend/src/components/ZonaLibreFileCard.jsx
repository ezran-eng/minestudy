import React from 'react';
import { useTranslation } from 'react-i18next';

const FILE_ICONS = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  img: '🖼️',
  default: '📁',
};

function getIcon(nombre) {
  const ext = nombre.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return FILE_ICONS.img;
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export default function ZonaLibreFileCard({ archivo, onDownload, onReport }) {
  const { t } = useTranslation();
  return (
    <div
      onClick={() => onDownload?.(archivo)}
      style={{
        background: '#000000',
        border: '1px solid #1a1a1a',
        borderRadius: '14px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {/* File icon */}
      <div style={{
        width: '42px', height: '42px', borderRadius: '12px',
        background: '#0a0a0a', border: '1px solid #1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '20px', flexShrink: 0,
      }}>
        {getIcon(archivo.nombre)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '13px', fontWeight: 600,
          color: '#FFFFF0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {archivo.nombre}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '11px', color: '#666', marginTop: '3px',
        }}>
          <span>{formatSize(archivo.tamanio)}</span>
          <span>·</span>
          <span>{formatDate(archivo.fecha)}</span>
          {archivo.username && (
            <>
              <span>·</span>
              <span style={{ color: '#555' }}>@{archivo.username}</span>
            </>
          )}
        </div>
      </div>

      {/* Storage badge */}
      <div style={{
        padding: '3px 8px', borderRadius: '8px',
        background: 'rgba(240,240,240,0.06)',
        border: '1px solid #1a1a1a',
        fontFamily: "'Silkscreen', cursive",
        fontSize: '8px', fontWeight: 700, letterSpacing: '0.06em',
        color: '#666', flexShrink: 0,
      }}>
        {archivo.bag_id?.startsWith('r2://') ? 'R2' : 'TON'}
      </div>

      {/* Report button */}
      <div
        onClick={(e) => { e.stopPropagation(); onReport?.(archivo); }}
        style={{
          fontSize: '10px', color: '#333',
          cursor: 'pointer', padding: '4px',
          flexShrink: 0,
        }}
      >
        reportar
      </div>
    </div>
  );
}
