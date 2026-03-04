import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { getUserPerfil } from '../services/api';

const MateriaList = ({ materias, isOwnProfile, navigate }) => (
  <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {materias.map(m => (
      <div
        key={m.id}
        onClick={() => isOwnProfile ? navigate(`/materia/${m.id}`, { state: { materia: m } }) : undefined}
        style={{
          background: 'var(--s2)', borderRadius: '12px',
          padding: '12px 14px', border: '1px solid var(--border)',
          borderLeft: `4px solid ${m.color || 'var(--gold)'}`,
          cursor: isOwnProfile ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
            {m.emoji} {m.nombre}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 700 }}>
            {Math.round(m.porcentaje)}%
          </span>
        </div>
        <div style={{ background: 'var(--s3)', borderRadius: '4px', height: '4px' }}>
          <div style={{
            width: `${Math.min(m.porcentaje, 100)}%`, height: '100%',
            background: m.color || 'var(--gold)', borderRadius: '4px',
          }} />
        </div>
        {isOwnProfile && (
          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text2)' }}>Ir a la materia ›</div>
        )}
      </div>
    ))}
  </div>
);

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
