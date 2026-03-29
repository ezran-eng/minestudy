import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import RedoMini from '../components/RedoMini';
import ZonaLibreOnboarding from './ZonaLibreOnboarding';
import ZonaLibreUpload from '../components/ZonaLibreUpload';
import ZonaLibreFileCard from '../components/ZonaLibreFileCard';
import { useTelegram } from '../hooks/useTelegram';
import { zonaLibreList, zonaLibreUpload, zonaLibreReport } from '../services/api';

export default function ZonaLibre() {
  const { t } = useTranslation();
  const { user } = useTelegram();
  const userId = user?.id;

  const REPORT_MOTIVOS = [
    { id: 'inapropiado', label: t('zonaLibre.reportInappropriate') },
    { id: 'copyright', label: t('zonaLibre.reportCopyright') },
    { id: 'spam', label: t('zonaLibre.reportSpam') },
    { id: 'otro', label: t('zonaLibre.reportOther') },
  ];

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [archivos, setArchivos] = useState([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [maxBytes, setMaxBytes] = useState(300 * 1024 * 1024);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState(null);

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 0);

  // Check onboarding
  useEffect(() => {
    const visto = localStorage.getItem('zona_libre_onboarding_visto');
    if (!visto) {
      setShowOnboarding(true);
    }
    setOnboardingChecked(true);
  }, []);

  // Load files
  const loadArchivos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await zonaLibreList();
      setArchivos(data.archivos || []);
      if (data.total_bytes != null) setTotalBytes(data.total_bytes);
      if (data.max_bytes != null) setMaxBytes(data.max_bytes);
    } catch (e) {
      console.error('[ZonaLibre] load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (onboardingChecked && !showOnboarding) {
      loadArchivos();
    }
  }, [onboardingChecked, showOnboarding, loadArchivos]);

  const handleUpload = async (file, descripcion) => {
    const res = await zonaLibreUpload(userId, file, descripcion);
    loadArchivos();
    return res;
  };

  const handleDownload = (archivo) => {
    // R2 files have direct public URLs, TON files go through our API
    if (archivo.bag_id.startsWith('r2://')) {
      const r2Key = archivo.bag_id.slice(5);
      window.open(`https://pub-d070e7bf4b014f54acc4915474377809.r2.dev/${r2Key}`, '_blank');
    } else {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      window.open(`${API_URL}/zona-libre/archivo/${archivo.bag_id}`, '_blank');
    }
  };

  const handleReport = async (motivo) => {
    if (!reportTarget || !userId) return;
    try {
      await zonaLibreReport(reportTarget.id, userId, motivo);
      setReportTarget(null);
      loadArchivos();
    } catch (e) {
      console.error('[ZonaLibre] report error:', e);
    }
  };

  if (!onboardingChecked) return null;

  if (showOnboarding) {
    return <ZonaLibreOnboarding onEnter={() => setShowOnboarding(false)} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      paddingTop: `${safeTop}px`,
      paddingBottom: '90px',
    }}>
      <div style={{ padding: '20px 16px' }}>
        {/* Header */}
        <div style={{
          fontFamily: "'Silkscreen', cursive",
          fontSize: '10px', fontWeight: 700,
          color: '#333', letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '6px',
        }}>
          ZONA LIBRE
        </div>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '24px', fontWeight: 700,
          color: '#FFFFF0',
          marginBottom: '4px',
        }}>
          Archivos libres
        </div>
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '12px', color: '#666',
          marginBottom: '20px',
        }}>
          descentralizado · inborrable · tuyo
        </div>

        {/* Redo banner */}
        {(() => {
          const pct = maxBytes > 0 ? totalBytes / maxBytes : 0;
          const isNearFull = pct >= 0.9;
          const usedMB = (totalBytes / (1024 * 1024)).toFixed(1);
          const maxMB = Math.round(maxBytes / (1024 * 1024));
          return (
            <div style={{
              background: '#000000',
              border: '1px solid #1a1a1a',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: '10px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <RedoMini size={40} />
                <div style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '12px', color: '#999', lineHeight: 1.5,
                }}>
                  {isNearFull
                    ? 'La Zona Libre se está llenando... disfrutala mientras dure 👁'
                    : 'Nadie puede borrar esto. Los archivos aquí viven en la red TON — sin servidores, sin censura.'}
                </div>
              </div>
              {/* Capacity bar */}
              <div>
                <div style={{
                  height: '4px', borderRadius: '2px',
                  background: '#1a1a1a', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: '2px',
                    width: `${Math.min(pct * 100, 100)}%`,
                    background: isNearFull
                      ? 'linear-gradient(90deg, #e07070, #c04040)'
                      : 'linear-gradient(90deg, #555, #888)',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '10px', color: '#444', marginTop: '4px',
                }}>
                  {usedMB} MB de {maxMB} MB usados
                </div>
              </div>
            </div>
          );
        })()}

        {/* Redo thought bubble — TON network status */}
        {(() => {
          const [open, setOpen] = React.useState(false);
          return (
            <div style={{ marginBottom: '20px' }}>
              <div
                onClick={() => setOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  cursor: 'pointer',
                }}
              >
                {/* Redo mini avatar */}
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: '#0a0a0a', border: '1px solid #1a1a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', flexShrink: 0, marginTop: '2px',
                }}>
                  👁
                </div>
                {/* Bubble */}
                <div style={{
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  flex: 1,
                }}>
                  <div style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '11px', color: '#555',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span>{t('zonaLibre.tonStatusTitle')}</span>
                    <span style={{ fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
                  </div>
                  {open && (
                    <div style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '12px', color: '#555',
                      lineHeight: 1.6, marginTop: '8px',
                    }}>
                      <p style={{ margin: '0 0 8px' }}>
                        ✅ <span style={{ color: '#666' }}>{t('zonaLibre.tonStatusOk')}</span>
                      </p>
                      <p style={{ margin: '0 0 8px' }}>
                        ⚠️ <span style={{ color: '#666' }}>{t('zonaLibre.tonStatusWarning')}</span>
                      </p>
                      <p style={{ margin: '0' }}>
                        🔮 <span style={{ color: '#555' }}>{t('zonaLibre.tonStatusFuture')}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* File list */}
        <div style={{
          fontFamily: "'Silkscreen', cursive",
          fontSize: '9px', fontWeight: 700,
          color: '#333', letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          ARCHIVOS EN LA RED
        </div>

        {loading && (
          <div style={{
            textAlign: 'center', padding: '40px 0',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '13px', color: '#333',
          }}>
            Cargando...
          </div>
        )}

        {!loading && archivos.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '40px 0',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '13px', color: '#333',
            lineHeight: 1.6,
          }}>
            No hay archivos todavía.
            <br />
            Sé el primero en subir algo.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {archivos.map(a => (
            <ZonaLibreFileCard
              key={a.id}
              archivo={a}
              onDownload={handleDownload}
              onReport={setReportTarget}
            />
          ))}
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <ZonaLibreUpload
          onUpload={handleUpload}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Report bottom sheet */}
      {reportTarget && (
        <div
          onClick={() => setReportTarget(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 2700,
            display: 'flex', alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '420px',
              background: '#000000',
              borderTop: '1px solid #1a1a1a',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
              animation: 'ob-fade-up 0.2s ease-out',
            }}
          >
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px', fontWeight: 600, color: '#FFFFF0',
              marginBottom: '4px',
            }}>
              Reportar archivo
            </div>
            <div style={{
              fontSize: '12px', color: '#666',
              marginBottom: '16px',
            }}>
              {reportTarget.nombre}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {REPORT_MOTIVOS.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleReport(m.id)}
                  style={{
                    background: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '13px', color: '#FFFFF0',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setReportTarget(null)}
              style={{
                marginTop: '12px',
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid #1a1a1a',
                borderRadius: '12px',
                padding: '12px',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '13px', color: '#666',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
