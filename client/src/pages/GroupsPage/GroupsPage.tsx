import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groupService } from '../../services/groupService';
import { Group } from '../../types/group.types';
import styles from './GroupsPage.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { ServerImage } from '../../components/ServerImage/ServerImage';

export const GroupsPage: React.FC = () => {
    const [allGroups, setAllGroups] = useState<Group[]>([]);
    const [userGroups, setUserGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Group[]>([]);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newGroupData, setNewGroupData] = useState({
        name: '',
        slug: '',
        description: '',
        isPrivate: false
    });
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [allGroupsData, userGroupsData] = await Promise.all([
                    groupService.getAllGroups(20, 0),
                    groupService.getUserGroups()
                ]);
                setAllGroups(allGroupsData.items);
                setUserGroups(userGroupsData);
            } catch (err) {
                console.error('Ошибка при загрузке групп:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const results = await groupService.searchGroups(searchQuery);
            setSearchResults(results.items);
        } catch (err) {
            console.error('Ошибка при поиске групп:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewGroupData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewGroupData(prev => ({ ...prev, isPrivate: e.target.checked }));
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newGroupData.name || !newGroupData.slug) {
            setError('Название и URL-адрес группы обязательны');
            return;
        }

        try {
            const createdGroup = await groupService.createGroup(newGroupData);
            setUserGroups(prev => [createdGroup, ...prev]);
            setAllGroups(prev => [createdGroup, ...prev]);
            setCreateModalOpen(false);
            setNewGroupData({
                name: '',
                slug: '',
                description: '',
                isPrivate: false
            });
            setError('');
        } catch (err) {
            console.error('Ошибка при создании группы:', err);
            setError('Ошибка при создании группы. Возможно, такой URL уже занят.');
        }
    };

    const handleJoinGroup = async (groupId: number) => {
        try {
            await groupService.joinGroup(groupId);
            const group = allGroups.find(g => g.id === groupId);
            if (group) {
                setUserGroups(prev => [group, ...prev]);
            }
        } catch (err) {
            console.error('Ошибка при вступлении в группу:', err);
        }
    };

    const handleLeaveGroup = async (groupId: number) => {
        try {
            await groupService.leaveGroup(groupId);
            setUserGroups(prev => prev.filter(g => g.id !== groupId));
        } catch (err) {
            console.error('Ошибка при выходе из группы:', err);
        }
    };

    const renderGroupItem = (group: Group, isMember: boolean) => {
        return (
            <div key={group.id} className={styles.groupItem}>
                <div className={styles.groupAvatar}>
                    {group.avatar ? (
                        <ServerImage 
                            path={group.avatar.path} 
                            alt={group.name}
                            className={styles.groupAvatarImage} 
                        />
                    ) : (
                        <div className={styles.defaultAvatar}>{group.name.charAt(0)}</div>
                    )}
                </div>
                <div className={styles.groupInfo}>
                    <Link to={`/groups/${group.id}`} className={styles.groupName}>{group.name}</Link>
                    <div className={styles.groupDescription}>{group.description}</div>
                    <div className={styles.groupStats}>
                        <span>{(group.membersCount || 0)} участников</span>
                        <span>{group.postsCount || 0} записей</span>
                    </div>
                </div>
                <div className={styles.groupActions}>
                    {isMember ? (
                        <button 
                            className={styles.leaveButton}
                            onClick={() => handleLeaveGroup(group.id)}
                            disabled={group.creatorId === user?.id}
                        >
                            {group.creatorId === user?.id ? 'Вы создатель' : 'Выйти'}
                        </button>
                    ) : (
                        <button 
                            className={styles.joinButton}
                            onClick={() => handleJoinGroup(group.id)}
                        >
                            Вступить
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const displayedGroups = searchQuery && searchResults.length > 0 
        ? searchResults 
        : allGroups;

    return (
        <div className={styles.groupsPage}>
            <div className={styles.header}>
                <h1>Сообщества</h1>
                <button className={styles.createButton} onClick={() => setCreateModalOpen(true)}>
                    Создать сообщество
                </button>
            </div>

            <div className={styles.searchContainer}>
                <input
                    type="text"
                    placeholder="Поиск сообществ"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                />
                <button className={styles.searchButton} onClick={handleSearch}>
                    Найти
                </button>
            </div>

            {userGroups.length > 0 && (
                <div className={styles.section}>
                    <h2>Мои сообщества</h2>
                    <div className={styles.groupsList}>
                        {userGroups.map(group => renderGroupItem(group, true))}
                    </div>
                </div>
            )}

            <div className={styles.section}>
                <h2>{searchQuery && searchResults.length > 0 ? 'Результаты поиска' : 'Популярные сообщества'}</h2>
                {loading ? (
                    <div className={styles.loading}>Загрузка...</div>
                ) : displayedGroups.length > 0 ? (
                    <div className={styles.groupsList}>
                        {displayedGroups.map(group => {
                            const isMember = userGroups.some(g => g.id === group.id);
                            return renderGroupItem(group, isMember);
                        })}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        {searchQuery ? 'По вашему запросу ничего не найдено' : 'Нет доступных сообществ'}
                    </div>
                )}
            </div>

            {createModalOpen && (
                <div className={styles.modalBackdrop}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Создание сообщества</h3>
                            <button className={styles.closeButton} onClick={() => setCreateModalOpen(false)}>
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleCreateGroup}>
                            {error && <div className={styles.error}>{error}</div>}
                            <div className={styles.formGroup}>
                                <label htmlFor="name">Название сообщества *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={newGroupData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="slug">URL-адрес сообщества * (только латинские буквы, цифры и дефисы)</label>
                                <input
                                    type="text"
                                    id="slug"
                                    name="slug"
                                    value={newGroupData.slug}
                                    onChange={handleInputChange}
                                    pattern="[a-z0-9\-]+"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="description">Описание</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={newGroupData.description}
                                    onChange={handleInputChange}
                                    rows={4}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        name="isPrivate"
                                        checked={newGroupData.isPrivate}
                                        onChange={handleCheckboxChange}
                                    />
                                    Закрытое сообщество
                                </label>
                            </div>
                            <div className={styles.formActions}>
                                <button type="button" onClick={() => setCreateModalOpen(false)}>Отмена</button>
                                <button type="submit">Создать</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}; 