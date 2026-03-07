import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { getUserPerfil, getPrivacidad, updatePrivacidad, getNotificaciones, updateNotificaciones, testNotificacion } from '../services/api';
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
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [privacy, setPrivacy] = useState(null);
  const [notifConfig, setNotifConfig] = useState(null);
  const [testingNotif, setTestingNotif] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'ok' | 'error'
  const [saving, setSaving] = useState(false);
  const [openHelper, setOpenHelper] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      getUserPerfil(user.id),
      getPrivacidad(user.id).catch(() => null),
      getNotificaciones(user.id).catch(() => null),
    ])
      .then(([p, priv, notif]) => {
        setPerfil(p);
        if (priv) setPrivacy(priv);
        if (notif) setNotifConfig(notif);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [user?.id]);

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

  const handleTestNotif = async () => {
    if (testingNotif) return;
    setTestingNotif(true);
    setTestResult(null);
    try {
      await testNotificacion(user.id);
      setTestResult('ok');
    } catch {
      setTestResult('error');
    } finally {
      setTestingNotif(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

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
          <div className="streak-pill" style={{ margin: '8px auto 0', width: 'fit-content' }}>
            🔥 {perfil.racha} {perfil.racha === 1 ? 'día' : 'días'}
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

        {/* Privacidad */}
        {privacy && (
          <div style={{ padding: '0 16px', marginTop: '28px' }}>
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
          <div style={{ padding: '0 16px', marginTop: '28px' }}>
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
            <button
              onClick={handleTestNotif}
              disabled={testingNotif}
              style={{
                marginTop: '12px', width: '100%', padding: '11px',
                background: 'var(--s3)', color: 'var(--text)',
                borderRadius: '10px', border: '1px solid var(--border)',
                fontWeight: 600, fontSize: '14px', cursor: testingNotif ? 'default' : 'pointer',
                opacity: testingNotif ? 0.6 : 1,
              }}
            >
              {testingNotif ? 'Enviando...' : '🔔 Enviar notificación de prueba'}
            </button>
            {testResult === 'ok' && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#4caf50', textAlign: 'center' }}>
                ✅ Mensaje enviado — revisá el bot @DaathApp_bot
              </div>
            )}
            {testResult === 'error' && (
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#f44336', textAlign: 'center' }}>
                ❌ Error al enviar. ¿Iniciaste el bot con /start?
              </div>
            )}
          </div>
        )}

        {/* Helper */}
        <div style={{ padding: '0 16px', marginTop: '32px', marginBottom: '8px' }}>
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

        {/* Versión */}
        <div style={{ textAlign: 'center', padding: '24px 16px 32px', color: 'var(--text2)', fontSize: '12px' }}>
          DaathApp v1.0
        </div>

      </div>
    </div>
  );
};

export default Profile;
