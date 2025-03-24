import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Post as PostType } from '../../types/post.types';
import { Post } from '../Post/Post';
import styles from './PostFeed.module.css';
import { API_URL } from '../../config';

export const PostFeed: React.FC = () => {
    const [posts, setPosts] = useState<PostType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isLoadingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchPosts = useCallback(async () => {
        // Если уже идет загрузка, не делаем новый запрос
        if (isLoadingRef.current) {
            console.log('Загрузка постов уже выполняется...');
            return;
        }

        try {
            isLoadingRef.current = true;
            setLoading(true);
            setError(null);
            
            console.log(`Отправка запроса на получение постов ${API_URL}/posts...`);
            const response = await fetch(`${API_URL}/posts`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
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
            setPosts(data);
        } catch (err) {
            console.error('Ошибка при загрузке постов:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка');
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        console.log('PostFeed: Компонент смонтирован, начинаем загрузку постов');
        fetchPosts();

        return () => {
            console.log('PostFeed: Компонент размонтирован');
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchPosts]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.loadingSpinner}></div>
                <p>Загрузка постов...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <p>😕 {error}</p>
                <button 
                    className={styles.retryButton}
                    onClick={() => fetchPosts()}
                >
                    Попробовать снова
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {posts.length === 0 ? (
                <div className={styles.empty}>
                    <p>Пока нет постов 😔</p>
                </div>
            ) : (
                <div className={styles.feed}>
                    {posts.map(post => (
                        <Post key={post.id} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
};