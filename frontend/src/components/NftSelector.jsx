import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getUserNfts, setNftActivo } from '../services/api';

const NftSelector = ({ userId, activeAddress, onNftChange }) => {
  const { t } = useTranslation();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUserNfts(userId)
      .then((data) => {
        const all = data.nfts || [];
        const gifts = all.filter(n => n.is_telegram_gift);
        setNfts(gifts.length > 0 ? gifts : all);
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
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '10px', padding: '40px 0',
      }}>
        <div className="nft-spinner" />
        <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
          {t('wallet.loadingNfts')}
        </span>
        <style>{`
          .nft-spinner {
            width: 24px; height: 24px;
            border: 2.5px solid var(--s3);
            border-top-color: var(--gold);
            border-radius: 50%;
            animation: nft-spin 0.7s linear infinite;
          }
          @keyframes nft-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        textAlign: 'center', padding: '20px 16px',
        fontSize: '13px', color: '#ff6b6b',
      }}>
        {error}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎁</div>
        <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: 1.5 }}>
          {t('wallet.noNfts')}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
      }}>
        {nfts.map((nft) => {
          const isActive = nft.address === activeAddress;
          return (
            <div
              key={nft.address}
              onClick={() => !saving && handleSelect(nft.address)}
              className={`nft-card ${isActive ? 'nft-card-active' : ''}`}
            >
              <div className="nft-card-img">
                {nft.imagen_url ? (
                  <img src={nft.imagen_url} alt={nft.nombre} loading="lazy" />
                ) : (
                  <div className="nft-card-placeholder">🎁</div>
                )}
                {isActive && (
                  <div className="nft-card-check">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="nft-card-name">
                {nft.nombre || nft.coleccion || '—'}
              </div>
            </div>
          );
        })}
      </div>

      {activeAddress && (
        <div style={{
          marginTop: '12px', textAlign: 'center',
          fontSize: '12px', color: 'var(--text2)', opacity: 0.7,
        }}>
          {t('wallet.tapToDeselect')}
        </div>
      )}

      <style>{`
        .nft-card {
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          background: var(--s2);
          border: 2px solid transparent;
        }
        .nft-card:active {
          transform: scale(0.96);
        }
        .nft-card-active {
          border-color: #0098EA;
          box-shadow: 0 0 0 1px #0098EA, 0 4px 12px rgba(0,152,234,0.2);
        }
        .nft-card-img {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          overflow: hidden;
          background: var(--s3);
        }
        .nft-card-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .nft-card-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
        }
        .nft-card-check {
          position: absolute;
          bottom: 6px;
          right: 6px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #0098EA;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .nft-card-name {
          padding: 5px 6px 7px;
          font-size: 11px;
          color: var(--text);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
        }
      `}</style>
    </>
  );
};

export default NftSelector;
