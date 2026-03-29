/**
 * NftBadge — displays the user's active Telegram Gift NFT
 * in the profile hero area, Telegram-style (floating trophy).
 *
 * Props:
 *   nftData: { nombre, coleccion, imagen_url, traits }
 *   size: 'sm' | 'md' (default 'md')
 */
const NftBadge = ({ nftData, size = 'md' }) => {
  if (!nftData) return null;

  const dim = size === 'sm' ? 40 : 64;

  // Extract accent color from "Fondo" trait if available
  const fondoTrait = (nftData.traits || []).find(
    (t) => t.trait_type?.toLowerCase() === 'fondo' || t.trait_type?.toLowerCase() === 'background'
  );

  // Map common Fondo values to accent colors
  const FONDO_COLORS = {
    'onyx black': '#1a1a2e',
    'space grey': '#2d2d3e',
    'crimson': '#8b0000',
    'golden': '#c9a227',
    'sapphire': '#0f3460',
    'emerald': '#064e3b',
    'rose': '#be185d',
    'sky blue': '#0284c7',
    'violet': '#6d28d9',
  };
  const fondoKey = (fondoTrait?.value || '').toLowerCase();
  const accentColor = FONDO_COLORS[fondoKey] || '#0098EA';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    }}>
      {/* Trophy frame */}
      <div style={{
        width: dim, height: dim,
        borderRadius: '50%',
        border: `2px solid ${accentColor}`,
        boxShadow: `0 0 12px ${accentColor}55`,
        overflow: 'hidden',
        background: 'var(--s2)',
        position: 'relative',
      }}>
        {nftData.imagen_url ? (
          <img
            src={nftData.imagen_url}
            alt={nftData.nombre}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: dim * 0.45,
          }}>
            🎁
          </div>
        )}
      </div>

      {/* Name below badge */}
      {size === 'md' && (
        <div style={{
          fontSize: '11px', color: 'var(--text2)', textAlign: 'center',
          maxWidth: '80px', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {nftData.nombre}
        </div>
      )}
    </div>
  );
};

export default NftBadge;
