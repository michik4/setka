import React, { useCallback } from 'react';
import { PostFeed } from '../components/PostFeed/PostFeed';
import { CreatePostForm } from '../components/CreatePostForm/CreatePostForm';
import styles from './FeedPage.module.css';

export const FeedPage: React.FC = () => {
    // Для обновления после создания поста
    const [refreshKey, setRefreshKey] = React.useState(0);

    const handlePostCreated = useCallback(() => {
        // Обновляем ключ для перезагрузки ленты
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <div className={styles.container}>
            <div className="create-post">
                <CreatePostForm onSuccess={handlePostCreated} />
            </div>
            <PostFeed 
                key={refreshKey} 
                showOnlySubscribedGroups={true} 
            />
        </div>
    );
}; 