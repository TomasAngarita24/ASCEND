import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, FileText, Users, UserPlus, UserCheck, Activity, Loader2, Repeat, Layers, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { api, toError, type FeedPost, type PublicProfileResponse, type PublicRoutineSummary, type SocialUserSummary, type Tokens } from '../api/api';
import { ConfirmModal } from '../components/ConfirmModal';
import { PostCard } from '../components/PostCard';
import { RoutineDetailModal } from '../components/RoutineDetailModal';

interface UserProfileViewProps {
  tokens: Tokens;
  viewerUserId: string;
}

function initials(fullName: string | null): string {
  return (fullName || 'A').trim().slice(0, 2).toUpperCase();
}

function joinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { month: 'long', year: 'numeric' });
}

interface FollowRowProps {
  user: SocialUserSummary;
  viewerUserId: string;
  pending: boolean;
  onToggle: (user: SocialUserSummary) => void;
}

const FollowRow: React.FC<FollowRowProps> = ({ user, viewerUserId, pending, onToggle }) => {
  const navigate = useNavigate();
  const isSelf = user.id === viewerUserId;

  return (
    <div style={styles.followRow}>
      <button style={styles.followRowUser} onClick={() => navigate(`/users/${user.id}`)}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.fullName ?? 'avatar'} style={styles.rowAvatarImg} />
        ) : (
          <div style={styles.rowAvatar}>{initials(user.fullName)}</div>
        )}
        <span style={styles.rowName}>{user.fullName || 'Atleta'}</span>
      </button>
      {!isSelf && (
        <button
          style={user.isFollowing ? styles.followingBtn : styles.followBtn}
          disabled={pending}
          onClick={() => onToggle(user)}
        >
          {pending ? <Loader2 size={14} className="spin" /> : user.isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
          {user.isFollowing ? 'Siguiendo' : 'Seguir'}
        </button>
      )}
    </div>
  );
};

