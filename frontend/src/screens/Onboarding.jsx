import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { completeOnboarding } from '../services/api';

const STEPS = 5; // includes language step

const LANGS = [
  { code: 'es', flag: '🇦🇷', label: 'Español' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
];

const Toggle = ({ label, description, value, onChange }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 0',
    borderBottom: '1px solid var(--border)',
  }}>
    <div style={{ flex: 1, paddingRight: '16px' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.4 }}>{description}</div>
    </div>
    <div
      onClick={() => onChange(!value)}
      style={{
        width: '44px', height: '26px', borderRadius: '13px', flexShrink: 0,
        background: value ? 'var(--gold)' : 'var(--s3)',
        position: 'relative', cursor: 'pointer',
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

const Onboarding = ({ user, onComplete }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [privacy, setPrivacy] = useState({
    mostrar_foto: true,
    mostrar_nombre: true,
    mostrar_username: true,
    mostrar_progreso: true,
    mostrar_cursos: true,
  });

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 44);

  const set = (key, val) => setPrivacy(prev => ({ ...prev, [key]: val }));

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await completeOnboarding(user.id, privacy);
      onComplete(privacy);
    } catch (e) {
      console.error('[Onboarding]', e);
      onComplete(privacy); // proceed anyway to not block the user
    }
  };

  const [selectedLang, setSelectedLang] = useState(i18n.language?.slice(0, 2) || 'es');

  const handleLangSelect = (code) => {
    setSelectedLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem('daathapp_lang', code);
  };

  const steps = [
    // Step 0 — Idioma / Language
    <div key="language" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
      <div style={{ fontSize: '56px', marginBottom: '20px' }}>🌐</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', lineHeight: 1.2 }}>
        {t('onboarding.chooseLanguage')}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '32px' }}>
        {t('onboarding.chooseLanguageDesc')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '280px' }}>
        {LANGS.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLangSelect(lang.code)}
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              border: selectedLang === lang.code ? '2px solid var(--gold)' : '2px solid var(--border)',
              background: selectedLang === lang.code ? 'rgba(212,168,71,0.12)' : 'var(--s2)',
              color: selectedLang === lang.code ? 'var(--gold)' : 'var(--text)',
              fontSize: '16px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '24px' }}>{lang.flag}</span>
            <span>{lang.label}</span>
            {selectedLang === lang.code && <span style={{ marginLeft: 'auto', fontSize: '18px' }}>✓</span>}
          </button>
        ))}
      </div>
    </div>,

    // Step 1 — Bienvenida
    <div key="welcome" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>📚</div>
      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text)', marginBottom: '12px', lineHeight: 1.2 }}>
        {t('onboarding.welcome')} <span style={{ color: 'var(--gold)' }}>{user?.first_name || t('common.student')}</span>
      </div>
      <div style={{ fontSize: '15px', color: 'var(--text2)', lineHeight: 1.6 }}>
        {t('onboarding.introDesc')}
      </div>
    </div>,

    // Step 1 — Cómo funciona
    <div key="features" style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>{t('onboarding.whatCanYouDo')}</div>
      <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '24px' }}>{t('onboarding.appDesc')}</div>
      {[
        { icon: '🃏', title: t('onboarding.flashcardsFeature'), desc: t('onboarding.flashcardsDesc') },
        { icon: '🎯', title: t('onboarding.quizzesTitle'), desc: t('onboarding.quizzesDesc') },
        { icon: '🖼', title: t('onboarding.infographicsAndPdfs'), desc: t('onboarding.infographicsAndPdfsDesc') },
        { icon: '📈', title: t('onboarding.realProgress'), desc: t('onboarding.realProgressDesc') },
        { icon: '🔥', title: t('onboarding.studyStreak'), desc: t('onboarding.studyStreakDesc') },
      ].map(f => (
        <div key={f.icon} style={{
          display: 'flex', gap: '14px', marginBottom: '20px',
          background: 'var(--s2)', borderRadius: '12px', padding: '14px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '28px', flexShrink: 0 }}>{f.icon}</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{f.title}</div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        </div>
      ))}
    </div>,

    // Step 2 — Privacidad
    <div key="privacy" style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>{t('onboarding.yourPrivacy')}</div>
      <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '8px', lineHeight: 1.5 }}>
        {t('onboarding.privacyDesc')}
      </div>
      <div style={{
        background: 'rgba(212,168,71,0.08)', border: '1px solid rgba(212,168,71,0.25)',
        borderRadius: '10px', padding: '10px 14px', marginBottom: '16px',
        fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5,
      }}>
        🔒 {t('onboarding.privacyNote')}
      </div>
      <Toggle label={t('onboarding.profilePhoto')} description={t('onboarding.profilePhotoDesc')} value={privacy.mostrar_foto} onChange={v => set('mostrar_foto', v)} />
      <Toggle label={t('onboarding.name')} description={t('onboarding.nameDesc')} value={privacy.mostrar_nombre} onChange={v => set('mostrar_nombre', v)} />
      <Toggle label={t('onboarding.username')} description={t('onboarding.usernameDesc')} value={privacy.mostrar_username} onChange={v => set('mostrar_username', v)} />
      <Toggle label={t('onboarding.subjectsYouFollow')} description={t('onboarding.subjectsYouFollowDesc')} value={privacy.mostrar_cursos} onChange={v => set('mostrar_cursos', v)} />
      <Toggle label={t('onboarding.progressToggle')} description={t('onboarding.progressToggleDesc')} value={privacy.mostrar_progreso} onChange={v => set('mostrar_progreso', v)} />
    </div>,

    // Step 3 — Listo
    <div key="done" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚀</div>
      <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '12px' }}>
        {t('onboarding.allSet')}
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.6, marginBottom: '8px' }}>
        {t('onboarding.allSetDesc')}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.6 }}>
        {t('onboarding.followSubject')}
      </div>
    </div>,
  ];

  const isLast = step === STEPS - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      paddingTop: `${safeTop}px`,
    }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '20px 24px 16px' }}>
        {Array.from({ length: STEPS }, (_, i) => (
          <div key={i} style={{
            height: '4px', flex: 1, maxWidth: '60px',
            borderRadius: '2px',
            background: i <= step ? 'var(--gold)' : 'var(--s3)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Step content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '8px' }}>
        {steps[step]}
      </div>

      {/* Navigation */}
      <div style={{
        padding: '16px 24px 32px',
        display: 'flex', gap: '12px',
        borderTop: step > 0 ? '1px solid var(--border)' : 'none',
      }}>
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              background: 'var(--s2)', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t('onboarding.back')}
          </button>
        )}
        <button
          onClick={isLast ? handleFinish : () => setStep(s => s + 1)}
          disabled={saving}
          style={{
            flex: step === 0 ? 1 : 2, padding: '14px', borderRadius: '12px',
            background: 'var(--gold)', border: 'none',
            color: '#000', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {isLast ? (saving ? t('onboarding.saving') : t('onboarding.getStarted')) : t('onboarding.continue')}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
