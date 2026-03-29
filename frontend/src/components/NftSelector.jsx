import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserNfts, setNftActivo } from '../services/api';

/**
 * NFT trophy case selector.
 * Shows user's Telegram Gift NFTs in a grid.
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
      .then((data) => setNfts(data.nfts || []))
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
      <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '13px', padding: '20px' }}>
        {t('wallet.loadingNfts')}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        fontSize: '12px', color: '#ff4444', padding: '10px 12px',
        background: 'rgba(255,68,68,0.08)', borderRadius: '8px',
      }}>
        {error}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div style={{
        textAlign: 'center', color: 'var(--text2)', fontSize: '13px',
        padding: '20px 0', lineHeight: 1.5,
      }}>
        {t('wallet.noNfts')}
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px', padding: '4px 0',
      }}>
        {nfts.map((nft) => {
          const isActive = nft.address === activeAddress;
          // Extract background color from traits if available
          const fondoTrait = (nft.traits || []).find(
            (t) => t.trait_type?.toLowerCase() === 'fondo' || t.trait_type?.toLowerCase() === 'background'
          );
          const symbolTrait = (nft.traits || []).find(
            (t) => t.trait_type?.toLowerCase() === 'símbolo' || t.trait_type?.toLowerCase() === 'symbol'
          );

          return (
            <div
              key={nft.address}
              onClick={() => !saving && handleSelect(nft.address)}
              style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                border: isActive ? '2px solid #0098EA' : '2px solid var(--border)',
                cursor: saving ? 'default' : 'pointer',
                transition: 'border-color 0.2s, transform 0.15s',
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
                background: 'var(--s2)',
              }}
            >
              {/* NFT image */}
              {nft.imagen_url ? (
                <img
                  src={nft.imagen_url}
                  alt={nft.nombre}
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />
              ) : (
                <div style={{
                  width: '100%', aspectRatio: '1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--s3)', fontSize: '32px',
                }}>
                  🎁
                </div>
              )}

              {/* Active badge */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: '#0098EA', borderRadius: '50%',
                  width: '20px', height: '20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', color: '#fff', fontWeight: 700,
                }}>
                  ✓
                </div>
              )}

              {/* Name */}
              <div style={{
                padding: '6px 6px 8px',
                fontSize: '10px', color: 'var(--text2)',
                lineHeight: 1.3, textAlign: 'center',
              }}>
                {nft.nombre || nft.coleccion || '—'}
              </div>
            </div>
          );
        })}
      </div>

      {activeAddress && (
        <div style={{
          marginTop: '8px', textAlign: 'center',
          fontSize: '12px', color: 'var(--text2)',
        }}>
          {t('wallet.tapToDeselect')}
        </div>
      )}
    </div>
  );
};

export default NftSelector;
