import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { updatePrivacidad, updateNotificaciones, deleteAccount } from '../services/api';
import { useMascotaUpdate } from '../context/MascotaContext';
import { useUserPerfil, usePrivacidad, useNotificaciones } from '../hooks/useQueryHooks';
import MateriaList from '../components/MateriaList';

const Toggle = ({ label, description, value, onChange, disabled }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 0',
    borderBottom: '1px solid var(--border)',
    opacity: disabled ? 0.5 : 1,
  }}>
    <div style={{ flex: 1, paddingRight: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{label}</div>
      {description && <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.4 }}>{description}</div>}
    </div>
    <div
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: '44px', height: '26px', borderRadius: '13px', flexShrink: 0,
        background: value ? 'var(--gold)' : 'var(--s3)',
        position: 'relative', cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: value ? '21px' : '3px',
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  </div>
);

const DevBtn = ({ label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', padding: '11px 14px', textAlign: 'left',
      background: 'var(--s2)', border: '1px solid var(--border)',
      borderRadius: '10px', color: 'var(--text)', fontSize: '14px',
      fontWeight: 600, cursor: 'pointer',
    }}
  >
    {label}
  </button>
);

const HELPERS = [
  {
    icon: '🃏',
    title: 'Flashcards y Spaced Repetition',
    content: 'El sistema te muestra cada tarjeta en el momento exacto antes de que la olvides. Cuanto más la respondés bien, más tiempo pasa hasta que vuelve a aparecer. Así memorizás a largo plazo sin repasar todo cada vez.',
  },
  {
    icon: '🎯',
    title: 'Cuestionarios',
    content: 'Preguntas de opción múltiple sobre el contenido de cada unidad. Te ayudan a identificar qué sabés y qué no. Respondé todas para que quede registrado en tu progreso.',
  },
  {
    icon: '📈',
    title: 'Cómo se calcula el progreso',
    content: 'El progreso de una unidad combina: flashcards dominadas, preguntas respondidas, PDFs vistos e infografías vistas. El progreso de una materia es el promedio de todas sus unidades.',
  },
  {
    icon: '🔒',
    title: 'Privacidad',
    content: 'Controlás exactamente qué ven los demás. Tu nombre, foto, arroba, materias y progreso se pueden ocultar de forma independiente. Cambialo cuando quieras desde esta pantalla.',
  },
  {
    icon: '🔥',
    title: 'Racha de estudio',
    content: 'Se registra un día de actividad cada vez que abrís una unidad, respondés flashcards, completás un cuestionario o mirás una infografía o PDF. Si no estudiás un día, la racha vuelve a cero.',
  },
];

