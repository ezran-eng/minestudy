import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserNfts, setNftActivo } from '../services/api';

/**
 * GiftGrid — Telegram-style gift display.
 * 3-column grid, image fills the card, number overlay.
 * Tap to set active; tap active again to show apply options.
 */
const GiftGrid = ({ userId, activeAddress, onNftChange, onCountLoaded, onApplyToMateria }) => {
  const { t } = useTranslation();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // address of saving nft
  const [error, setError] = useState(null);
  const [actionNft, setActionNft] = useState(null); // gift tapped for action sheet

  useEffect(() => {
    getUserNfts(userId)
      .then((data) => {
        const all = data.nfts || [];
        const gifts = all.filter(n => n.is_telegram_gift);
        const final = gifts.length > 0 ? gifts : all;
        setNfts(final);
        onCountLoaded && onCountLoaded(final.length);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleTap = (nft) => {
    if (saving) return;
    if (nft.address === activeAddress) {
      // Tapping the active gift → show actions
      setActionNft(nft);
    } else {
      // Tap non-active → select it
      selectGift(nft.address);
    }
  };

  const selectGift = async (address) => {
    setSaving(address);
    try {
      await setNftActivo(userId, address);
      onNftChange && onNftChange(address, nfts.find(n => n.address === address) || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const deselectGift = async () => {
    setActionNft(null);
    setSaving('deselect');
    try {
      await setNftActivo(userId, null);
      onNftChange && onNftChange(null, null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  // Extract number from gift name like "Tama Gadget #11734" → "#11.734"
  const getGiftNum = (nombre) => {
    const m = (nombre || '').match(/#([\d]+)/);
    if (!m) return null;
    return '#' + parseInt(m[1]).toLocaleString('es-AR');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '48px 0' }}>
        <div style={{
          width: '22px', height: '22px', borderRadius: '50%',
          border: '2.5px solid rgba(255,255,255,0.1)',
          borderTopColor: '#0098EA',
          animation: 'gg-spin 0.7s linear infinite',
        }} />
        <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{t('wallet.loadingNfts')}</span>
        <style>{`@keyframes gg-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#ff6b6b', fontSize: '13px' }}>
        {error}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px' }}>
        <div style={{ fontSize: '44px', marginBottom: '12px' }}>🎁</div>
        <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.5 }}>
          {t('wallet.noNfts')}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Gift grid — 3 columns, no padding (parent handles it) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '3px',
      }}>
        {nfts.map((nft) => {
          const isActive = nft.address === activeAddress;
          const isSaving = saving === nft.address;
          const num = getGiftNum(nft.nombre);

          return (
            <div
              key={nft.address}
              onClick={() => handleTap(nft)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                overflow: 'hidden',
                cursor: isSaving ? 'default' : 'pointer',
                borderRadius: '4px',
                background: '#111',
                opacity: isSaving ? 0.6 : 1,
                outline: isActive ? '2.5px solid #0098EA' : 'none',
                outlineOffset: '-2px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Image */}
              {nft.imagen_url ? (
                <img
                  src={nft.imagen_url}
                  alt={nft.nombre}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', background: '#1a1a1a',
                }}>🎁</div>
              )}

              {/* Bottom gradient + number */}
              {num && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '16px 5px 4px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                }}>
                  <span style={{
                    fontSize: '10px', color: '#fff', fontWeight: 600,
                    fontFamily: 'monospace',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}>{num}</span>
                </div>
              )}

              {/* Active indicator — pin icon top-left */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: '5px', left: '5px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: '#0098EA',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      fill="white" />
                  </svg>
                </div>
              )}

              {/* Loading spinner overlay */}
              {isSaving && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    animation: 'gg-spin 0.7s linear infinite',
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action sheet for active gift */}
      {actionNft && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setActionNft(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', background: 'var(--s1)',
              borderRadius: '20px 20px 0 0',
              padding: '0 0 32px',
              boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border)' }} />
            </div>

            {/* Gift preview */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '8px 20px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '12px',
                overflow: 'hidden', flexShrink: 0, background: '#111',
              }}>
                {actionNft.imagen_url && (
                  <img src={actionNft.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                  {actionNft.nombre || actionNft.coleccion}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
                  {actionNft.coleccion}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '8px 12px 0' }}>
              {/* Apply to materia */}
              {onApplyToMateria && (
                <button
                  onClick={() => { setActionNft(null); onApplyToMateria(actionNft); }}
                  style={{
                    width: '100%', padding: '14px 16px',
                    background: 'var(--s2)', border: 'none',
                    borderRadius: '14px', marginBottom: '8px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>🎨</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                      {t('wallet.applyToMateria')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '1px' }}>
                      {t('wallet.applyToMateriaDesc')}
                    </div>
                  </div>
                </button>
              )}

              {/* Deselect */}
              <button
                onClick={deselectGift}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'var(--s2)', border: 'none',
                  borderRadius: '14px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '22px' }}>📌</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                  {t('wallet.unpinGift')}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GiftGrid;
