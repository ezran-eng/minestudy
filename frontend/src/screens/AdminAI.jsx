import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import {
  getAdminAISummary,
  getAdminAIByModule,
  getAdminAIByUser,
  getAdminAITimeline,
  getAdminAIRecent,
} from '../services/api';

const ADMIN_ID = 1063772095;

const MODULE_LABELS = {
  mascota: 'Redo (Mascota)',
  tutor_chat: 'Tutor Chat',
  tutor_accion: 'Tutor Acciones',
  ai_gen_fc: 'Gen Flashcards',
  ai_gen_quiz: 'Gen Quiz',
};

const MODULE_COLORS = {
  mascota: '#D4A847',
  tutor_chat: '#4ECDC4',
  tutor_accion: '#45B7D1',
  ai_gen_fc: '#96CEB4',
  ai_gen_quiz: '#FFEAA7',
};

const Card = ({ title, value, sub, color }) => (
  <div style={{
    background: 'var(--s1)', borderRadius: '12px', padding: '14px 16px',
    border: '1px solid var(--border)', flex: 1, minWidth: '140px',
  }}>
    <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>{title}</div>
    <div style={{ fontSize: '22px', fontWeight: 700, color: color || 'var(--text)' }}>{value}</div>
    {sub && <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '2px' }}>{sub}</div>}
  </div>
);

