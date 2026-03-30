import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserNfts, setNftActivo } from '../services/api';

/**
 * NFT trophy case selector.
 * Shows only Telegram Gift NFTs in a modern grid.
 * Tapping one sets it as active; tapping again deselects.
 */
const NftSelector = ({ userId, activeAddress, onNftChange }) => {
  const { t } = useTranslation();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUserNfts(userId)
      .then((data) => {
        // Only show Telegram gift NFTs
        const gifts = (data.nfts || []).filter(n => n.is_telegram_gift);
        setNfts(gifts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSelect = async (nftAddress) => {
    if (saving) return;
    const next = nftAddress === activeAddress ? null : nftAddress;
    setSaving(true);
    try {
      await setNftActivo(userId, next);
      onNftChange && onNftChange(next, nfts.find((n) => n.address === next) || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px', padding: '32px 0', color: 'var(--text2)', fontSize: '13px',
      }}>
        <div style={{
          width: '18px', height: '18px', border: '2px solid var(--border)',
          borderTop: '2px solid var(--gold)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        {t('wallet.loadingNfts')}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        fontSize: '13px', color: '#ff6b6b', padding: '14px 16px',
        background: 'rgba(255,107,107,0.08)', borderRadius: '12px',
        border: '1px solid rgba(255,107,107,0.15)',
        textAlign: 'center',
      }}>
        {error}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '28px 16px', lineHeight: 1.6,
      }}>
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎁</div>
        <div style={{ fontSize: '13px', color: 'var(--text2)' }}>
          {t('wallet.noNfts')}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
      }}>
        {nfts.map((nft) => {
          const isActive = nft.address === activeAddress;

          return (
            <div
              key={nft.address}
              onClick={() => !saving && handleSelect(nft.address)}
              style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: saving ? 'default' : 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                background: 'var(--s3)',
                boxShadow: isActive
                  ? '0 0 0 2px #0098EA, 0 4px 16px rgba(0,152,234,0.25)'
                  : '0 1px 4px rgba(0,0,0,0.15)',
              }}
            >
              {/* NFT image */}
              <div style={{
                width: '100%', aspectRatio: '1', position: 'relative',
                overflow: 'hidden',
              }}>
                {nft.imagen_url ? (
                  <img
                    src={nft.imagen_url}
                    alt={nft.nombre}
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      display: 'block',
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--s2), var(--s3))',
                    fontSize: '32px',
                  }}>
                    🎁
                  </div>
                )}

                {/* Active check overlay */}
                {isActive && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,152,234,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: '#0098EA',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', color: '#fff', fontWeight: 700,
                      boxShadow: '0 2px 8px rgba(0,152,234,0.4)',
                    }}>
                      ✓
                    </div>
                  </div>
                )}
              </div>

              {/* Name label */}
              <div style={{
                padding: '6px 6px 8px',
                fontSize: '10px', color: 'var(--text)',
                lineHeight: 1.2, textAlign: 'center',
                fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {nft.nombre || nft.coleccion || '—'}
              </div>
            </div>
          );
        })}
      </div>

      {activeAddress && (
        <div style={{
          marginTop: '10px', textAlign: 'center',
          fontSize: '12px', color: 'var(--text2)',
        }}>
          {t('wallet.tapToDeselect')}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NftSelector;
