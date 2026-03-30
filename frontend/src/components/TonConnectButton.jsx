import { useState, useEffect } from 'react';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { useTranslation } from 'react-i18next';
import { getWalletNonce, connectWallet, disconnectWallet } from '../services/api';

/**
 * TON wallet connect button using ton_proof flow.
 *
 * Flow:
 *  1. Click → get nonce from backend → set as tonProof payload → open modal
 *  2. User approves in wallet → onStatusChange fires with proof
 *  3. Send proof to backend for ed25519 verification → save wallet_address
 *  4. Call onConnected(address)
 */
const TonConnectButton = ({ walletAddress, onConnected, onDisconnected, compact = false }) => {
  const { t } = useTranslation();
  const [tonConnectUI] = useTonConnectUI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const truncate = (addr) =>
    addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : '';

  // Listen for connection events — this is where the proof arrives
  useEffect(() => {
    const unsubscribe = tonConnectUI.onStatusChange(async (wallet) => {
      if (!wallet) return;

      const proof = wallet.connectItems?.tonProof?.proof;
      if (!proof) return; // connected without proof request — ignore

      setError(null);
      setLoading(true);
      try {
        await connectWallet(
          wallet.account.address,
          proof,
          wallet.account.walletStateInit || null,
        );
        onConnected && onConnected(wallet.account.address);
      } catch (e) {
        setError(e.message || t('wallet.errorConnect'));
        // Disconnect from TON Connect since backend rejected the proof
        tonConnectUI.disconnect().catch(() => {});
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [tonConnectUI, onConnected, t]);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      const { nonce } = await getWalletNonce();
      // Set nonce as proof payload BEFORE opening modal
      tonConnectUI.setConnectRequestParameters({
        state: 'ready',
        value: { tonProof: nonce },
      });
      await tonConnectUI.openModal();
    } catch (e) {
      setError(e.message || t('wallet.errorConnect'));
    } finally {
      setLoading(false); // modal is now open, user interacts with it
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectWallet();        // clear wallet_address + nft_activo on backend
    } catch (_) { /* best effort */ }
    try {
      await tonConnectUI.disconnect();  // disconnect TON Connect session
    } catch (_) { /* ignore */ }
    onDisconnected && onDisconnected();
  };

  if (walletAddress) {
    // Compact mode: just a small disconnect button for use in headers
    if (compact) {
      return (
        <button
          onClick={handleDisconnect}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '4px 10px',
            fontSize: '11px', color: 'var(--text2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}
        >
          <span style={{ fontSize: '12px' }}>💎</span>
          {truncate(walletAddress)}
        </button>
      );
    }

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: 'var(--s2)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '12px 14px',
      }}>
        <span style={{ fontSize: '20px' }}>💎</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
            {t('wallet.connected')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text2)', fontFamily: 'monospace', marginTop: '2px' }}>
            {truncate(walletAddress)}
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '5px 10px',
            fontSize: '11px', color: 'var(--text2)', cursor: 'pointer',
          }}
        >
          {t('wallet.disconnect')}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        style={{
          width: '100%', padding: '13px 16px',
          background: loading
            ? 'var(--s3)'
            : 'linear-gradient(135deg, #0098EA 0%, #006FC1 100%)',
          border: 'none', borderRadius: '12px',
          color: '#fff', fontSize: '14px', fontWeight: 700,
          cursor: loading ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        <span style={{ fontSize: '18px' }}>💎</span>
        {loading ? t('wallet.connecting') : t('wallet.connectBtn')}
      </button>
      {error && (
        <div style={{
          fontSize: '12px', color: '#ff4444',
          marginTop: '8px', padding: '8px 12px',
          background: 'rgba(255,68,68,0.08)', borderRadius: '8px',
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default TonConnectButton;
