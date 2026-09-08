import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Clock, Dumbbell, Repeat, Flame, Trash2, MessageCircle, Copy, Search, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '../components/ConfirmModal';
import { api, type FeedPost, type PostComment, type SocialUserSummary, type Tokens } from '../api/api';

interface SocialViewProps {
  tokens: Tokens;
  currentUserId: string;
  highlightPostId?: string | null;
  onHighlightConsumed?: () => void;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest.toString().padStart(2, '0')}s`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) {
    return `Hoy · ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
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

interface PostCardProps {
  post: FeedPost;
  currentUserId: string;
  accessToken: string;
  highlighted?: boolean;
  copying?: boolean;
  onToggleLike: (post: FeedPost) => void;
  onDelete: (post: FeedPost) => void;
  onCopyRoutine: (post: FeedPost) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post, currentUserId, accessToken, highlighted, copying, onToggleLike, onDelete, onCopyRoutine,
}) => {
  const navigate = useNavigate();
  const coverExercise = post.workout?.exercises.find((ex) => ex.mediaUrl) ?? post.workout?.exercises[0] ?? null;
  const isMine = post.author.id === currentUserId;
  const exerciseCount = post.workout?.exercises.length ?? 0;

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPage, setCommentsPage] = useState(1);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentCount);

  const loadComments = useCallback(async (targetPage: number) => {
    setLoadingComments(true);
    try {
      const res = await api.getPostComments(accessToken, post.id, targetPage, 10);
      setComments((prev) => (targetPage === 1 ? res.data : [...prev, ...res.data]));
      setCommentsTotal(res.pagination.total);
      setCommentsPage(targetPage);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los comentarios.');
    } finally {
      setLoadingComments(false);
    }
  }, [accessToken, post.id]);

  const toggleComments = () => {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setCommentsOpen(true);
    if (comments.length === 0) {
      loadComments(1);
    }
  };

  const submitComment = async () => {
    const body = commentInput.trim();
    if (!body || postingComment) return;
    setPostingComment(true);
    try {
      const created = await api.addPostComment(accessToken, post.id, body);
      setComments((prev) => [...prev, created]);
      setCommentsTotal((t) => t + 1);
      setCommentCount((c) => c + 1);
      setCommentInput('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo publicar el comentario.');
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      style={highlighted ? { ...styles.card, ...styles.cardHighlighted } : styles.card}
    >
      {/* Header: author + actions */}
      <div style={styles.cardHeader}>
        <button
          style={styles.author}
          onClick={() => navigate(isMine ? '/profile' : `/users/${post.author.id}`)}
          title={isMine ? 'Ver mi perfil' : 'Ver perfil'}
        >
          {post.author.avatarUrl ? (
            <img src={post.author.avatarUrl} alt={post.author.fullName ?? 'avatar'} style={styles.avatarImg} />
          ) : (
            <div style={styles.avatar}>{initials(post.author.fullName)}</div>
          )}
          <div>
            <span style={styles.authorName}>{post.author.fullName || 'Atleta'}</span>
            <span style={styles.postDate}>{formatDate(post.createdAt)}</span>
          </div>
        </button>
        {isMine && (
          <button style={styles.deleteBtn} onClick={() => onDelete(post)} title="Eliminar publicación">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Caption */}
      {post.caption && <p style={styles.caption}>{post.caption}</p>}

      {/* Cover image (first exercise media, left-biased crop) */}
      {coverExercise?.mediaUrl && (
        <div style={styles.cover}>
          <img src={coverExercise.mediaUrl} alt={coverExercise.name} draggable={false} style={styles.coverImg} />
        </div>
      )}

      {/* Workout snapshot */}
      {post.workout && (
        <div style={styles.workoutCard}>
          <div style={styles.workoutTitleRow}>
            <Flame size={16} color="var(--accent-gold)" />
            <span style={styles.workoutTitle}>{post.workout.routineName || 'Entrenamiento libre'}</span>
          </div>
          <div style={styles.workoutStats}>
            <div style={styles.workoutStat}>
              <Clock size={14} color="var(--accent-teal)" />
              <span>{formatDuration(post.workout.durationSeconds)}</span>
            </div>
            <div style={styles.workoutStat}>
              <Dumbbell size={14} color="var(--accent-blue)" />
              <span>{post.workout.totalVolume.toLocaleString()} kg</span>
            </div>
            <div style={styles.workoutStat}>
              <Repeat size={14} color="var(--accent-green)" />
              <span>{exerciseCount} ejercicio{exerciseCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          {post.workout.exercises.length > 0 && (
            <div style={styles.exercisesRow}>
              {post.workout.exercises.slice(0, 6).map((ex) => (
                <span key={ex.id} style={styles.exerciseChip}>
                  {ex.name} <strong style={{ color: 'var(--accent-teal)' }}>×{ex.setsCompleted}</strong>
                </span>
              ))}
              {post.workout.exercises.length > 6 && (
                <span style={styles.exerciseChip}>+{post.workout.exercises.length - 6} más</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Routine snapshot */}
      {post.routine && (
        <div style={styles.workoutCard}>
          <div style={styles.workoutTitleRow}>
            <Repeat size={16} color="var(--accent-teal)" />
            <span style={styles.workoutTitle}>{post.routine.name}</span>
          </div>
          <div style={styles.workoutStats}>
            <div style={styles.workoutStat}>
              <Dumbbell size={14} color="var(--accent-blue)" />
              <span>{post.routine.exerciseCount} ejercicio{post.routine.exerciseCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          {post.routine.muscleGroups.length > 0 && (
            <div style={styles.exercisesRow}>
              {post.routine.muscleGroups.slice(0, 8).map((group) => (
                <span key={group} style={styles.exerciseChip}>{group}</span>
              ))}
              {post.routine.muscleGroups.length > 8 && (
                <span style={styles.exerciseChip}>+{post.routine.muscleGroups.length - 8} más</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Like + Comment actions */}
      <div style={styles.cardFooter}>
        <div style={styles.footerActions}>
          <button
            style={post.likedByMe ? styles.likeBtnActive : styles.likeBtn}
            onClick={() => onToggleLike(post)}
          >
            <Heart size={17} fill={post.likedByMe ? 'currentColor' : 'none'} />
            <span>{post.likeCount > 0 ? post.likeCount : 'Me gusta'}</span>
          </button>
          <button
            style={commentsOpen ? styles.commentBtnActive : styles.commentBtn}
            onClick={toggleComments}
          >
            <MessageCircle size={17} />
            <span>{commentCount > 0 ? commentCount : 'Comentar'}</span>
          </button>
        </div>
        {post.routine && (
          <button
            style={styles.copyBtn}
            onClick={() => onCopyRoutine(post)}
            disabled={copying}
            title="Guardar esta rutina en tu biblioteca"
          >
            <Copy size={16} />
            {copying ? 'Copiando...' : 'Copiar rutina'}
          </button>
        )}
      </div>

      {/* Comments thread */}
      {commentsOpen && (
        <div style={styles.commentsSection}>
          {loadingComments && comments.length === 0 ? (
            <span style={styles.commentsEmpty}>Cargando comentarios...</span>
          ) : comments.length === 0 ? (
            <span style={styles.commentsEmpty}>Sin comentarios todavía. ¡Sé el primero!</span>
          ) : (
            <>
              {comments.map((comment) => (
                <div key={comment.id} style={styles.commentRow}>
                  <button
                    style={styles.commentAvatarBtn}
                    onClick={() => navigate(comment.author.id === currentUserId ? '/profile' : `/users/${comment.author.id}`)}
                  >
                    {comment.author.avatarUrl ? (
                      <img src={comment.author.avatarUrl} alt={comment.author.fullName ?? 'avatar'} style={styles.commentAvatarImg} />
                    ) : (
                      <div style={styles.commentAvatar}>{initials(comment.author.fullName)}</div>
                    )}
                  </button>
                  <div style={styles.commentBody}>
                    <div style={styles.commentMeta}>
                      <span style={styles.commentAuthorName}>{comment.author.fullName || 'Atleta'}</span>
                      <span style={styles.commentDate}>{formatDate(comment.createdAt)}</span>
                    </div>
                    <p style={styles.commentText}>{comment.body}</p>
                  </div>
                </div>
              ))}
              {comments.length < commentsTotal && (
                <button style={styles.loadCommentsBtn} onClick={() => loadComments(commentsPage + 1)} disabled={loadingComments}>
                  {loadingComments ? 'Cargando más...' : `Cargar más comentarios (${comments.length}/${commentsTotal})`}
                </button>
              )}
            </>
          )}

          {/* Comment composer */}
          <div style={styles.composerRow}>
            <input
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitComment();
                }
              }}
              placeholder="Escribe un comentario…"
              maxLength={500}
              style={styles.composerInput}
            />
            <button
              style={styles.composerBtn}
              onClick={submitComment}
              disabled={!commentInput.trim() || postingComment}
            >
              {postingComment ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
};

export const SocialFeedView: React.FC<SocialViewProps> = ({ tokens, currentUserId, highlightPostId, onHighlightConsumed }) => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
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
        const res = await api.searchUsers(tokens.accessToken, query, 1, 20);
        setSearchResults(res.data);
        setSearchTotal(res.pagination.total);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'No se pudo buscar atletas.');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, tokens]);

  const fetchFeed = useCallback(async (targetPage: number) => {
    if (targetPage === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.getSocialFeed(tokens.accessToken, targetPage, 20);
      setPosts((prev) => (targetPage === 1 ? res.data : [...prev, ...res.data]));
      setTotal(res.pagination.total);
      setPage(targetPage);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar el feed.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tokens]);

  useEffect(() => {
    fetchFeed(1);
  }, [fetchFeed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.getSocialFeed(tokens.accessToken, 1, 20);
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
    const nextLiked = !post.likedByMe;
    const delta = nextLiked ? 1 : -1;
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
      await api.deletePost(tokens.accessToken, post.id);
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
      const routine = await api.copyRoutinePost(tokens.accessToken, post.id);
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
        await api.unfollowUser(tokens.accessToken, user.id);
      } else {
        await api.followUser(tokens.accessToken, user.id);
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
      window.setTimeout(() => element.classList.remove('social-card-flash'), 1800);
      onHighlightConsumed?.();
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
                accessToken={tokens.accessToken}
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
    padding: '2.5rem 3rem',
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
  card: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.5rem 1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  author: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    minWidth: 0,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: 'var(--radius-control)',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    border: '1px solid rgba(192, 138, 90, 0.3)',
    color: 'var(--accent-gold)',
    fontWeight: 800,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImg: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0,
  },
  authorName: {
    display: 'block',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
  },
  postDate: {
    display: 'block',
    color: 'var(--text-dim)',
    fontSize: '0.75rem',
    marginTop: '0.1rem',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: 'var(--radius-element)',
    display: 'flex',
    alignItems: 'center',
  },
  caption: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    lineHeight: 1.55,
    margin: 0,
  },
  cover: {
    width: '100%',
    aspectRatio: '3 / 2',
    borderRadius: 'var(--radius-control)',
    overflow: 'hidden',
    backgroundColor: 'var(--input-bg)',
  },
  coverImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: '0% center',
    display: 'block',
  },
  workoutCard: {
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
    padding: '1rem 1.15rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  workoutTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  workoutTitle: {
    fontWeight: 800,
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
  },
  workoutStats: {
    display: 'flex',
    gap: '1.25rem',
    flexWrap: 'wrap',
  },
  workoutStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  exercisesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  exerciseChip: {
    fontSize: '0.78rem',
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    padding: '0.3rem 0.65rem',
    borderRadius: 'var(--radius-full)',
    color: 'var(--text-secondary)',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '0.85rem',
  },
  footerActions: {
    display: 'flex',
    gap: '0.4rem',
  },
  likeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    padding: '0.45rem 0.8rem',
    borderRadius: 'var(--radius-control)',
    transition: 'all 0.15s ease',
  },
  likeBtnActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: 'rgba(220, 38, 38, 0.1)',
    border: '1px solid rgba(220, 38, 38, 0.25)',
    color: '#f87171',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.85rem',
    padding: '0.45rem 0.8rem',
    borderRadius: 'var(--radius-control)',
    transition: 'all 0.15s ease',
  },
  commentBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    padding: '0.45rem 0.8rem',
    borderRadius: 'var(--radius-control)',
    transition: 'all 0.15s ease',
  },
  commentBtnActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.85rem',
    padding: '0.45rem 0.8rem',
    borderRadius: 'var(--radius-control)',
    transition: 'all 0.15s ease',
  },
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
    background: 'rgba(192, 138, 90, 0.1)',
    border: '1px solid rgba(192, 138, 90, 0.3)',
    color: 'var(--accent-teal)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.85rem',
    padding: '0.45rem 0.8rem',
    borderRadius: 'var(--radius-control)',
    transition: 'all 0.15s ease',
  },
  cardHighlighted: {
    boxShadow: '0 0 0 1px var(--border-highlight)',
  },
  commentsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '0.9rem',
  },
  commentsEmpty: {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    textAlign: 'center',
    padding: '0.5rem',
  },
  commentRow: {
    display: 'flex',
    gap: '0.7rem',
  },
  commentAvatarBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  commentAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(192, 138, 90, 0.15)',
    border: '1px solid rgba(192, 138, 90, 0.3)',
    color: 'var(--accent-gold)',
    fontWeight: 800,
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarImg: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  commentBody: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'var(--input-bg)',
    borderRadius: 'var(--radius-container)',
    padding: '0.55rem 0.85rem',
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
    marginBottom: '0.15rem',
  },
  commentAuthorName: {
    fontWeight: 700,
    fontSize: '0.82rem',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  commentDate: {
    fontSize: '0.7rem',
    color: 'var(--text-dim)',
  },
  commentText: {
    fontSize: '0.87rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.45,
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  loadCommentsBtn: {
    alignSelf: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-teal)',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.8rem',
    padding: '0.3rem 0.5rem',
  },
  composerRow: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  composerInput: {
    flex: 1,
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-control)',
    padding: '0.6rem 0.85rem',
    color: 'var(--text-primary)',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    outline: 'none',
    minWidth: 0,
  },
  composerBtn: {
    backgroundColor: 'var(--primary)',
    color: 'var(--bg-color)',
    border: 'none',
    padding: '0.6rem 1rem',
    borderRadius: 'var(--radius-control)',
    fontWeight: 800,
    fontSize: '0.85rem',
    cursor: 'pointer',
    flexShrink: 0,
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