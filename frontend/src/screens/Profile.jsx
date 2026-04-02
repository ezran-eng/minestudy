import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../hooks/useTelegram';
import { updatePrivacidad, updateNotificaciones, deleteAccount } from '../services/api';
import { useMascotaUpdate } from '../context/MascotaContext';
import { useUserPerfil, usePrivacidad, useNotificaciones } from '../hooks/useQueryHooks';
import MateriaList from '../components/MateriaList';
import TonConnectButton from '../components/TonConnectButton';
import GiftGrid from '../components/GiftGrid';
import NftBadge from '../components/NftBadge';
import { updateMateria } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';

// Generate a deterministic color from a string (collection name, gift name, etc.)
const hashColor = (str) => {
  const PALETTE = [
    '#0098EA', '#e05263', '#8b5cf6', '#22c55e', '#f59e0b',
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
    '#ef4444', '#a855f7', '#3b82f6', '#84cc16', '#d946ef',
  ];
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

// Extended trait-to-color map
const TRAIT_COLORS = {
  'onyx black': '#2d2d3d', 'golden': '#c9a227', 'space gray': '#6b7280',
  'red rose': '#c0392b', 'lemon slice': '#eab308', 'purple': '#8b5cf6',
  'blue': '#3b82f6', 'green': '#22c55e', 'pink': '#ec4899',
  'ivory white': '#f5f5dc', 'silver': '#94a3b8', 'bronze': '#cd7f32',
  'ruby': '#e0115f', 'sapphire': '#0f52ba', 'emerald': '#50c878',
  'red': '#ef4444', 'orange': '#f97316', 'yellow': '#eab308',
  'cyan': '#06b6d4', 'teal': '#14b8a6', 'indigo': '#6366f1',
  'violet': '#7c3aed', 'magenta': '#d946ef', 'rose': '#f43f5e',
  'amber': '#f59e0b', 'lime': '#84cc16', 'sky': '#0ea5e9',
  'white': '#e2e8f0', 'black': '#1e1e2e', 'gold': '#c9a227',
  'dark blue': '#1e3a5f', 'dark green': '#166534', 'dark red': '#991b1b',
  'light blue': '#7dd3fc', 'light green': '#86efac', 'light pink': '#fbcfe8',
};

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

const Profile = () => {
  const { t, i18n } = useTranslation();
  const { user } = useTelegram();
  const navigate = useNavigate();

  const HELPERS = [
    { icon: '🃏', title: t('helpers.flashcards.title'), content: t('helpers.flashcards.content') },
    { icon: '🎯', title: t('helpers.quizzes.title'), content: t('helpers.quizzes.content') },
    { icon: '📈', title: t('helpers.progress.title'), content: t('helpers.progress.content') },
    { icon: '🔒', title: t('helpers.privacyHelp.title'), content: t('helpers.privacyHelp.content') },
    { icon: '🔥', title: t('helpers.streak.title'), content: t('helpers.streak.content') },
  ];
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
  // Wallet + NFT state (synced from perfil data)
  const [walletAddress, setWalletAddress] = useState(null);
  const [activeNftAddress, setActiveNftAddress] = useState(null);
  const [activeNftData, setActiveNftData] = useState(null);
  const [giftCount, setGiftCount] = useState(null);
  const [applyGift, setApplyGift] = useState(null); // gift to apply to a materia
  const [activeTab, setActiveTab] = useState('gifts'); // 'gifts' | 'materias'
  const queryClient = useQueryClient();
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

  // Sync wallet data from perfil — only on initial load (ref prevents re-sync after disconnect)
  const walletLoaded = React.useRef(false);
  React.useEffect(() => {
    if (perfil && !walletLoaded.current) {
      walletLoaded.current = true;
      setWalletAddress(perfil.wallet_address || null);
      setActiveNftAddress(perfil.nft_activo_address || null);
    }
  }, [perfil]); // eslint-disable-line

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
          {t('profile.loadingProfile')}
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="screen active screen-container" id="screen-profile">
        <div style={{ textAlign: 'center', marginTop: '50px', color: 'var(--text2)' }}>
          {t('profile.errorProfile')}
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
              {t('home.streak', { count: perfil.racha })}
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

        {/* Active gift badge — shown below avatar */}
        {activeNftData && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
            <NftBadge nftData={activeNftData} size="md" />
          </div>
        )}

        {/* Wallet connect (when not connected) */}
        {!walletAddress && (
          <div style={{ margin: '16px 0 0' }}>
            <TonConnectButton
              walletAddress={null}
              onConnected={(addr) => setWalletAddress(addr)}
              onDisconnected={() => {}}
            />
          </div>
        )}

        {/* Tab bar — Telegram-style */}
        <div style={{
          display: 'flex', margin: '20px -16px 0',
          borderBottom: '1px solid var(--border)',
          position: 'relative',
        }}>
          {[
            { key: 'gifts', label: t('wallet.giftsTitle'), count: giftCount, icon: '🎁' },
            { key: 'materias', label: t('profile.subjectsTab'), count: (perfil.materias_cursando?.length || 0) + (perfil.materias_completadas?.length || 0), icon: '📚' },
          ].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: '12px 0 10px',
                  background: 'none', border: 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  borderBottom: isActive ? '2px solid #0098EA' : '2px solid transparent',
                  transition: 'border-color 0.2s',
                }}
              >
                <span style={{ fontSize: '16px' }}>{tab.icon}</span>
                <span style={{
                  fontSize: '13px', fontWeight: 600,
                  color: isActive ? 'var(--text)' : 'var(--text2)',
                  transition: 'color 0.2s',
                }}>{tab.label}</span>
                {tab.count != null && tab.count > 0 && (
                  <span style={{
                    fontSize: '11px', fontWeight: 700,
                    color: isActive ? '#0098EA' : 'var(--text2)',
                    background: isActive ? 'rgba(0,152,234,0.1)' : 'var(--s2)',
                    borderRadius: '10px', padding: '1px 6px',
                    minWidth: '18px', textAlign: 'center',
                  }}>{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ margin: '0 -16px' }}>
          {/* Gifts tab */}
          {activeTab === 'gifts' && (
            <div>
              {/* Compact wallet button header when connected */}
              {walletAddress && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  padding: '10px 16px 6px',
                }}>
                  <TonConnectButton
                    walletAddress={walletAddress}
                    compact
                    onConnected={(addr) => setWalletAddress(addr)}
                    onDisconnected={() => {
                      setWalletAddress(null);
                      setActiveNftAddress(null);
                      setActiveNftData(null);
                      setGiftCount(null);
                    }}
                  />
                </div>
              )}

              {walletAddress ? (
                <GiftGrid
                  userId={user?.id}
                  activeAddress={activeNftAddress}
                  onNftChange={(addr, nft) => {
                    setActiveNftAddress(addr);
                    setActiveNftData(nft);
                  }}
                  onCountLoaded={(n) => setGiftCount(n)}
                  onApplyToMateria={(gift) => setApplyGift(gift)}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text2)' }}>
                  <div style={{ fontSize: '44px', marginBottom: '12px' }}>💎</div>
                  <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                    {t('wallet.connectToSeeGifts')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Materias tab */}
          {activeTab === 'materias' && (
            <div style={{ padding: '0' }}>
              {(perfil.materias_cursando.length === 0 && perfil.materias_completadas.length === 0) ? (
                <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '14px', padding: '48px 24px' }}>
                  <div style={{ fontSize: '44px', marginBottom: '12px' }}>📚</div>
                  {t('profile.noSubjects')}
                </div>
              ) : (
                <>
                  {perfil.materias_cursando.length > 0 && (
                    <>
                      <div className="section-head" style={{ padding: '0 16px', marginTop: '14px', marginBottom: '10px' }}>
                        <div className="section-title">{t('profile.studying')}</div>
                      </div>
                      <MateriaList materias={perfil.materias_cursando} isOwnProfile navigate={navigate} />
                    </>
                  )}
                  {perfil.materias_completadas.length > 0 && (
                    <>
                      <div className="section-head" style={{ padding: '0 16px', marginTop: '14px', marginBottom: '10px' }}>
                        <div className="section-title">{t('profile.completedSubjects')}</div>
                      </div>
                      <MateriaList materias={perfil.materias_completadas} isOwnProfile navigate={navigate} />
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Versión — tocar 5 veces abre el panel de dev */}
        <div
          onClick={handleVersionTap}
          style={{ textAlign: 'center', padding: '32px 16px 32px', color: 'var(--text2)', fontSize: '12px', userSelect: 'none' }}
        >
          {t('profile.version')}
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
            <div className="sheet-title" style={{ margin: 0 }}>{t('profile.settings')}</div>
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
                  <div className="section-title">{t('profile.privacy')}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px', lineHeight: 1.4 }}>
                  {t('profile.privacyDesc')}
                </div>
                <div style={{ background: 'var(--s2)', borderRadius: '12px', padding: '0 14px', border: '1px solid var(--border)' }}>
                  <Toggle label={t('profile.profilePhoto')} description={t('profile.profilePhotoDesc')} value={privacy.mostrar_foto} onChange={v => handleToggle('mostrar_foto', v)} disabled={saving} />
                  <Toggle label={t('profile.name')} description={t('profile.nameDesc')} value={privacy.mostrar_nombre} onChange={v => handleToggle('mostrar_nombre', v)} disabled={saving} />
                  <Toggle label={t('profile.username')} description={t('profile.usernameDesc')} value={privacy.mostrar_username} onChange={v => handleToggle('mostrar_username', v)} disabled={saving} />
                  <Toggle label={t('profile.subjects')} description={t('profile.subjectsDesc')} value={privacy.mostrar_cursos} onChange={v => handleToggle('mostrar_cursos', v)} disabled={saving} />
                  <Toggle label={t('profile.progress')} description={t('profile.progressDesc')} value={privacy.mostrar_progreso} onChange={v => handleToggle('mostrar_progreso', v)} disabled={saving} />
                  {walletAddress && (
                    <Toggle
                      label={t('wallet.showNft')}
                      description={t('wallet.showNftDesc')}
                      value={privacy.mostrar_nft ?? false}
                      onChange={v => handleToggle('mostrar_nft', v)}
                      disabled={saving}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Notificaciones */}
            {notifConfig && (
              <div style={{ marginBottom: '28px' }}>
                <div className="section-head" style={{ marginBottom: '4px' }}>
                  <div className="section-title">{t('profile.notifications')}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px', lineHeight: 1.4 }}>
                  {t('profile.notifDesc')}
                </div>
                <div style={{ background: 'var(--s2)', borderRadius: '12px', padding: '0 14px', border: '1px solid var(--border)' }}>
                  <Toggle
                    label={t('profile.dailyReminder')}
                    description={t('profile.dailyReminderDesc')}
                    value={notifConfig.recordatorio_activo}
                    onChange={v => handleNotifChange('recordatorio_activo', v)}
                    disabled={saving}
                  />
                  {notifConfig.recordatorio_activo && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '13px 0', borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '14px', color: 'var(--text2)' }}>{t('profile.reminderTime')}</div>
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
                    label={t('profile.streakAtRisk')}
                    description={t('profile.streakAtRiskDesc')}
                    value={notifConfig.racha_activa}
                    onChange={v => handleNotifChange('racha_activa', v)}
                    disabled={saving}
                  />
                  <Toggle
                    label={t('profile.dueFlashcards')}
                    description={t('profile.dueFlashcardsDesc')}
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
                <div className="section-title">{t('profile.help')}</div>
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

            {/* Language */}
            <div style={{ marginBottom: '28px' }}>
              <div className="section-head" style={{ marginBottom: '12px' }}>
                <div className="section-title">{t('profile.language')}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { code: 'en', flag: '\u{1F1EC}\u{1F1E7}', label: 'English' },
                  { code: 'es', flag: '\u{1F1E6}\u{1F1F7}', label: 'Español' },
                ].map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); localStorage.setItem('daathapp_lang', lang.code); }}
                    style={{
                      flex: 1, padding: '11px 14px',
                      background: i18n.language === lang.code ? 'rgba(255,255,240,0.15)' : 'var(--s2)',
                      border: i18n.language === lang.code ? '1px solid var(--gold)' : '1px solid var(--border)',
                      borderRadius: '10px', color: i18n.language === lang.code ? 'var(--gold)' : 'var(--text2)',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {lang.flag} {lang.label}
                  </button>
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
                  {t('profile.deleteAccount')}
                </button>
              )}
              {deleteStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)',
                    borderRadius: '10px', padding: '12px 14px',
                    fontSize: '13px', color: 'var(--text)', lineHeight: 1.5,
                  }}>
                    <strong style={{ color: '#ff4444' }}>{t('profile.deleteWarning')}</strong>
                    {' '}{t('profile.deleteExplain')}
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
                    {t('profile.deleteConfirm')}
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
                    {t('common.cancel')}
                  </button>
                </div>
              )}
              {deleteStep === 2 && (
                <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '14px', padding: '12px' }}>
                  {t('profile.deleting')}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    )}

    {/* Apply gift to materia sheet */}
    {applyGift && perfil && (
      <div
        className="overlay show"
        id="apply-gift-overlay"
        onClick={e => { if (e.target.id === 'apply-gift-overlay') setApplyGift(null); }}
      >
        <div className="sheet">
          <div className="sheet-handle" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '4px 16px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: '#111' }}>
              {applyGift.imagen_url && <img src={applyGift.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{applyGift.nombre || applyGift.coleccion}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>{t('wallet.pickMateriaToStyle')}</div>
            </div>
          </div>

          <div style={{ padding: '10px 12px 32px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
            {[...(perfil.materias_cursando || []), ...(perfil.materias_completadas || [])].map(m => {
              const color = m.color || 'var(--gold)';
              return (
                <button
                  key={m.id}
                  onClick={async () => {
                    const colorTraits = (applyGift.traits || []);
                    let giftColor = null;
                    let symbolName = null;

                    // Extract symbol trait (Símbolo / Symbol)
                    const symbolTrait = colorTraits.find(
                      t => ['symbol', 'símbolo', 'simbolo'].includes(t.trait_type?.toLowerCase())
                    );
                    if (symbolTrait) symbolName = symbolTrait.value;

                    // 1. Try Fondo/Background trait
                    const fondoTrait = colorTraits.find(
                      t => ['fondo', 'background', 'color', 'backdrop'].includes(t.trait_type?.toLowerCase())
                    );
                    if (fondoTrait) {
                      giftColor = TRAIT_COLORS[fondoTrait.value?.toLowerCase()] || null;
                    }

                    // 2. Try any trait value that matches a known color name
                    if (!giftColor) {
                      for (const trait of colorTraits) {
                        const v = (trait.value || '').toLowerCase();
                        if (TRAIT_COLORS[v]) { giftColor = TRAIT_COLORS[v]; break; }
                      }
                    }

                    // 3. Try any trait value that looks like a hex color
                    if (!giftColor) {
                      for (const trait of colorTraits) {
                        const v = (trait.value || '').trim();
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) { giftColor = v; break; }
                      }
                    }

                    // 4. Fallback: generate from gift collection name
                    if (!giftColor) {
                      giftColor = hashColor(applyGift.coleccion || applyGift.nombre || 'gift');
                    }

                    console.log('[apply-gift]', { traits: colorTraits, fondoTrait, giftColor, symbolName, gift: applyGift.nombre });

                    try {
                      await updateMateria(m.id, {
                        color: giftColor,
                        gift_image: applyGift.imagen_url || null,
                      });
                      queryClient.invalidateQueries({ queryKey: ['materias'] });
                      queryClient.invalidateQueries({ queryKey: ['perfil', user?.id] });
                    } catch (e) {
                      console.error('[apply-gift] updateMateria failed:', e);
                    }
                    setApplyGift(null);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: 'var(--s2)', border: '1px solid var(--border)',
                    borderRadius: '14px', padding: '12px 14px',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                    background: `${color}20`, border: `1.5px solid ${color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  }}>
                    {m.emoji || '📚'}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.nombre}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text2)' }}>›</span>
                </button>
              );
            })}
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

            <DevBtn label="📊 AI Analytics" onClick={() => {
              setShowDevPanel(false);
              navigate('/admin/ai');
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
