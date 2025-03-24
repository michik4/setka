import React, { useCallback } from 'react';
import { PostFeed } from '../components/PostFeed/PostFeed';
import { CreatePostForm } from '../components/CreatePostForm/CreatePostForm';
import styles from './FeedPage.module.css';

export const FeedPage: React.FC = () => {
    const [key, setKey] = React.useState(0);

    const handlePostCreated = useCallback(() => {
        // Обновляем ключ для перезагрузки ленты
        setKey(prev => prev + 1);
    }, []);

    return (
        <div className={styles.container}>
            <CreatePostForm onSuccess={handlePostCreated} />
            <PostFeed key={key} />
        </div>
    );
}; 