const Bar = ({ label, value, maxValue, color, sub }) => {
  const pct = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
        <span style={{ color: 'var(--text)' }}>{label}</span>
        <span style={{ color: 'var(--text2)' }}>{sub}</span>
      </div>
      <div style={{ background: 'var(--s2)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color || 'var(--gold)', borderRadius: '4px', transition: 'width 0.3s' }} />
      </div>
    </div>
  );
};

const AdminAI = () => {
  const navigate = useNavigate();
  const { user } = useTelegram();
  const [summary, setSummary] = useState(null);
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (user?.id !== ADMIN_ID) return;
    Promise.all([
      getAdminAISummary().catch(() => null),
      getAdminAIByModule(7).catch(() => []),
      getAdminAIByUser(7).catch(() => []),
      getAdminAITimeline(14).catch(() => []),
      getAdminAIRecent().catch(() => []),
    ]).then(([s, m, u, t, r]) => {
      setSummary(s);
      setModules(m);
      setUsers(u);
      setTimeline(t);
      setRecent(r);
      setLoading(false);
    });
  }, [user?.id]);

  if (user?.id !== ADMIN_ID) {
    return <div className="screen active" style={{ padding: '20px', color: 'var(--text2)' }}>Acceso denegado</div>;
  }

  const formatCost = (v) => v < 0.01 ? `$${(v * 100).toFixed(2)}c` : `$${v.toFixed(4)}`;
  const formatTokens = (v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v;

  const tg = window.Telegram?.WebApp;
  const safeTop = (tg?.contentSafeAreaInset?.top ?? 0) + (tg?.safeAreaInset?.top ?? 44);

  return (
    <div className="screen active" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        paddingTop: `${safeTop + 8}px`, paddingBottom: '12px', paddingLeft: '16px', paddingRight: '16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="btn-back" onClick={() => navigate(-1)}>‹</div>
        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>AI Analytics</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text2)' }}>Cargando datos...</div>
      ) : (
        <div style={{ padding: '16px', paddingBottom: '100px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--s1)', borderRadius: '10px', padding: '3px' }}>
            {['overview', 'modules', 'users', 'feed'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 600,
                background: tab === t ? 'var(--gold)' : 'transparent',
                color: tab === t ? '#000' : 'var(--text2)', cursor: 'pointer',
              }}>
                {t === 'overview' ? 'Resumen' : t === 'modules' ? 'Modulos' : t === 'users' ? 'Usuarios' : 'Feed'}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === 'overview' && summary && (
            <>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <Card title="Costo hoy" value={formatCost(summary.today.costo_usd)} color="var(--gold)" />
                <Card title="Costo semana" value={formatCost(summary.week.costo_usd)} />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <Card title="Calls hoy" value={summary.today.calls} sub={`${summary.cache_hits_today} cache hits`} />
                <Card title="Latencia avg" value={`${summary.today.latencia_avg_ms}ms`} />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <Card title="Tokens hoy" value={formatTokens(summary.today.tokens_in + summary.today.tokens_out)}
                  sub={`${formatTokens(summary.today.tokens_cached)} cached`} />
                <Card title="Costo total" value={formatCost(summary.total.costo_usd)} sub={`${summary.total.calls} calls`} />
              </div>

              {/* Daily timeline bars */}
              {timeline.length > 0 && (
                <>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
                    Ultimos 14 dias
                  </div>
                  {(() => {
                    const maxCost = Math.max(...timeline.map(d => d.costo_usd), 0.001);
                    return timeline.slice(-14).map(d => (
                      <Bar key={d.dia} label={d.dia.slice(5)} value={d.costo_usd} maxValue={maxCost}
                        color="var(--gold)" sub={`${d.calls} calls · ${formatCost(d.costo_usd)}`} />
                    ));
                  })()}
                </>
              )}
            </>
          )}

          {/* Modules Tab */}
          {tab === 'modules' && (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
                Por modulo (7 dias)
              </div>
              {modules.length === 0 ? (
                <div style={{ color: 'var(--text2)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sin datos</div>
              ) : (() => {
                const maxCost = Math.max(...modules.map(m => m.costo_usd), 0.001);
                return modules.map(m => (
                  <Bar key={m.modulo} label={MODULE_LABELS[m.modulo] || m.modulo}
                    value={m.costo_usd} maxValue={maxCost}
                    color={MODULE_COLORS[m.modulo] || 'var(--gold)'}
                    sub={`${m.calls} calls · ${formatTokens(m.tokens)} tok · ${formatCost(m.costo_usd)} · ${m.latencia_avg_ms}ms`} />
                ));
              })()}
            </>
          )}

          {/* Users Tab */}
          {tab === 'users' && (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
                Top usuarios (7 dias)
              </div>
              {users.length === 0 ? (
                <div style={{ color: 'var(--text2)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sin datos</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {users.map((u, i) => (
                    <div key={u.id_usuario} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: 'var(--s1)', borderRadius: '10px', padding: '10px 12px',
                      border: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gold)', minWidth: '18px' }}>#{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{u.nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
                          {u.calls} calls · {formatTokens(u.tokens)} tokens
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gold)' }}>
                        {formatCost(u.costo_usd)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Feed Tab */}
          {tab === 'feed' && (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
                Ultimas 50 llamadas
              </div>
              {recent.length === 0 ? (
                <div style={{ color: 'var(--text2)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Sin datos</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {recent.map(r => (
                    <div key={r.id} style={{
                      background: 'var(--s1)', borderRadius: '8px', padding: '8px 10px',
                      border: r.error ? '1px solid rgba(255,80,80,0.3)' : '1px solid var(--border)',
                      fontSize: '11px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ color: MODULE_COLORS[r.modulo] || 'var(--text2)', fontWeight: 600 }}>
                          {MODULE_LABELS[r.modulo] || r.modulo}
                          {r.accion ? ` · ${r.accion}` : ''}
                        </span>
                        <span style={{ color: 'var(--text2)' }}>
                          {r.created_at ? new Date(r.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text2)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {r.cache_hit ? (
                          <span style={{ color: 'var(--gold)' }}>CACHE HIT</span>
                        ) : (
                          <>
                            <span>in:{r.tokens_in} out:{r.tokens_out}</span>
                            {r.tokens_cached > 0 && <span style={{ color: '#96CEB4' }}>cached:{r.tokens_cached}</span>}
                            <span>{r.latencia_ms}ms</span>
                            <span style={{ color: 'var(--gold)' }}>{formatCost(r.costo_usd)}</span>
                          </>
                        )}
                        {r.error && <span style={{ color: '#ff5050' }}>{r.error}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminAI;
