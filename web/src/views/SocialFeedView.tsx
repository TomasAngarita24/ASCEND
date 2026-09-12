import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Dumbbell, Search, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '../components/ConfirmModal';
import { PostCard } from '../components/PostCard';
import { api, type FeedPost, type SocialUserSummary } from '../api/api';

interface SocialViewProps {
  currentUserId: string;
  highlightPostId?: string | null;
  onHighlightConsumed?: () => void;
}

function initials(fullName: string | null): string {
  return (fullName || 'A').trim().slice(0, 2).toUpperCase();
}

interface SearchRowProps {
  user: SocialUserSummary;
  currentUserId: string;
  pending: boolean;
  onToggle: (user: SocialUserSummary) => void;
}

const SearchRow: React.FC<SearchRowProps> = ({ user, currentUserId, pending, onToggle }) => {
  const navigate = useNavigate();
  const isSelf = user.id === currentUserId;

  return (
    <div style={styles.searchRow}>
      <button style={styles.searchRowUser} onClick={() => navigate(`/users/${user.id}`)}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.fullName ?? 'avatar'} style={styles.searchRowAvatarImg} />
        ) : (
          <div style={styles.searchRowAvatar}>{initials(user.fullName)}</div>
        )}
        <div style={{ minWidth: 0 }}>
          <span style={styles.searchRowName}>{user.fullName || 'Atleta'}</span>
          <span style={styles.searchRowHint}>{isSelf ? 'Tu perfil' : 'Ver perfil'}</span>
        </div>
      </button>
      {!isSelf && (
        <button
          style={user.isFollowing ? styles.searchFollowingBtn : styles.searchFollowBtn}
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

export const SocialFeedView: React.FC<SocialViewProps> = ({ currentUserId, highlightPostId, onHighlightConsumed }) => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<FeedPost | null>(null);
  const [copyingPostId, setCopyingPostId] = useState<string | null>(null);
  const highlightHandled = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SocialUserSummary[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [pendingSearchIds, setPendingSearchIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchTotal(0);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await api.searchUsers(query, 1, 20);
        setSearchResults(res.data);
        setSearchTotal(res.pagination.total);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'No se pudo buscar atletas.');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const fetchFeed = useCallback(async (targetPage: number) => {
    if (targetPage === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.getSocialFeed(targetPage, 20);
      setPosts((prev) => (targetPage === 1 ? res.data : [...prev, ...res.data]));
      setTotal(res.pagination.total);
      setPage(targetPage);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar el feed.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(1);
  }, [fetchFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.getSocialFeed(1, 20);
      setPosts(res.data);
      setTotal(res.pagination.total);
      setPage(1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el feed.');
    } finally {
      setRefreshing(false);
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
        await api.likePost(post.id);
      } else {
        await api.unlikePost(post.id);
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

  const handleDelete = async (post: FeedPost) => {
    setConfirmDelete(post);
  };

  const confirmDeletePost = async () => {
    if (!confirmDelete) return;
    const post = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.deletePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success('Publicación eliminada.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la publicación.');
    }
  };

  const handleCopyRoutine = async (post: FeedPost) => {
    setCopyingPostId(post.id);
    try {
      const routine = await api.copyRoutinePost(post.id);
      toast.success(`Rutina "${routine.name}" copiada a tu biblioteca.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo copiar la rutina.');
    } finally {
      setCopyingPostId(null);
    }
  };

  const toggleFollowFromSearch = async (user: SocialUserSummary) => {
    if (user.id === currentUserId) return;
    const wasFollowing = user.isFollowing;
    setPendingSearchIds((prev) => new Set(prev).add(user.id));
    setSearchResults((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, isFollowing: !wasFollowing } : u)),
    );
    try {
      if (wasFollowing) {
        await api.unfollowUser(user.id);
      } else {
        await api.followUser(user.id);
      }
    } catch (err: unknown) {
      setSearchResults((prev) => prev.map((u) => (u.id === user.id ? { ...u, isFollowing: wasFollowing } : u)));
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el follow.');
    } finally {
      setPendingSearchIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  useEffect(() => {
    if (!highlightPostId || highlightHandled.current || loading) return;
    const element = document.getElementById(`post-${highlightPostId}`);
    if (element) {
      highlightHandled.current = true;
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element.classList.add('social-card-flash');
      const flashTimer = window.setTimeout(() => element.classList.remove('social-card-flash'), 1800);
      onHighlightConsumed?.();
      return () => window.clearTimeout(flashTimer);
    }
  }, [highlightPostId, posts, loading, onHighlightConsumed]);

  const hasMore = posts.length < total;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Social</h1>
          <p style={styles.subtitle}>
            Comparte tus entrenamientos y descubre lo que hace la comunidad
          </p>
        </div>
        <button style={styles.refreshBtn} onClick={handleRefresh} disabled={refreshing}>
          <Users size={16} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Discover: search people to follow */}
      <div style={styles.searchSection}>
        <div style={styles.searchBox}>
          <Search size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar atletas por nombre…"
            maxLength={100}
            style={styles.searchInput}
          />
          {searching && <Loader2 size={16} className="spin" color="var(--accent-teal)" style={{ flexShrink: 0 }} />}
        </div>
        {searchQuery.trim() !== '' && searchResults.length > 0 && (
          <div style={styles.searchResults}>
            <span style={styles.searchCount}>
              {searchTotal} resultado{searchTotal !== 1 ? 's' : ''}
            </span>
            {searchResults.map((user) => (
              <SearchRow
                key={user.id}
                user={user}
                currentUserId={currentUserId}
                pending={pendingSearchIds.has(user.id)}
                onToggle={toggleFollowFromSearch}
              />
            ))}
          </div>
        )}
        {searchQuery.trim() !== '' && searchResults.length === 0 && !searching && (
          <span style={styles.searchEmpty}>No se encontraron atletas con ese nombre.</span>
        )}
      </div>

      {loading ? (
        <div style={styles.stateBox}>
          <div style={styles.spinner} />
          <span style={styles.stateText}>Cargando el feed...</span>
        </div>
      ) : posts.length === 0 ? (
        <div style={styles.stateBox}>
          <Dumbbell size={40} color="var(--accent-teal)" style={{ marginBottom: '0.75rem' }} />
          <span style={styles.stateTitle}>Todavía no hay publicaciones</span>
          <span style={styles.stateText}>
            Termina un entrenamiento y compártelo con el botón que aparece al finalizar para estrenar el feed.
          </span>
        </div>
      ) : (
        <>
          <div style={styles.feed}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                highlighted={post.id === highlightPostId}
                copying={copyingPostId === post.id}
                onToggleLike={handleToggleLike}
                onDelete={handleDelete}
                onCopyRoutine={handleCopyRoutine}
              />
            ))}
          </div>
          {hasMore && (
            <button
              style={styles.loadMoreBtn}
              onClick={() => fetchFeed(page + 1)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Cargando más...' : `Cargar más (${posts.length}/${total})`}
            </button>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="¿Eliminar publicación?"
        message="Se eliminará tu publicación y todos sus Me gusta y comentarios de forma permanente. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={confirmDeletePost}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 5vw, 3rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.75rem',
    boxSizing: 'border-box',
    maxWidth: '760px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: { color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '0.6rem 1rem',
    borderRadius: 'var(--radius-element)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  searchSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-element)',
    padding: '0.7rem 1rem',
    transition: 'border-color 0.15s ease',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary)',
    fontSize: '0.92rem',
    fontFamily: 'inherit',
    minWidth: 0,
  },
  searchResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '0.75rem',
  },
  searchCount: {
    color: 'var(--text-dim)',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0.1rem 0.4rem',
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-container)',
    padding: '0.6rem 0.9rem',
  },
  searchRowUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    minWidth: 0,
    textAlign: 'left',
  },
  searchRowAvatar: {
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
  searchRowAvatarImg: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  searchRowName: {
    display: 'block',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  searchRowHint: {
    display: 'block',
    color: 'var(--text-dim)',
    fontSize: '0.72rem',
    marginTop: '0.1rem',
  },
  searchFollowBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'var(--primary)',
    color: 'var(--bg-color)',
    border: 'none',
    padding: '0.5rem 0.9rem',
    borderRadius: 'var(--radius-control)',
    fontWeight: 800,
    fontSize: '0.8rem',
    cursor: 'pointer',
    flexShrink: 0,
  },
  searchFollowingBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '0.5rem 0.9rem',
    borderRadius: 'var(--radius-control)',
    fontWeight: 700,
    fontSize: '0.8rem',
    cursor: 'pointer',
    flexShrink: 0,
  },
  searchEmpty: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    textAlign: 'center',
    padding: '0.75rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-element)',
  },
  loadMoreBtn: {
    alignSelf: 'center',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    padding: '0.7rem 1.6rem',
    borderRadius: 'var(--radius-element)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.88rem',
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
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid var(--border-color)',
    borderTopColor: 'var(--accent-teal)',
    animation: 'spin 0.8s linear infinite',
    marginBottom: '0.5rem',
  },
};