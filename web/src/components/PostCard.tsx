import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Clock, Dumbbell, Repeat, Flame, Trash2, MessageCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { api, type FeedPost, type PostComment } from '../api/api';

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

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest.toString().padStart(2, '0')}s`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === today.toDateString()) {
    return `Hoy · ${time}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer · ${time}`;
  }
  return `${date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })} · ${time}`;
}

function initials(fullName: string | null): string {
  return (fullName || 'A').trim().slice(0, 2).toUpperCase();
}

export const PostCard: React.FC<PostCardProps> = ({
  post, currentUserId, accessToken, highlighted, copying, onToggleLike, onDelete, onCopyRoutine,
}) => {
  const navigate = useNavigate();
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

      {/* User's own photo (optional, never auto-added from exercises) */}
      {post.imageUrl && (
        <div style={styles.cover}>
          <img src={post.imageUrl} alt="Foto de la sesión" draggable={false} loading="lazy" style={styles.coverImg} />
        </div>
      )}

      {/* Workout snapshot */}
      {post.workout && (
        <div style={styles.workoutCard}>
          <div style={styles.workoutTitleRow}>
            <Flame size={16} color="var(--accent-gold)" />
            <span style={styles.workoutTitle}>{post.workout.routineName || 'Entrenamiento libre'}</span>
            {post.prAchieved && (
              <span style={styles.prBadge} title="Lograste un nuevo récord personal en esta sesión">
                <Flame size={13} fill="currentColor" />
                PR
              </span>
            )}
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

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--surface-color)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-container)',
    padding: '1.5rem 1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  cardHighlighted: {
    boxShadow: '0 0 0 1px var(--border-highlight)',
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
    flexWrap: 'wrap',
  },
  workoutTitle: {
    fontWeight: 800,
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
  },
  prBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.15rem 0.55rem',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'rgba(192, 138, 90, 0.18)',
    border: '1px solid rgba(192, 138, 90, 0.45)',
    color: 'var(--accent-gold)',
    fontWeight: 800,
    fontSize: '0.72rem',
    letterSpacing: '0.02em',
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
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
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
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
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
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
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
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
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
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, transform 0.15s ease',
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
};