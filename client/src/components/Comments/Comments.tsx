import React, { useState, useEffect, KeyboardEvent } from 'react';
import { Comment } from '../../types/comment.types';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { ServerImage } from '../ServerImage/ServerImage';
import styles from './Comments.module.css';
import { Link } from 'react-router-dom';

interface CommentsProps {
    postId: number;
}

export const Comments: React.FC<CommentsProps> = ({ postId }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsCount, setCommentsCount] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAllComments, setShowAllComments] = useState(false);
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [expandedComments, setExpandedComments] = useState<number[]>([]);

    // Уникальный ID для поля ввода комментария
    const commentInputId = `commentInput-${postId}`;

    // Загрузка всех комментариев или только первого
    const loadComments = async (loadAll = false) => {
        try {
            setLoading(true);

            // При первой загрузке получаем первый комментарий
            const limit = loadAll ? 100 : 1;
            const response = await api.get(`/comments/post/${postId}?limit=${limit}`);

            if (Array.isArray(response)) {
                setComments(response);
                setCommentsCount(response.length + response.reduce((acc, comment) => acc + (comment.replies?.length || 0), 0));
                if (!loadAll && response.length >= 1) {
                    // Если получили ровно 1 комментарий, то возможно есть и больше
                    const countResponse = await api.get(`/comments/post/${postId}/count`);
                    if (typeof countResponse?.count === 'number') {
                        setCommentsCount(countResponse.count);
                    }
                }
                setInitialLoaded(true);
            } else {
                console.error('Unexpected comments response format:', response);
                setComments([]);
            }
        } catch (err) {
            console.error('Error loading comments:', err);
            setError('Не удалось загрузить комментарии');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // При первой загрузке получаем первый комментарий
        if (!initialLoaded) {
            loadComments(false);
        }
    }, [postId, initialLoaded]);

    // Загружаем все комментарии, когда пользователь нажимает "Показать все"
    useEffect(() => {
        if (showAllComments && comments.length < commentsCount) {
            loadComments(true);
        }
    }, [showAllComments, comments.length, commentsCount]);

    // Сброс формы ответа
    const resetReplyForm = () => {
        setReplyingTo(null);
        setNewComment('');
    };

    // Добавление нового комментария
    const handleAddComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!user) {
            setError('Необходимо войти в систему для добавления комментариев');
            return;
        }

        if (!newComment.trim()) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const payload = {
                content: newComment.trim(),
                parentId: replyingTo ? replyingTo.id : undefined
            };

            const response = await api.post(`/comments/post/${postId}`, payload);

            if (replyingTo) {
                // Добавляем ответ к существующему комментарию
                setComments(prevComments =>
                    prevComments.map(comment =>
                        comment.id === replyingTo.id
                            ? {
                                ...comment,
                                replies: [...(comment.replies || []), response]
                            }
                            : comment
                    )
                );
            } else {
                // Добавляем новый родительский комментарий
                setComments(prev => [...prev, response]);
            }

            setCommentsCount(prev => prev + 1);
            setNewComment(''); // Очищаем поле ввода
            setReplyingTo(null); // Сброс ответа
        } catch (err) {
            console.error('Error adding comment:', err);
            setError('Не удалось добавить комментарий');
        } finally {
            setLoading(false);
        }
    };

    // Обработка нажатия Enter для отправки комментария
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddComment();
        }
    };

    // Начать ответ на комментарий
    const handleReply = (comment: Comment) => {
        setReplyingTo(comment);
        // Фокус на поле ввода с уникальным ID для этого поста
        const commentInput = document.getElementById(commentInputId);
        if (commentInput) {
            commentInput.focus();
        }
    };

    // Удаление комментария
    const handleDeleteComment = async (commentId: number, isReply: boolean, parentId?: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) {
            return;
        }

        try {
            setLoading(true);
            const response = await api.delete(`/comments/${commentId}`);

            const { deletedCount } = response;

            if (isReply && parentId) {
                // Удаление ответа из родительского комментария
                setComments(prevComments =>
                    prevComments.map(comment =>
                        comment.id === parentId
                            ? {
                                ...comment,
                                replies: (comment.replies || []).filter(reply => reply.id !== commentId)
                            }
                            : comment
                    )
                );
            } else {
                // Удаление родительского комментария вместе со всеми ответами
                setComments(prev => prev.filter(comment => comment.id !== commentId));
            }

            setCommentsCount(prev => Math.max(0, prev - deletedCount));
        } catch (err) {
            console.error('Error deleting comment:', err);
            setError('Не удалось удалить комментарий');
        } finally {
            setLoading(false);
        }
    };

    // Форматирование времени создания комментария (более компактный формат)
    const formatTime = (createdAt: string) => {
        const date = new Date(createdAt);
        const now = new Date();

        // Если комментарий создан сегодня, показываем только время
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('ru', { hour: 'numeric', minute: 'numeric' });
        }

        // Если комментарий создан в этом году, не показываем год
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) +
                ' ' + date.toLocaleTimeString('ru', { hour: 'numeric', minute: 'numeric' });
        }

        // Иначе показываем полную дату
        return date.toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' }) +
            ' ' + date.toLocaleTimeString('ru', { hour: 'numeric', minute: 'numeric' });
    };

    // Показываем комментарии, которые нужно отображать
    const visibleComments = showAllComments
        ? comments
        : comments.slice(0, 1);

    const totalCommentsCount = comments.reduce((acc, comment) =>
        acc + 1 + (comment.replies?.length || 0), 0);

    const hasMoreComments = commentsCount > totalCommentsCount;

    // Функция для переключения состояния раскрытия ответов на комментарий
    const toggleReplies = (commentId: number) => {
        setExpandedComments(prev =>
            prev.includes(commentId)
                ? prev.filter(id => id !== commentId)
                : [...prev, commentId]
        );
    };

    // Функция для переключения отображения всех комментариев
    const toggleComments = () => {
        setShowAllComments(prev => !prev);
    };

    // Рендеринг одного комментария (используется для рендеринга родительских и дочерних)
    const renderComment = (comment: Comment, isReply = false, parentId?: number) => (
        <div key={comment.id} className={`${styles.commentItem} ${isReply ? styles.replyComment : ''}`}>
            <div className={styles.commentContentContainer}>
                <div className={styles.commentHeader}>
                    <Link to={`/users/${comment.author.id}`} className={styles.commentAuthor}>
                        {comment.author.avatar ? (
                            <ServerImage
                                path={comment.author.avatar.path}
                                alt={`${comment.author.firstName} ${comment.author.lastName}`}
                                className={styles.commentAvatar}
                            />
                        ) : (
                            <div className={styles.defaultAvatar}>
                                {comment.author.firstName.charAt(0)}{comment.author.lastName.charAt(0)}
                            </div>
                        )}
                        <div className={styles.authorInfo}>
                            <span className={`${styles.authorName} ${comment.isPostAuthor ? styles.authorIsPostAuthor : ''} ${comment.isGroupAdmin ? styles.authorIsGroupAdmin : ''}`}>
                                {comment.author.firstName} {comment.author.lastName}
                                {comment.isPostAuthor && <span className={styles.authorBadge}>Автор</span>}
                                {comment.isGroupAdmin && <span className={styles.adminBadge}>Админ</span>}
                            </span>
                        </div>
                    </Link>
                    <div className={styles.commentActions}>
                        {user && user.id === comment.authorId && (
                            <button
                                className={styles.deleteButton}
                                onClick={() => handleDeleteComment(comment.id, isReply, parentId)}
                                disabled={loading}
                                title="Удалить комментарий"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4h-3.5z" />
                                </svg>
                            </button>
                        )}
                        <span className={styles.commentTime}>
                            {formatTime(comment.createdAt)}
                        </span>
                    </div>
                </div>

                <div className={styles.commentContent}>
                    {comment.content}
                </div>

                {user && !isReply && (
                    <div className={styles.replyButtonContainer}>
                        <button
                            className={styles.replyButton}
                            onClick={() => handleReply(comment)}
                            disabled={loading}
                        >
                            Ответить
                        </button>
                    </div>
                )}
            </div>
            {/* Отображаем ответы на этот комментарий */}
            {!isReply && comment.replies && comment.replies.length > 0 && (
                <div className={styles.repliesContainer}>
                    {/* Показываем только первый ответ если комментарий не раскрыт */}
                    {expandedComments.includes(comment.id)
                        ? comment.replies.map(reply => renderComment(reply, true, comment.id))
                        : comment.replies.slice(0, 1).map(reply => renderComment(reply, true, comment.id))
                    }

                    {/* Кнопка "Показать больше ответов" если их больше одного и они не раскрыты */}
                    {comment.replies.length > 1 && !expandedComments.includes(comment.id) && (
                        <button
                            className={styles.showMoreButton}
                            onClick={() => toggleReplies(comment.id)}
                        >
                            Ответы ({comment.replies.length})
                        </button>
                    )}

                    {/* Кнопка "Скрыть ответы" если ответы раскрыты */}
                    {comment.replies.length > 1 && expandedComments.includes(comment.id) && (
                        <button
                            className={styles.showMoreButton}
                            onClick={() => toggleReplies(comment.id)}
                        >
                            Скрыть ответы
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className={styles.comments}>
            {loading && <div className={styles.loading}>Загрузка...</div>}

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.commentsList}>
                {visibleComments.length === 0 ? (
                    null
                ) : (
                    visibleComments.map(comment => renderComment(comment))
                )}
            </div>

            {!showAllComments && commentsCount > 1 && (
                <button
                    className={styles.showMoreButton}
                    onClick={toggleComments}
                >
                    Показать еще {commentsCount - 1} {getCommentForm(commentsCount - 1)}
                </button>
            )}

            {showAllComments && commentsCount > 1 && (
                <button
                    className={styles.showMoreButton}
                    onClick={toggleComments}
                >
                    Скрыть комментарии
                </button>
            )}

            {user && (
                <form className={styles.addCommentForm} onSubmit={handleAddComment}>
                    {replyingTo && (
                        <div className={styles.replyingToContainer}>
                            <span className={styles.replyingToLabel}>
                                Ответ {replyingTo.author.firstName} {replyingTo.author.lastName}
                            </span>
                            <button
                                type="button"
                                className={styles.cancelReplyButton}
                                onClick={resetReplyForm}
                            >
                                ×
                            </button>
                        </div>
                    )}
                    <input
                        id={commentInputId}
                        type="text"
                        className={styles.commentInput}
                        placeholder={replyingTo ? "Напишите ответ..." : "Напишите комментарий..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <div className={styles.formControls}>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={loading || !newComment.trim()}
                            title="Отправить комментарий"
                        >
                            {loading ? (
                                <span className={styles.loadingDots}>...</span>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

// Вспомогательная функция для правильной формы числительного "комментарий"
function getCommentForm(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return 'комментариев';
    }

    if (lastDigit === 1) {
        return 'комментарий';
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return 'комментария';
    }

    return 'комментариев';
} 