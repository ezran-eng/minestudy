import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { getUserPerfil } from '../services/api';
import MateriaList from '../components/MateriaList';
import NftBadge from '../components/NftBadge';

const UserProfile = () => {
  const { id } = useParams();
  const { user: currentUser } = useTelegram();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.id && parseInt(id) === currentUser.id;

  useEffect(() => {
    getUserPerfil(id)
      .then(setPerfil)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="screen active" style={{ padding: '20px' }}>Cargando perfil...</div>;
  if (!perfil) return <div className="screen active" style={{ padding: '20px' }}>Perfil no encontrado</div>;

  const fullName = `${perfil.first_name} ${perfil.last_name || ''}`.trim();

  return (
    <div className="screen active screen-container" id="screen-user-profile">
      <div className="fab-back-btn">
        <div className="btn-back" onClick={() => navigate(-1)}>‹</div>
      </div>
      <div className="profile-body">

        <div className="profile-hero">
          <div className="profile-avatar-big">
            {perfil.foto_url
              ? <img src={perfil.foto_url} alt="Avatar" />
              : <span style={{ fontSize: '36px' }}>👤</span>
            }
          </div>
          <div className="profile-name">{fullName || 'Estudiante'}</div>
<div className="streak-pill" style={{ margin: '8px auto 0', width: 'fit-content' }}>
            🔥 {perfil.racha} {perfil.racha === 1 ? 'día' : 'días'}
          </div>
        </div>

        {perfil.mostrar_nft && perfil.nft_activo_data && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <NftBadge nftData={perfil.nft_activo_data} size="md" />
          </div>
        )}

        {(perfil.materias_cursando.length === 0 && perfil.materias_completadas.length === 0) ? (
          <div style={{ textAlign: 'center', color: 'var(--text2)', fontSize: '14px', padding: '24px 16px' }}>
            No sigue ninguna materia todavía
          </div>
        ) : (
          <>
            {perfil.materias_cursando.length > 0 && (
              <>
                <div className="section-head" style={{ padding: '0 16px', marginTop: '20px', marginBottom: '10px' }}>
                  <div className="section-title">📚 Cursando</div>
                </div>
                <MateriaList materias={perfil.materias_cursando} isOwnProfile={isOwnProfile} navigate={navigate} />
              </>
            )}
            {perfil.materias_completadas.length > 0 && (
              <>
                <div className="section-head" style={{ padding: '0 16px', marginTop: '20px', marginBottom: '10px' }}>
                  <div className="section-title">🎓 Completadas</div>
                </div>
                <MateriaList materias={perfil.materias_completadas} isOwnProfile={isOwnProfile} navigate={navigate} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
