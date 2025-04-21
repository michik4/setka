import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupService } from '../../services/groupService';
import { Group as GroupType } from '../../types/group.types';
import { User } from '../../types/user.types';
import { Post as PostType } from '../../types/post.types';
import { useAuth } from '../../contexts/AuthContext';
import styles from './GroupPage.module.css';
import { api } from '../../utils/api';
import { CreatePostForm } from '../../components/CreatePostForm/CreatePostForm';
import { Post } from '../../components/Post/Post';

export const GroupPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [group, setGroup] = useState<GroupType | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [admins, setAdmins] = useState<User[]>([]);
    const [posts, setPosts] = useState<PostType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isMember, setIsMember] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [memberKey, setMemberKey] = useState(0);
    const [postsKey, setPostsKey] = useState(0);

    useEffect(() => {
        const fetchGroupData = async () => {
            try {
                if (!id) return;
                
                setLoading(true);
                const groupId = parseInt(id, 10);
                const [groupData, membersData, adminsData, postsData] = await Promise.all([
                    groupService.getGroupById(groupId),
                    groupService.getGroupMembers(groupId),
                    groupService.getGroupAdmins(groupId),
                    groupService.getGroupPosts(groupId)
                ]);

                setGroup(groupData);
                setMembers(membersData);
                setAdmins(adminsData);
                setPosts(postsData);

                // Проверяем, является ли текущий пользователь участником или админом
                if (user) {
                    const userIsMember = membersData.some((member: User) => member.id === user.id);
                    const userIsAdmin = adminsData.some((admin: User) => admin.id === user.id);
                    setIsMember(userIsMember);
                    setIsAdmin(userIsAdmin);
                }
            } catch (err) {
                console.error('Ошибка при загрузке данных группы:', err);
                setError('Не удалось загрузить информацию о группе');
            } finally {
                setLoading(false);
            }
        };

        fetchGroupData();
    }, [id, user]);

    const handleJoinGroup = async () => {
        if (!id) return;
        
        try {
            await groupService.joinGroup(parseInt(id, 10));
            setIsMember(true);
            setMembers(prev => user ? [...prev, {
                ...user,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            } as User] : prev);
        } catch (err) {
            console.error('Ошибка при вступлении в группу:', err);
        }
    };

    const handleLeaveGroup = async () => {
        if (!id || !user) return;
        
        try {
            await groupService.leaveGroup(parseInt(id, 10));
            setIsMember(false);
            setIsAdmin(false);
            setMembers(prev => prev.filter(member => member.id !== user.id));
            setAdmins(prev => prev.filter(admin => admin.id !== user.id));
        } catch (err) {
            console.error('Ошибка при выходе из группы:', err);
        }
    };
    
    const handlePostCreated = useCallback(() => {
        // После создания поста загружаем посты заново
        if (!id) return;
        
        console.log('[GroupPage] Обновление постов после создания нового');
        const fetchGroupPosts = async () => {
            try {
                const groupId = parseInt(id, 10);
                const postsData = await groupService.getGroupPosts(groupId);
                console.log('[GroupPage] Полученные посты:', postsData);
                
                // Проверяем структуру постов
                if (postsData && postsData.length > 0) {
                    // Логируем первый пост для отладки
                    const firstPost = postsData[0];
                    console.log('[GroupPage] Структура первого поста:', {
                        id: firstPost.id,
                        content: firstPost.content,
                        hasPhotos: Boolean(firstPost.photos && firstPost.photos.length),
                        photosCount: firstPost.photos?.length || 0,
                        photoDetails: firstPost.photos?.map(p => ({
                            id: p.id,
                            path: p.path,
                            fullUrl: `/api/photos/file/${p.path}`
                        }))
                    });
                }
                
                setPosts(postsData);
            } catch (err) {
                console.error('[GroupPage] Ошибка при загрузке постов группы:', err);
            }
        };

        fetchGroupPosts();
    }, [id]);

    const handlePostDeleted = useCallback((postId: number) => {
        // Удаляем пост из локального состояния
        setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
    }, []);

    if (loading) {
        return <div className={styles.loading}>Загрузка...</div>;
    }

    if (error || !group) {
        return <div className={styles.error}>{error || 'Группа не найдена'}</div>;
    }

    const isCreator = user && group.creatorId === user.id;

    return (
        <div className={styles.groupPage}>
            <div className={styles.groupHeader}>
                {group.cover && (
                    <div className={styles.coverImage}>
                        <img src={`/api/photos/${group.coverId}`} alt="Обложка группы" />
                    </div>
                )}
                <div className={styles.groupInfo}>
                    <div className={styles.avatarContainer}>
                        {group.avatar ? (
                            <img 
                                src={`/api/photos/${group.avatar.id}`} 
                                alt={group.name} 
                                className={styles.avatar} 
                            />
                        ) : (
                            <div className={styles.defaultAvatar}>{group.name.charAt(0)}</div>
                        )}
                    </div>
                    
                    <div className={styles.groupDetails}>
                        <h1 className={styles.groupName}>{group.name}</h1>
                        {group.isPrivate && <span className={styles.privateBadge}>Закрытая группа</span>}
                        <div className={styles.groupStats}>
                            <div className={styles.statItem}>
                                <span className={styles.statCount}>{members.length}</span>
                                <span className={styles.statLabel}>участников</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statCount}>{posts.length}</span>
                                <span className={styles.statLabel}>записей</span>
                            </div>
                        </div>
                        <div className={styles.groupActions}>
                            {isCreator ? (
                                <button className={styles.editButton} onClick={() => navigate(`/groups/${id}/edit`)}>
                                    Управление сообществом
                                </button>
                            ) : isMember ? (
                                <button className={styles.leaveButton} onClick={handleLeaveGroup}>
                                    Выйти из сообщества
                                </button>
                            ) : (
                                <button className={styles.joinButton} onClick={handleJoinGroup}>
                                    Вступить в сообщество
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.groupContent}>
                <div className={styles.sidebarSection}>
                    <div className={styles.aboutSection}>
                        <h3 className={styles.sectionTitle}>Информация</h3>
                        {group.description ? (
                            <p className={styles.groupDescription}>{group.description}</p>
                        ) : (
                            <p className={styles.noDescription}>Описание отсутствует</p>
                        )}
                    </div>

                    <div className={styles.membersSection}>
                        <h3 className={styles.sectionTitle}>Участники</h3>
                        <div className={styles.membersList}>
                            {members.slice(0, 6).map(member => (
                                <div key={member.id} className={styles.memberItem}>
                                    {member.avatar ? (
                                        <img 
                                            src={`/api/photos/${member.avatar.id}`} 
                                            alt={`${member.firstName} ${member.lastName}`} 
                                            className={styles.memberAvatar} 
                                        />
                                    ) : (
                                        <div className={styles.defaultMemberAvatar}>
                                            {member.firstName[0]}
                                        </div>
                                    )}
                                    <span className={styles.memberName}>
                                        {member.firstName} {member.lastName}
                                        {isCreator && member.id === group.creatorId && (
                                            <span className={styles.creatorBadge}>создатель</span>
                                        )}
                                        {member.id !== group.creatorId && admins.some(admin => admin.id === member.id) && (
                                            <span className={styles.adminBadge}>админ</span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {members.length > 6 && (
                            <div className={styles.showAllLink}>
                                Показать всех участников ({members.length})
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.postsSection}>
                    <h3 className={styles.sectionTitle}>Записи сообщества</h3>
                    {isMember && (
                        <CreatePostForm 
                            onSuccess={handlePostCreated}
                            groupId={parseInt(id || '0')}
                        />
                    )}

                    {posts.length > 0 ? (
                        <div className={styles.postsList}>
                            {posts.map(post => {
                                // Отладочная информация о каждом посте
                                console.log(`[GroupPage] Пост ${post.id}:`, {
                                    hasPhotos: Boolean(post.photos && post.photos.length), 
                                    photos: post.photos?.map(p => ({id: p.id, path: p.path}))
                                });
                                
                                return (
                                    <Post 
                                        key={post.id} 
                                        post={post} 
                                        onDelete={() => handlePostDeleted(post.id)}
                                        onUpdate={(updatedPost: PostType) => {
                                            // Обновляем пост в локальном состоянии
                                            setPosts(prevPosts => 
                                                prevPosts.map(p => p.id === updatedPost.id ? updatedPost : p)
                                            );
                                        }}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.emptyPosts}>
                            <p>В этой группе пока нет записей</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 