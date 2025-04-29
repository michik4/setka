import React, { useCallback, useRef } from 'react';
import { Post as PostType } from '../../types/post.types';
import { Post } from '../Post/Post';
import styles from './PostFeed.module.css';
import { API_URL } from '../../config';
import { useInfiniteScroll } from '../../utils/useInfiniteScroll';
import { tokenService } from '../../utils/api';

interface PostFeedProps {
    showOnlySubscribedGroups?: boolean;
}

export const PostFeed: React.FC<PostFeedProps> = ({ showOnlySubscribedGroups = false }) => {
    const PAGE_SIZE = 10;

    const loadMorePosts = useCallback(async (page: number) => {
        try {
            // Определяем URL в зависимости от параметра showOnlySubscribedGroups
            const baseUrl = showOnlySubscribedGroups 
                ? `${API_URL}/posts/subscribed-groups` 
                : `${API_URL}/posts`;
            
            const url = `${baseUrl}?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`;
            
            // Получаем токен
            const token = tokenService.getToken();
            const headers: HeadersInit = {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            
            // Добавляем токен в заголовки, если он есть
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            console.log(`Отправка запроса на получение постов ${url}...`);
            const response = await fetch(url, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Не удалось загрузить посты: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Загруженные посты:', data);
            
            if (!Array.isArray(data)) {
                console.error('Получены данные неверного формата:', data);
                throw new Error('Данные постов имеют неверный формат');
            }
            
            console.log(`Загружено ${data.length} постов`);
            return data;
        } catch (err) {
            console.error('Ошибка при загрузке постов:', err);
            throw err;
        }
    }, [showOnlySubscribedGroups, PAGE_SIZE]);

    const hasMorePosts = useCallback((data: PostType[]) => {
        return data.length === PAGE_SIZE;
    }, [PAGE_SIZE]);

    const {
        data: posts,
        loading,
        error,
        lastElementRef,
        hasMore
    } = useInfiniteScroll<PostType>({
        loadMore: loadMorePosts,
        hasMore: hasMorePosts,
        pageSize: PAGE_SIZE
    });

    return (
        <div className={styles.container}>
            {posts.length === 0 && !loading && !error ? (
                <div className={styles.empty}>
                    <p>Пока нет постов 😔</p>
                </div>
            ) : (
                <div className={styles.feed}>
                    {posts.map((post, index) => {
                        // Если это последний элемент и есть еще данные для загрузки,
                        // добавляем ref для отслеживания
                        if (index === posts.length - 1 && hasMore) {
                            return (
                                <div key={post.id} ref={lastElementRef}>
                                    <Post post={post} />
                                </div>
                            );
                        }
                        return <Post key={post.id} post={post} />;
                    })}
                    
                    {loading && (
                        <div className={styles.loading}>
                            <div className={styles.loadingSpinner}></div>
                            <p>Загрузка постов...</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className={styles.error}>
                            <p>😕 {error}</p>
                            <button 
                                className={styles.retryButton}
                                onClick={() => window.location.reload()}
                            >
                                Попробовать снова
                            </button>
                        </div>
                    )}
                    
                    {!loading && !error && posts.length > 0 && !hasMore && (
                        <div className={styles.endOfFeed}>
                            <div className={styles.endOfFeedLine}></div>
                            <div className={styles.endOfFeedText}>Конец ленты</div>
                            <div className={styles.endOfFeedLine}></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};