import React from 'react';
import { Post as PostType } from '../../types/post.types';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import styles from './Post.module.css';

interface PostProps {
    post: PostType;
}

export const Post: React.FC<PostProps> = ({ post }) => {
    return (
        <div className={styles.post}>
            <div className={styles.header}>
                <div className={styles.author}>
                    {post.author.firstName} {post.author.lastName}
                </div>
                <div className={styles.date}>
                    {new Date(post.createdAt).toLocaleString()}
                </div>
            </div>
            
            {post.content && (
                <div className={styles.content}>
                    {post.content}
                </div>
            )}

            {post.photos && post.photos.length > 0 && (
                <PhotoGrid photos={post.photos} />
            )}

            <div className={styles.footer}>
                <button className={styles.actionButton}>
                    ❤️ {post.likesCount || 0}
                </button>
                <button className={styles.actionButton}>
                    💬 {post.commentsCount || 0}
                </button>
                <button className={styles.actionButton}>
                    🔄 {post.sharesCount || 0}
                </button>
            </div>
        </div>
    );
};