import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Post as PostType } from '../../types/post.types';
import { Post } from '../Post/Post';
import styles from './PostFeed.module.css';

// Проверяем наличие переменной окружения и используем резервный URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

console.log('API URL для PostFeed:', API_URL);

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

            console.log('Получен ответ:', response.status, response.statusText);
            const responseText = await response.text();
            console.log('Текст ответа:', responseText);

            if (!response.ok) {
                throw new Error(`Не удалось загрузить посты: ${response.status} ${response.statusText}`);
            }

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Распарсенные данные:', data);
            } catch (parseError) {
                console.error('Ошибка парсинга JSON:', parseError);
                throw new Error('Получен некорректный JSON от сервера');
            }
            
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

    if (!posts || posts.length === 0) {
        return (
            <div className={styles.empty}>
                <p>😔 Постов пока нет</p>
                <button 
                    className={styles.retryButton}
                    onClick={() => fetchPosts()}
                >
                    Обновить
                </button>
            </div>
        );
    }

    return (
        <div className={styles.feed}>
            {posts.map(post => (
                <Post
                    key={post.id}
                    post={post}
                />
            ))}
        </div>
    );
};