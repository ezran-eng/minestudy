import React, { useState, useEffect, useCallback } from 'react';
import RedoMini from '../components/RedoMini';
import ZonaLibreOnboarding from './ZonaLibreOnboarding';
import ZonaLibreUpload from '../components/ZonaLibreUpload';
import ZonaLibreFileCard from '../components/ZonaLibreFileCard';
import { useTelegram } from '../hooks/useTelegram';
import { zonaLibreList, zonaLibreUpload, zonaLibreReport } from '../services/api';

const REPORT_MOTIVOS = [
  { id: 'inapropiado', label: 'Contenido inapropiado' },
  { id: 'copyright', label: 'Copyright' },
  { id: 'spam', label: 'Spam' },
  { id: 'otro', label: 'Otro' },
];

export default function ZonaLibre() {
  const { user } = useTelegram();
  const userId = user?.id;

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [archivos, setArchivos] = useState([]);
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
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    window.open(`${API_URL}/zona-libre/archivo/${archivo.bag_id}`, '_blank');
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
          color: '#e0e0e0',
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
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1e1e1e',
          borderRadius: '16px',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '16px',
        }}>
          <RedoMini size={40} />
          <div style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '12px', color: '#999', lineHeight: 1.5,
          }}>
            Nadie puede borrar esto. Los archivos aquí viven en la red TON — sin servidores, sin censura.
          </div>
        </div>

        {/* Upload button */}
        <div
          onClick={() => setShowUpload(true)}
          style={{
            background: '#0f0f0f',
            border: '1px solid #2a2a2a',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex', alignItems: 'center', gap: '14px',
            cursor: 'pointer',
            marginBottom: '24px',
            transition: 'background 0.15s',
          }}
        >
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: '#141414', border: '1px solid #2a2a2a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px',
          }}>
            ↑
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '14px', fontWeight: 600, color: '#e0e0e0',
            }}>
              Subir archivo
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
              PDF, apuntes, libros técnicos
            </div>
          </div>
          <div style={{
            padding: '3px 8px', borderRadius: '8px',
            background: 'rgba(240,240,240,0.06)',
            border: '1px solid #1e1e1e',
            fontFamily: "'Silkscreen', cursive",
            fontSize: '8px', fontWeight: 700, letterSpacing: '0.06em',
            color: '#666',
          }}>
            TON
          </div>
        </div>

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
              background: '#0f0f0f',
              borderTop: '1px solid #1e1e1e',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
              animation: 'ob-fade-up 0.2s ease-out',
            }}
          >
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '15px', fontWeight: 600, color: '#e0e0e0',
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
                    background: '#141414',
                    border: '1px solid #1e1e1e',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '13px', color: '#e0e0e0',
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
                border: '1px solid #1e1e1e',
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
