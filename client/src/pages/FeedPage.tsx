import React, { useCallback } from 'react';
import { PostFeed } from '../components/PostFeed/PostFeed';
import { CreatePostForm } from '../components/CreatePostForm/CreatePostForm';
import { useAuth } from '../contexts/AuthContext';
import styles from './FeedPage.module.css';

export const FeedPage: React.FC = () => {
    const { user } = useAuth();
    // Для обновления после создания поста
    const [refreshKey, setRefreshKey] = React.useState(0);

    const handlePostCreated = useCallback(() => {
        // Обновляем ключ для перезагрузки ленты
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <div className={styles.container}>
            <div className="create-post">
                <CreatePostForm 
                    onSuccess={handlePostCreated}
                    wallOwnerId={user?.id}
                />
            </div>
            <PostFeed 
                key={refreshKey} 
                showOnlySubscribedGroups={true} 
            />
        </div>
    );
}; 