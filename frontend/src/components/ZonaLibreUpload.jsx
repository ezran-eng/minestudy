import React, { useState, useRef } from 'react';
import Lottie from 'lottie-react';
import mascotaData from '../assets/lotties/mascota.json';

const SEG_IDLE = [67, 89];

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ZonaLibreUpload({ onUpload, onClose }) {
  const [file, setFile] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 0);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const res = await onUpload(file, descripcion);
      setResult(res);
    } catch (e) {
      setError(e.message || 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a0a',
      zIndex: 2600,
      display: 'flex', flexDirection: 'column',
      animation: 'ob-fade-up 0.25s ease-out',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: `${safeTop + 12}px 16px 12px`,
        borderBottom: '1px solid #1e1e1e',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #1e1e1e',
            borderRadius: '10px',
            color: '#666',
            fontSize: '18px', lineHeight: 1,
            padding: '6px 10px', cursor: 'pointer',
          }}
        >←</button>
        <div style={{
          fontFamily: "'Silkscreen', cursive",
          fontSize: '13px', fontWeight: 700,
          color: '#e0e0e0', letterSpacing: '0.04em',
        }}>SUBIR ARCHIVO</div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 16px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        {/* Upload status with Redo */}
        {uploading && (
          <div style={{
            background: '#0f0f0f',
            border: '1px solid #1e1e1e',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
              <Lottie animationData={mascotaData} loop autoplay initialSegment={SEG_IDLE}
                style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '13px', color: '#e0e0e0', lineHeight: 1.5,
            }}>
              Enviando a la red...
            </div>
          </div>
        )}

        {/* Success */}
        {result && (
          <div style={{
            background: '#0f0f0f',
            border: '1px solid rgba(93,191,114,0.2)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
              <Lottie animationData={mascotaData} loop autoplay initialSegment={SEG_IDLE}
                style={{ width: '100%', height: '100%' }} />
            </div>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '13px', color: '#e0e0e0', lineHeight: 1.5,
            }}>
              ¡Archivo en la red! Ya nadie puede borrarlo.
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(200,50,50,0.08)',
            border: '1px solid rgba(200,50,50,0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '13px', color: '#e07070',
          }}>
            {error}
          </div>
        )}

        {/* File selector */}
        {!result && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {!file ? (
              <div
                onClick={() => inputRef.current?.click()}
                style={{
                  background: '#0f0f0f',
                  border: '2px dashed #2a2a2a',
                  borderRadius: '16px',
                  padding: '40px 20px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '32px' }}>↑</div>
                <div style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '14px', fontWeight: 600, color: '#e0e0e0',
                }}>
                  Seleccionar archivo
                </div>
                <div style={{
                  fontSize: '12px', color: '#666',
                }}>
                  PDF, DOC, imágenes
                </div>
              </div>
            ) : (
              <div style={{
                background: '#0f0f0f',
                border: '1px solid #2a2a2a',
                borderRadius: '16px',
                padding: '16px',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: '#141414', border: '1px solid #1e1e1e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>
                    📄
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '13px', fontWeight: 600, color: '#e0e0e0',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      {formatSize(file.size)}
                    </div>
                  </div>
                  <div
                    onClick={() => { setFile(null); setError(null); }}
                    style={{
                      fontSize: '18px', color: '#666', cursor: 'pointer',
                      padding: '4px 8px',
                    }}
                  >
                    ✕
                  </div>
                </div>

                {/* Description */}
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={200}
                  style={{
                    width: '100%',
                    background: '#141414',
                    border: '1px solid #1e1e1e',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '13px',
                    color: '#e0e0e0',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Upload button */}
            {file && !uploading && (
              <button
                onClick={handleUpload}
                style={{
                  background: '#f0f0f0',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontFamily: "'Silkscreen', cursive",
                  fontSize: '12px', fontWeight: 700,
                  color: '#0a0a0a',
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  transition: 'opacity 0.15s',
                }}
              >
                SUBIR A TON
              </button>
            )}
          </>
        )}

        {/* Done button */}
        {result && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(240,240,240,0.08)',
              border: '1px solid #2a2a2a',
              borderRadius: '14px',
              padding: '14px',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '13px', fontWeight: 600,
              color: '#e0e0e0',
              cursor: 'pointer',
            }}
          >
            Volver
          </button>
        )}
      </div>
    </div>
  );
}