const Profile = () => {
  const { user } = useTelegram();
  const navigate = useNavigate();
  const { data: perfil, isLoading: loadingPerfil } = useUserPerfil(user?.id);
  const { data: privacyData } = usePrivacidad(user?.id);
  const { data: notifData } = useNotificaciones(user?.id);

  const [privacy, setPrivacy] = useState(null);
  const [notifConfig, setNotifConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [openHelper, setOpenHelper] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const updateMascota = useMascotaUpdate();
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0=hidden, 1=warning, 2=deleting
  const [devLog, setDevLog] = useState('');
  const versionTaps = React.useRef(0);
  const versionTimer = React.useRef(null);

  const handleVersionTap = () => {
    versionTaps.current += 1;
    clearTimeout(versionTimer.current);
    if (versionTaps.current >= 5) {
      versionTaps.current = 0;
      setShowDevPanel(true);
      setDevLog('');
    } else {
      versionTimer.current = setTimeout(() => { versionTaps.current = 0; }, 1500);
    }
  };

  const runDevAction = async (label, fn) => {
    setDevLog(`⏳ ${label}...`);
    try {
      const result = await fn();
      setDevLog(`✅ ${label}: ${JSON.stringify(result)}`);
    } catch (e) {
      setDevLog(`❌ ${label}: ${e.message}`);
    }
  };

  // Sync React Query data into local state (for optimistic updates)
  React.useEffect(() => { if (privacyData && !privacy) setPrivacy(privacyData); }, [privacyData]);
  React.useEffect(() => { if (notifData && !notifConfig) setNotifConfig(notifData); }, [notifData]);

  useEffect(() => {
    if (!updateMascota || !perfil) return;
    const materias_count = (perfil.materias_cursando?.length ?? 0) + (perfil.materias_completadas?.length ?? 0);
    const datos = {
      nombre_usuario: perfil.first_name,
      racha: perfil.racha,
      materias_count,
    };
    updateMascota({ pantalla: 'perfil', datos });
    window.dispatchEvent(new CustomEvent('mascota:event', {
      detail: { accion: 'enter', pantalla: 'perfil', datos },
    }));
  }, [perfil]); // eslint-disable-line

  const loading = loadingPerfil;

  const handleToggle = useCallback(async (key, val) => {
    if (saving) return;
    setPrivacy(prev => ({ ...prev, [key]: val }));
    setSaving(true);
    try {
      const updated = await updatePrivacidad(user.id, { [key]: val });
      setPrivacy(updated);
    } catch (e) {
      console.error(e);
      setPrivacy(prev => ({ ...prev, [key]: !val })); // revert
    } finally {
      setSaving(false);
    }
  }, [saving, user?.id]);

  const handleNotifChange = useCallback(async (key, val) => {
    if (saving) return;
    setNotifConfig(prev => ({ ...prev, [key]: val }));
    setSaving(true);
    try {
      const updated = await updateNotificaciones(user.id, { [key]: val });
      setNotifConfig(updated);
    } catch (e) {
      console.error(e);
      setNotifConfig(prev => ({ ...prev, [key]: notifConfig[key] })); // revert
    } finally {
      setSaving(false);
    }
  }, [saving, user?.id, notifConfig]);

  if (loading) {
    return (
      <div className="screen active screen-container" id="screen-profile">
        <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text2)' }}>
          Cargando perfil...
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="screen active screen-container" id="screen-profile">
        <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text2)' }}>
          No se pudo cargar el perfil
        </div>
      </div>
    );
  }

  const fullName = `${perfil.first_name} ${perfil.last_name || ''}`.trim();
  const username = user?.username ? `@${user.username}` : null;

  return (
    <>
    <div className="screen active screen-container" id="screen-profile">
      <div className="profile-body">

        {/* Avatar + nombre */}
        <div className="profile-hero">
          <div className="profile-avatar-big">
            {perfil.foto_url
              ? <img src={perfil.foto_url} alt="Avatar" />
              : <span style={{ fontSize: '36px' }}>👤</span>
            }
          </div>
          <div className="profile-name">{fullName || 'Estudiante'}</div>
          {username && <div className="profile-user">{username}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '10px auto 0' }}>
            <div className="streak-pill">
              🔥 {perfil.racha} {perfil.racha === 1 ? 'día' : 'días'}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'var(--s2)', border: '1px solid var(--border)',
                borderRadius: '10px', width: '34px', height: '34px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Materias */}
        {(perfil.materias_cursando.length === 0 && perfil.materias_completadas.length === 0) ? (
          <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '14px', padding: '24px 16px' }}>
            No seguís ninguna materia todavía
          </div>
        ) : (
          <>
            {perfil.materias_cursando.length > 0 && (
              <>
                <div className="section-head" style={{ padding: '0 16px', marginTop: '20px', marginBottom: '10px' }}>
                  <div className="section-title">📚 Cursando</div>
                </div>
                <MateriaList materias={perfil.materias_cursando} isOwnProfile navigate={navigate} />
              </>
            )}
            {perfil.materias_completadas.length > 0 && (
              <>
                <div className="section-head" style={{ padding: '0 16px', marginTop: '20px', marginBottom: '10px' }}>
                  <div className="section-title">🎓 Completadas</div>
                </div>
                <MateriaList materias={perfil.materias_completadas} isOwnProfile navigate={navigate} />
              </>
            )}
          </>
        )}

        {/* Versión — tocar 5 veces abre el panel de dev */}
        <div
          onClick={handleVersionTap}
          style={{ textAlign: 'center', padding: '32px 16px 32px', color: 'var(--text2)', fontSize: '12px', userSelect: 'none' }}
        >
          DaathApp v1.0
        </div>

      </div>
    </div>

    {/* Settings sheet */}
    {showSettings && (
      <div
        className="overlay show"
        id="settings-overlay"
        onClick={e => { if (e.target.id === 'settings-overlay') setShowSettings(false); }}
      >
        <div className="sheet" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
          <div className="sheet-handle" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 12px' }}>
            <div className="sheet-title" style={{ margin: 0 }}>Configuración</div>
            <button
              onClick={() => setShowSettings(false)}
              style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text2)', cursor: 'pointer', padding: '4px' }}
            >✕</button>
          </div>

          <div style={{ overflowY: 'auto', padding: '0 16px 32px', flex: 1 }}>

            {/* Privacidad */}
            {privacy && (
              <div style={{ marginBottom: '28px' }}>
                <div className="section-head" style={{ marginBottom: '4px' }}>
                  <div className="section-title">🔒 Privacidad</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px', lineHeight: 1.4 }}>
                  Controlá qué información ven otros usuarios sobre vos.
                </div>
                <div style={{ background: 'var(--s2)', borderRadius: '12px', padding: '0 14px', border: '1px solid var(--border)' }}>
                  <Toggle label="Foto de perfil" description="Visible en la lista de seguidores de cada materia." value={privacy.mostrar_foto} onChange={v => handleToggle('mostrar_foto', v)} disabled={saving} />
                  <Toggle label="Nombre" description="Tu nombre visible junto a tu avatar." value={privacy.mostrar_nombre} onChange={v => handleToggle('mostrar_nombre', v)} disabled={saving} />
                  <Toggle label="@Usuario" description="Tu arroba de Telegram en tu perfil público." value={privacy.mostrar_username} onChange={v => handleToggle('mostrar_username', v)} disabled={saving} />
                  <Toggle label="Materias que cursás" description="Qué materias estás siguiendo." value={privacy.mostrar_cursos} onChange={v => handleToggle('mostrar_cursos', v)} disabled={saving} />
                  <Toggle label="Progreso" description="Tu porcentaje de avance." value={privacy.mostrar_progreso} onChange={v => handleToggle('mostrar_progreso', v)} disabled={saving} />
                </div>
              </div>
            )}

            {/* Notificaciones */}
            {notifConfig && (
              <div style={{ marginBottom: '28px' }}>
                <div className="section-head" style={{ marginBottom: '4px' }}>
                  <div className="section-title">🔔 Notificaciones</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px', lineHeight: 1.4 }}>
                  El bot te manda un mensaje cuando aplica. Los horarios son en hora Argentina (ART).
                </div>
                <div style={{ background: 'var(--s2)', borderRadius: '12px', padding: '0 14px', border: '1px solid var(--border)' }}>
                  <Toggle
                    label="Recordatorio diario"
                    description="Te avisa si no estudiaste todavía a la hora que elijas."
                    value={notifConfig.recordatorio_activo}
                    onChange={v => handleNotifChange('recordatorio_activo', v)}
                    disabled={saving}
                  />
                  {notifConfig.recordatorio_activo && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '13px 0', borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Hora del recordatorio</div>
                      <input
                        type="time"
                        value={notifConfig.hora_recordatorio}
                        onChange={e => handleNotifChange('hora_recordatorio', e.target.value)}
                        style={{
                          background: 'var(--s3)', color: 'var(--text)', border: '1px solid var(--border)',
                          borderRadius: '8px', padding: '6px 10px', fontSize: '14px', fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  )}
                  <Toggle
                    label="Racha en riesgo"
                    description="Te alerta a las 21:00 ART si tu racha está en peligro."
                    value={notifConfig.racha_activa}
                    onChange={v => handleNotifChange('racha_activa', v)}
                    disabled={saving}
                  />
                  <Toggle
                    label="Flashcards vencidas"
                    description="Te avisa a las 09:00 ART si tenés tarjetas para repasar."
                    value={notifConfig.flashcards_activa}
                    onChange={v => handleNotifChange('flashcards_activa', v)}
                    disabled={saving}
                  />
                </div>
              </div>
            )}

            {/* Ayuda */}
            <div>
              <div className="section-head" style={{ marginBottom: '12px' }}>
                <div className="section-title">❓ Ayuda</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {HELPERS.map((h, i) => (
                  <div key={i}>
                    <div
                      onClick={() => setOpenHelper(openHelper === i ? null : i)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'var(--s2)', borderRadius: openHelper === i ? '12px 12px 0 0' : '12px',
                        padding: '12px 14px', cursor: 'pointer',
                        border: '1px solid var(--border)',
                        borderBottom: openHelper === i ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>{h.icon}</span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{h.title}</span>
                      </div>
                      <span style={{ color: 'var(--text2)', fontSize: '16px' }}>{openHelper === i ? '▲' : '▼'}</span>
                    </div>
                    {openHelper === i && (
                      <div style={{
                        background: 'var(--s2)', borderRadius: '0 0 12px 12px',
                        padding: '12px 14px', fontSize: '13px', color: 'var(--text2)',
                        lineHeight: 1.6, border: '1px solid var(--border)', borderTop: 'none',
                      }}>
                        {h.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Eliminar cuenta */}
            <div style={{ marginTop: '8px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              {deleteStep === 0 && (
                <button
                  onClick={() => setDeleteStep(1)}
                  style={{
                    width: '100%', padding: '11px 14px', textAlign: 'center',
                    background: 'transparent', border: '1px solid #ff4444',
                    borderRadius: '10px', color: '#ff4444',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Eliminar cuenta
                </button>
              )}
              {deleteStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)',
                    borderRadius: '10px', padding: '12px 14px',
                    fontSize: '13px', color: 'var(--text)', lineHeight: 1.5,
                  }}>
                    <strong style={{ color: '#ff4444' }}>⚠️ Esta acción es irreversible.</strong>
                    {' '}Se eliminarán tu progreso, flashcards, materias seguidas y todos tus datos. La próxima vez que abras la app comenzarás desde cero.
                  </div>
                  <button
                    onClick={async () => {
                      setDeleteStep(2);
                      try {
                        await deleteAccount(user.id);
                        localStorage.clear();
                        window.location.reload();
                      } catch (e) {
                        console.error(e);
                        setDeleteStep(1);
                      }
                    }}
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: '#ff4444', border: 'none',
                      borderRadius: '10px', color: '#fff',
                      fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Sí, eliminar mi cuenta
                  </button>
                  <button
                    onClick={() => setDeleteStep(0)}
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: 'var(--s2)', border: '1px solid var(--border)',
                      borderRadius: '10px', color: 'var(--text2)',
                      fontSize: '14px', cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
              {deleteStep === 2 && (
                <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '14px', padding: '12px' }}>
                  Eliminando datos...
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    )}

    {/* Dev panel — abrí tocando 5 veces la versión */}
    {showDevPanel && (
      <div
        className="overlay show"
        id="dev-panel-overlay"
        onClick={e => { if (e.target.id === 'dev-panel-overlay') setShowDevPanel(false); }}
      >
        <div className="sheet" style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
          <div className="sheet-handle" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 12px' }}>
            <div className="sheet-title" style={{ margin: 0 }}>🛠 Dev tools</div>
            <button onClick={() => setShowDevPanel(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--text2)', cursor: 'pointer', padding: '4px' }}>✕</button>
          </div>

          <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

            <DevBtn label="🔴 Test Sentry error" onClick={() => runDevAction('Sentry error', async () => {
              const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
              const secret = import.meta.env.VITE_ADMIN_SECRET;
              const r = await fetch(`${API_URL}/debug/sentry-test`, { headers: { 'X-Admin-Token': secret } });
              const data = await r.json();
              if (!r.ok) return { status: r.status, detail: data.detail ?? data };
              return data;
            })} />

            <DevBtn label="📡 Health check" onClick={() => runDevAction('Health', async () => {
              const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
              const r = await fetch(`${API_URL}/usuarios/${user?.id}/stats`);
              return { status: r.status, ok: r.ok };
            })} />

            <DevBtn label="🐾 Test mascota: flashcard complete" onClick={() => {
              window.dispatchEvent(new CustomEvent('mascota:flashcard-complete'));
              setDevLog('✅ Evento mascota:flashcard-complete disparado');
            }} />

            <DevBtn label="👁 Mostrar mascota" onClick={() => {
              window.dispatchEvent(new CustomEvent('mascota:show'));
              setDevLog('✅ Evento mascota:show disparado');
              setShowDevPanel(false);
            }} />

            {devLog && (
              <div style={{
                marginTop: '4px', padding: '10px 12px',
                background: 'var(--s3)', borderRadius: '8px',
                fontSize: '12px', color: 'var(--text)', fontFamily: 'monospace',
                wordBreak: 'break-all', lineHeight: 1.5,
              }}>
                {devLog}
              </div>
            )}

            <div style={{ fontSize: '11px', color: 'var(--text2)', textAlign: 'center', marginTop: '4px' }}>
              user id: {user?.id} · {import.meta.env.VITE_API_URL}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Profile;
