import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { ServerImage } from '../../components/ServerImage/ServerImage';
import GroupSidebarModule from '../../components/GroupSidebarModule/GroupSidebarModule';
import { useSidebarModules } from '../../contexts/SidebarModulesContext';
import { SidebarModuleType } from '../../types/SidebarModule';
import { useInfiniteScroll } from '../../utils/useInfiniteScroll';
import { GroupShowcase } from '../../components/Showcase/GroupShowcase';

export const GroupPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [group, setGroup] = useState<GroupType | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [admins, setAdmins] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isMember, setIsMember] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [memberKey, setMemberKey] = useState(0);
    
    // Для принудительного обновления списка постов
    const [refreshPostsKey, setRefreshPostsKey] = useState(0);
    
    // Размер страницы для постов
    const PAGE_SIZE = 10;
    
    // Используем контекст сайдбар-модулей
    const sidebarModules = useSidebarModules();
    
    // Храним ID модуля сайдбара
    const sidebarModuleIdRef = useRef<string | null>(null);

    // Функция загрузки постов для бесконечного скролла
    const loadMorePosts = useCallback(async (page: number) => {
        if (!id) throw new Error('ID группы не указан');
        
        try {
            const groupId = parseInt(id, 10);
            const postsData = await groupService.getGroupPosts(groupId, PAGE_SIZE, page * PAGE_SIZE);
            return postsData;
        } catch (err) {
            console.error('[GroupPage] Ошибка при загрузке постов группы:', err);
            throw err;
        }
    }, [id, PAGE_SIZE]);

    // Проверка наличия дополнительных постов
    const hasMorePosts = useCallback((data: PostType[]) => {
        return data.length === PAGE_SIZE;
    }, [PAGE_SIZE]);

    // Используем хук для бесконечного скролла
    const {
        data: posts,
        loading: postsLoading,
        error: postsError,
        lastElementRef,
        hasMore: hasMorePostsToLoad,
        reset: resetPosts
    } = useInfiniteScroll<PostType>({
        loadMore: loadMorePosts,
        hasMore: hasMorePosts,
        pageSize: PAGE_SIZE
    });

    // Эффект для сброса и перезагрузки постов при изменении refreshPostsKey
    useEffect(() => {
        if (refreshPostsKey > 0) {
            resetPosts();
        }
    }, [refreshPostsKey, resetPosts]);

    // Функции для действий с группой
    const joinGroup = async () => {
        if (!id || !group || !user) return;
        
        try {
            await groupService.joinGroup(parseInt(id, 10));
            setIsMember(true);
            setMembers(prev => [...prev, {
                ...user,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            } as User]);
            
            // Обновляем счетчик для триггера обновления списка участников
            setMemberKey(prev => prev + 1);
        } catch (err) {
            console.error('Ошибка при вступлении в группу:', err);
        }
    };

    const leaveGroup = async () => {
        if (!id || !user || !group) return;
        
        try {
            await groupService.leaveGroup(parseInt(id, 10));
            setIsMember(false);
            setIsAdmin(false);
            setMembers(prev => prev.filter(member => member.id !== user.id));
            setAdmins(prev => prev.filter(admin => admin.id !== user.id));
            
            // Обновляем счетчик для триггера обновления списка участников
            setMemberKey(prev => prev + 1);
        } catch (err) {
            console.error('Ошибка при выходе из группы:', err);
        }
    };

    // Функция обновления содержимого модуля сайдбара
    const updateSidebarModule = useCallback(() => {
        if (!group || !sidebarModuleIdRef.current) return;
        
        sidebarModules.updateModule(sidebarModuleIdRef.current, {
            component: (
                <GroupSidebarModule
                    group={group}
                    members={members}
                    admins={admins}
                    isCurrentUserMember={isMember}
                    onJoinGroup={joinGroup}
                    onLeaveGroup={leaveGroup}
                />
            )
        });
    }, [group, members, admins, isMember]);

    // Обновляем сайдбар при изменении данных группы или списка участников
    useEffect(() => {
        if (group) {
            updateSidebarModule();
        }
    }, [updateSidebarModule, memberKey]);

    // Основной эффект загрузки данных и инициализации модуля
    useEffect(() => {
        let isMounted = true;
        
        const fetchGroupData = async () => {
            try {
                if (!id) return;
                
                setLoading(true);
                const groupId = parseInt(id, 10);
                const [groupData, membersData, adminsData] = await Promise.all([
                    groupService.getGroupById(groupId),
                    groupService.getGroupMembers(groupId),
                    groupService.getGroupAdmins(groupId)
                ]);

                if (!isMounted) return;

                setGroup(groupData);
                setMembers(membersData);
                setAdmins(adminsData);

                // Проверяем, является ли текущий пользователь участником или админом
                if (user) {
                    const userIsMember = membersData.some((member: User) => member.id === user.id);
                    const userIsAdmin = adminsData.some((admin: User) => admin.id === user.id);
                    setIsMember(userIsMember);
                    setIsAdmin(userIsAdmin);
                }

                // Создаем модуль информации о группе в правом сайдбаре (если еще не создан)
                if (!sidebarModuleIdRef.current) {
                    // Сначала удаляем существующие модули того же типа, если есть
                    if (sidebarModules.hasGroupInfoModule()) {
                        sidebarModules.removeGroupInfoModule();
                    }
                    
                    // Создаем новый модуль и сохраняем его ID
                    const moduleId = `group-info-${groupId}`;
                    sidebarModuleIdRef.current = moduleId;
                    
                    // Добавляем модуль группы со специальной пометкой, что он привязан к странице
                    sidebarModules.addModule({
                        id: moduleId,
                        type: SidebarModuleType.GROUP_INFO,
                        title: `Информация о группе ${groupData.name}`,
                        component: (
                            <GroupSidebarModule
                                group={groupData}
                                members={membersData}
                                admins={adminsData}
                                isCurrentUserMember={user ? membersData.some(member => member.id === user.id) : false}
                                onJoinGroup={joinGroup}
                                onLeaveGroup={leaveGroup}
                            />
                        ),
                        isVisible: true,
                        order: 0,
                        isPageSpecific: true,
                        pageId: `group-${groupId}`,
                        groupId: groupId
                    });
                }
            } catch (err) {
                console.error('Ошибка при загрузке данных группы:', err);
                if (isMounted) {
                    setError('Не удалось загрузить информацию о группе');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchGroupData();

        // Очистка - удаляем модуль информации о группе при размонтировании компонента
        return () => {
            isMounted = false;
            if (sidebarModuleIdRef.current) {
                sidebarModules.removeModule(sidebarModuleIdRef.current);
                sidebarModuleIdRef.current = null;
            }
        };
    }, [id, user]);
    
    const handlePostCreated = useCallback(() => {
        // После создания поста инициируем перезагрузку
        console.log('[GroupPage] Обновление постов после создания нового');
        setRefreshPostsKey(prev => prev + 1);
    }, []);

    const handlePostDeleted = useCallback(() => {
        // Обновляем список постов
        console.log('[GroupPage] Обновление постов после удаления');
        setRefreshPostsKey(prev => prev + 1);
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
                            <ServerImage 
                                path={group.avatar.path}
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
                        {group.description && (
                            <div className={styles.groupDescription}>{group.description}</div>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.groupContent}>
                {/* Витрина медиа-контента группы */}
                <div className={styles.showcaseContainer}>
                    <GroupShowcase groupId={parseInt(id!, 10)} />
                </div>
                {/* Форма создания поста */}
                {(isAdmin || isCreator) && (
                    <div className={styles.createPostForm}>
                        <CreatePostForm 
                            onSuccess={handlePostCreated}
                            groupId={parseInt(id!, 10)}
                        />
                    </div>
                )}
                
                
                
                {/* Лента постов */}
                <div className={styles.postsFeed}>
                    {posts.length === 0 && !postsLoading ? (
                        <div className={styles.emptyPosts}>
                            <p>В этой группе пока нет постов 😔</p>
                        </div>
                    ) : (
                        <div className={styles.posts}>
                            {posts.map((post, index) => {
                                // Если это последний элемент и есть еще данные для загрузки,
                                // добавляем ref для отслеживания
                                if (index === posts.length - 1 && hasMorePostsToLoad) {
                                    return (
                                        <div key={post.id} ref={lastElementRef}>
                                            <Post 
                                                post={post} 
                                                onDelete={() => handlePostDeleted()} 
                                            />
                                        </div>
                                    );
                                }
                                return (
                                    <Post 
                                        key={post.id} 
                                        post={post} 
                                        onDelete={() => handlePostDeleted()} 
                                    />
                                );
                            })}
                            
                            {postsLoading && (
                                <div className={styles.loading}>
                                    <div className={styles.loadingSpinner}></div>
                                    <p>Загрузка постов...</p>
                                </div>
                            )}
                            
                            {postsError && (
                                <div className={styles.error}>
                                    <p>😕 Ошибка при загрузке постов</p>
                                    <button 
                                        className={styles.retryButton}
                                        onClick={() => setRefreshPostsKey(prev => prev + 1)}
                                    >
                                        Попробовать снова
                                    </button>
                                </div>
                            )}
                            
                            {!postsLoading && !postsError && posts.length > 0 && !hasMorePostsToLoad && (
                                <div className={styles.endOfFeed}>
                                    <div className={styles.endOfFeedLine}></div>
                                    <div className={styles.endOfFeedText}>Конец ленты</div>
                                    <div className={styles.endOfFeedLine}></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}; 