export const UserProfileView: React.FC<UserProfileViewProps> = ({ tokens, viewerUserId }) => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [followPending, setFollowPending] = useState(false);

  const [tab, setTab] = useState<'posts' | 'rutinas' | 'followers' | 'following'>('posts');

  // Posts tab state
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(new Set());
  const [copyingPostId, setCopyingPostId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FeedPost | null>(null);

  // Followers / Following tab state
  const [list, setList] = useState<SocialUserSummary[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listPage, setListPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Public routines tab state
  const [publicRoutines, setPublicRoutines] = useState<PublicRoutineSummary[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(false);
  const [copyingRoutineId, setCopyingRoutineId] = useState<string | null>(null);
  const [detailRoutineId, setDetailRoutineId] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoadingProfile(true);
    setNotFound(false);
    try {
      const res = await api.getPublicProfile(tokens.accessToken, userId);
      setProfile(res);
    } catch (err: unknown) {
      const { message, status } = toError(err);
      if (status === 404) {
        setNotFound(true);
      } else {
        toast.error(message);
      }
    } finally {
      setLoadingProfile(false);
    }
  }, [tokens, userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadPosts = useCallback(async (targetPage: number, targetUserId: string) => {
    if (targetPage === 1) setLoadingPosts(true);
    try {
      const res = await api.getUserPosts(tokens.accessToken, targetUserId, targetPage, 10);
      setPosts((prev) => (targetPage === 1 ? res.data : [...prev, ...res.data]));
      setPostsTotal(res.pagination.total);
      setPostsPage(targetPage);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las publicaciones.');
    } finally {
      setLoadingPosts(false);
    }
  }, [tokens]);

  const loadList = useCallback(async (targetTab: 'followers' | 'following', targetUserId: string, page: number) => {
    if (page === 1) setLoadingList(true);
    try {
      const res = targetTab === 'followers'
        ? await api.getUserFollowers(tokens.accessToken, targetUserId, page)
        : await api.getUserFollowing(tokens.accessToken, targetUserId, page);
      setList((prev) => (page === 1 ? res.data : [...prev, ...res.data]));
      setListTotal(res.pagination.total);
      setListPage(page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la lista.');
    } finally {
      setLoadingList(false);
    }
  }, [tokens]);

  const loadRoutines = useCallback(async (targetUserId: string) => {
    setLoadingRoutines(true);
    try {
      const data = await api.getUserPublicRoutines(tokens.accessToken, targetUserId);
      setPublicRoutines(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar las rutinas.');
    } finally {
      setLoadingRoutines(false);
    }
  }, [tokens]);

  useEffect(() => {
    if (profile && userId) {
      if (tab === 'posts') {
        setPosts([]);
        setPostsPage(1);
        loadPosts(1, userId);
      } else if (tab === 'rutinas') {
        loadRoutines(userId);
      } else {
        setList([]);
        setListPage(1);
        loadList(tab, userId, 1);
      }
    }
  }, [tab, userId, profile, loadPosts, loadList, loadRoutines]);

  const toggleFollowProfile = async () => {
    if (!profile || profile.isSelf || !userId) return;
    const wasFollowing = profile.isFollowing;
    setFollowPending(true);
    setProfile((p) =>
      p ? { ...p, isFollowing: !wasFollowing, followersCount: Math.max(0, p.followersCount + (wasFollowing ? -1 : 1)) } : p,
    );
    try {
      const res = wasFollowing
        ? await api.unfollowUser(tokens.accessToken, userId)
        : await api.followUser(tokens.accessToken, userId);
      setProfile((p) => (p ? { ...p, followersCount: res.followersCount } : p));
    } catch (err: unknown) {
      setProfile((p) =>
        p ? { ...p, isFollowing: wasFollowing, followersCount: Math.max(0, p.followersCount + (wasFollowing ? 1 : -1)) } : p,
      );
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el follow.');
    } finally {
      setFollowPending(false);
    }
  };

  const toggleFollowListRow = async (user: SocialUserSummary) => {
    if (user.id === viewerUserId) return;
    const wasFollowing = user.isFollowing;
    setPendingIds((prev) => new Set(prev).add(user.id));
    setList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isFollowing: !wasFollowing } : u)),
    );
    try {
      if (wasFollowing) {
        await api.unfollowUser(tokens.accessToken, user.id);
      } else {
        await api.followUser(tokens.accessToken, user.id);
      }
    } catch (err: unknown) {
      setList((prev) => prev.map((u) => (u.id === user.id ? { ...u, isFollowing: wasFollowing } : u)));
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el follow.');
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  const handleToggleLike = async (post: FeedPost) => {
    if (pendingLikeIds.has(post.id)) return;
    const nextLiked = !post.likedByMe;
    const delta = nextLiked ? 1 : -1;
    setPendingLikeIds((prev) => new Set(prev).add(post.id));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, likedByMe: nextLiked, likeCount: Math.max(0, p.likeCount + delta) }
          : p,
      ),
    );
    try {
      if (nextLiked) {
        await api.likePost(tokens.accessToken, post.id);
      } else {
        await api.unlikePost(tokens.accessToken, post.id);
      }
    } catch (err: unknown) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, likedByMe: !nextLiked, likeCount: Math.max(0, p.likeCount - delta) }
            : p,
        ),
      );
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el Me gusta.');
    } finally {
      setPendingLikeIds((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
    }
  };

  const confirmDeletePost = async () => {
    if (!confirmDelete) return;
    const post = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.deletePost(tokens.accessToken, post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setPostsTotal((t) => Math.max(0, t - 1));
      toast.success('Publicación eliminada.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la publicación.');
    }
  };

  const handleCopyRoutine = async (post: FeedPost) => {
    setCopyingPostId(post.id);
    try {
      const routine = await api.copyRoutinePost(tokens.accessToken, post.id);
      toast.success(`Rutina "${routine.name}" copiada a tu biblioteca.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo copiar la rutina.');
    } finally {
      setCopyingPostId(null);
    }
  };

  const handleCopyPublicRoutine = async (routineId: string) => {
    setCopyingRoutineId(routineId);
    try {
      const routine = await api.copyRoutine(tokens.accessToken, routineId);
      toast.success(`Rutina "${routine.name}" copiada a tu biblioteca.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo copiar la rutina.');
    } finally {
      setCopyingRoutineId(null);
    }
  };

  if (loadingProfile) {
    return (
      <div style={styles.container}>
        <div style={styles.stateBox}>
          <div style={styles.spinner} />
          <span style={styles.stateText}>Cargando perfil...</span>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={styles.container}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Volver
        </button>
        <div style={styles.stateBox}>
          <Users size={40} color="var(--accent-teal)" style={{ marginBottom: '0.75rem' }} />
          <span style={styles.stateTitle}>Usuario no encontrado</span>
          <span style={styles.stateText}>Es posible que la cuenta ya no exista.</span>
        </div>
      </div>
    );
  }

  const hasMorePosts = posts.length < postsTotal;
  const hasMoreList = list.length < listTotal;

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* Profile header */}
      <div style={styles.profileCard}>
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt={profile.fullName ?? 'avatar'} style={styles.avatarImg} />
        ) : (
          <div style={styles.avatar}>{initials(profile.fullName)}</div>
        )}
        <div style={styles.profileInfo}>
          <h1 style={styles.name}>{profile.fullName || 'Atleta'}</h1>
          <p style={styles.memberSince}>Miembro desde {joinedDate(profile.createdAt)}</p>
          {profile.bio && <p style={styles.bio}>{profile.bio}</p>}
        </div>
        {profile.isSelf ? (
          <button style={styles.secondaryBtn} onClick={() => navigate('/profile')}>
            <Activity size={15} />
            Mi perfil
          </button>
        ) : (
          <button
            style={profile.isFollowing ? styles.followingBtn : styles.followBtn}
            onClick={toggleFollowProfile}
            disabled={followPending}
          >
            {followPending ? <Loader2 size={15} className="spin" /> : profile.isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
            {profile.isFollowing ? 'Siguiendo' : 'Seguir'}
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <Dumbbell size={18} color="var(--accent-teal)" />
          <span style={styles.statValue}>{profile.stats.workoutsCompleted}</span>
          <span style={styles.statLabel}>Entrenamientos</span>
        </div>
        <div style={styles.statCard}>
          <FileText size={18} color="var(--accent-blue)" />
          <span style={styles.statValue}>{profile.stats.postsCount}</span>
          <span style={styles.statLabel}>Publicaciones</span>
        </div>
        <button style={styles.statCardBtn} onClick={() => setTab('rutinas')}>
          <Layers size={18} color="var(--accent-blue)" />
          <span style={styles.statValue}>{profile.stats.publicRoutinesCount}</span>
          <span style={styles.statLabel}>Rutinas</span>
        </button>
        <button style={styles.statCardBtn} onClick={() => setTab('followers')}>
          <Users size={18} color="var(--accent-green)" />
          <span style={styles.statValue}>{profile.followersCount}</span>
          <span style={styles.statLabel}>Seguidores</span>
        </button>
        <button style={styles.statCardBtn} onClick={() => setTab('following')}>
          <UserCheck size={18} color="var(--accent-gold)" />
          <span style={styles.statValue}>{profile.followingCount}</span>
          <span style={styles.statLabel}>Siguiendo</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.listHeader}>
        <div style={styles.tabs}>
          <button style={tab === 'posts' ? styles.tabActive : styles.tab} onClick={() => setTab('posts')}>
            Publicaciones
          </button>
          <button style={tab === 'rutinas' ? styles.tabActive : styles.tab} onClick={() => setTab('rutinas')}>
            Rutinas
          </button>
          <button style={tab === 'followers' ? styles.tabActive : styles.tab} onClick={() => setTab('followers')}>
            Seguidores
          </button>
          <button style={tab === 'following' ? styles.tabActive : styles.tab} onClick={() => setTab('following')}>
            Siguiendo
          </button>
        </div>
        <span style={styles.listCount}>
          {tab === 'posts' ? postsTotal : tab === 'rutinas' ? publicRoutines.length : listTotal}
        </span>
      </div>

      {/* Content */}
      {tab === 'posts' ? (
        <div style={styles.listSection}>
          {loadingPosts && posts.length === 0 ? (
            <div style={styles.spinner} />
          ) : posts.length === 0 ? (
            <div style={styles.emptyBox}>
              <Repeat size={32} color="var(--accent-teal)" style={{ margin: '0 auto 0.75rem' }} />
              <span style={styles.stateText}>Este atleta aún no publica sesiones ni rutinas.</span>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={viewerUserId}
                  accessToken={tokens.accessToken}
                  copying={copyingPostId === post.id}
                  onToggleLike={handleToggleLike}
                  onDelete={setConfirmDelete}
                  onCopyRoutine={handleCopyRoutine}
                />
              ))}
              {loadingPosts && <div style={styles.spinner} />}
              {hasMorePosts && !loadingPosts && (
                <button
                  style={styles.loadMoreBtn}
                  onClick={() => userId && loadPosts(postsPage + 1, userId)}
                >
                  Cargar más ({posts.length}/{postsTotal})
                </button>
              )}
            </>
          )}
        </div>
      ) : tab === 'rutinas' ? (
        <div style={styles.listSection}>
          {loadingRoutines && publicRoutines.length === 0 ? (
            <div style={styles.spinner} />
          ) : publicRoutines.length === 0 ? (
            <div style={styles.emptyBox}>
              <Layers size={32} color="var(--accent-blue)" style={{ margin: '0 auto 0.75rem' }} />
              <span style={styles.stateText}>Este atleta no ha compartido rutinas públicas todavía.</span>
            </div>
          ) : (
            <>
              {publicRoutines.map((routine) => (
                <div key={routine.id} style={styles.routineRow}>
                  <div style={styles.routineRowIcon}>
                    <Layers size={16} color="var(--accent-blue)" />
                  </div>
                  <button
                    style={styles.routineRowInfo}
                    onClick={() => setDetailRoutineId(routine.id)}
                    title="Ver los ejercicios y series configurados de esta rutina"
                  >
                    <span style={styles.routineRowName}>{routine.name}</span>
                    <span style={styles.routineRowMeta}>
                      {routine.exerciseCount} {routine.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                    </span>
                  </button>
                  <button
                    style={styles.routineViewBtn}
                    onClick={() => setDetailRoutineId(routine.id)}
                    title="Ver los ejercicios y series configurados de esta rutina"
                  >
                    <Eye size={14} />
                    Ver detalle
                  </button>
                  <button
                    style={styles.routineCopyBtn}
                    disabled={copyingRoutineId === routine.id}
                    onClick={() => handleCopyPublicRoutine(routine.id)}
                  >
                    {copyingRoutineId === routine.id ? <Loader2 size={14} className="spin" /> : <Repeat size={14} />}
                    Copiar rutina
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div style={styles.listSection}>
          {list.length === 0 && !loadingList ? (
            <div style={styles.emptyBox}>
              <span style={styles.stateText}>{tab === 'followers' ? 'Sin seguidores todavía.' : 'Aún no sigue a nadie.'}</span>
            </div>
          ) : (
            <>
              {list.map((user) => (
                <FollowRow
                  key={user.id}
                  user={user}
                  viewerUserId={viewerUserId}
                  pending={pendingIds.has(user.id)}
                  onToggle={toggleFollowListRow}
                />
              ))}
              {loadingList && <div style={styles.spinner} />}
            </>
          )}
          {hasMoreList && !loadingList && (
            <button
              style={styles.loadMoreBtn}
              onClick={() => profile && userId && loadList(tab, userId, listPage + 1)}
            >
              Cargar más ({list.length}/{listTotal})
            </button>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="¿Eliminar publicación?"
        message="Se eliminará tu publicación y todos sus Me gusta y comentarios de forma permanente. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={confirmDeletePost}
        onCancel={() => setConfirmDelete(null)}
      />

      {detailRoutineId && (
        <RoutineDetailModal
          routineId={detailRoutineId}
          accessToken={tokens.accessToken}
          onClose={() => setDetailRoutineId(null)}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    boxSizing: 'border-box',
    maxWidth: '760px',
    margin: '0 auto',
  },
  backBtn: {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.88rem',
    padding: '0.4rem 0',
  },
  profileCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1.25rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.75rem 2rem',
    flexWrap: 'wrap',
  },
  avatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    border: '1px solid rgba(192, 138, 90, 0.3)',
    color: 'var(--accent-gold)',
    fontWeight: 800,
    fontSize: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImg: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: '1.5rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
    margin: 0,
  },
  memberSince: {
    color: 'var(--text-dim)',
    fontSize: '0.8rem',
    margin: '0.2rem 0 0',
  },
  bio: {
    color: 'var(--text-secondary)',
    fontSize: '0.92rem',
    lineHeight: 1.5,
    margin: '0.75rem 0 0',
  },
  followBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    backgroundColor: 'var(--primary)',
    color: 'var(--bg-color)',
    border: 'none',
    padding: '0.65rem 1.15rem',
    borderRadius: 'var(--radius-element)',
    fontWeight: 800,
    fontSize: '0.88rem',
    cursor: 'pointer',
    flexShrink: 0,
  },
  followingBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '0.65rem 1.15rem',
    borderRadius: 'var(--radius-element)',
    fontWeight: 700,
    fontSize: '0.88rem',
    cursor: 'pointer',
    flexShrink: 0,
  },
  secondaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '0.65rem 1.15rem',
    borderRadius: 'var(--radius-element)',
    fontWeight: 700,
    fontSize: '0.88rem',
    cursor: 'pointer',
    flexShrink: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '0.85rem',
  },
  statCard: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    cursor: 'default',
  },
  statCardBtn: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  statValue: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  statLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.5rem',
  },
  tabs: {
    display: 'flex',
    gap: '0.4rem',
    backgroundColor: 'var(--input-bg)',
    padding: '0.25rem',
    borderRadius: 'var(--radius-container)',
    overflowX: 'auto',
  },
  tab: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-control)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    background: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-control)',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },
  listCount: {
    color: 'var(--text-dim)',
    fontSize: '0.85rem',
    fontWeight: 700,
  },
  listSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  followRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '0.7rem 1rem',
  },
  routineRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '0.85rem 1rem',
    flexWrap: 'wrap',
  },
  routineRowIcon: {
    width: '38px',
    height: '38px',
    flexShrink: 0,
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'rgba(45, 132, 253, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineRowInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    flex: 1,
    minWidth: 0,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  routineRowName: {
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontSize: '0.92rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  routineRowMeta: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  routineCopyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    color: 'var(--accent-teal)',
    border: '1px solid rgba(45, 212, 191, 0.35)',
    borderRadius: 'var(--radius-control)',
    padding: '0.5rem 0.9rem',
    fontWeight: 700,
    fontSize: '0.82rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'opacity 120ms ease, transform 120ms ease',
  },
  routineViewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
    padding: '0.5rem 0.9rem',
    fontWeight: 700,
    fontSize: '0.82rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    transition: 'opacity 120ms ease, transform 120ms ease',
  },
  followRowUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    minWidth: 0,
  },
  rowAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    border: '1px solid rgba(192, 138, 90, 0.3)',
    color: 'var(--accent-gold)',
    fontWeight: 800,
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowAvatarImg: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  rowName: {
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontSize: '0.92rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  loadMoreBtn: {
    alignSelf: 'center',
    marginTop: '0.5rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '0.6rem 1.4rem',
    borderRadius: 'var(--radius-element)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  emptyBox: {
    padding: '2rem',
    textAlign: 'center',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  stateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    textAlign: 'center',
    gap: '0.35rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
  },
  stateTitle: {
    fontSize: '1.05rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  stateText: { color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px' },
  spinner: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '3px solid var(--border-color)',
    borderTopColor: 'var(--accent-teal)',
    animation: 'spin 0.8s linear infinite',
    margin: '0.5rem auto',
  },
};