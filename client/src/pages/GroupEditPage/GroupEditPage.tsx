import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupService } from '../../services/groupService';
import { Group, User } from '../../types/group.types';
import { useAuth } from '../../contexts/AuthContext';
import styles from './GroupEditPage.module.css';
import { api } from '../../utils/api';
import { ServerImage } from '../../components/ServerImage/ServerImage';

export const GroupEditPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [admins, setAdmins] = useState<User[]>([]);
    const [activeTab, setActiveTab] = useState('info');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isPrivate: false
    });
    const [actionLoading, setActionLoading] = useState(false);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!id) return;

        const fetchGroupData = async () => {
            try {
                setLoading(true);
                const [groupData, membersData, adminsData] = await Promise.all([
                    groupService.getGroupById(parseInt(id)),
                    groupService.getGroupMembers(parseInt(id)),
                    groupService.getGroupAdmins(parseInt(id))
                ]);

                setGroup(groupData);
                setMembers(membersData);
                setAdmins(adminsData);
                setFormData({
                    name: groupData.name,
                    description: groupData.description || '',
                    isPrivate: groupData.isPrivate
                });
            } catch (err) {
                console.error('Ошибка при загрузке данных группы:', err);
                setError('Не удалось загрузить данные группы');
            } finally {
                setLoading(false);
            }
        };

        fetchGroupData();
    }, [id]);

    // Проверка прав на управление группой
    const isCreator = user && group && group.creatorId === user.id;
    const isAdmin = user && admins.some(admin => admin.id === user.id);

    useEffect(() => {
        if (!loading && !isCreator && !isAdmin) {
            navigate(`/groups/${id}`);
        }
    }, [loading, isCreator, isAdmin, navigate, id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    };

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        try {
            setActionLoading(true);
            setActionError(null);
            
            await groupService.updateGroup(parseInt(id), {
                name: formData.name,
                description: formData.description,
                isPrivate: formData.isPrivate
            });
            
            setActionSuccess('Информация о группе обновлена');
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
            console.error('Ошибка при обновлении группы:', err);
            setActionError('Не удалось обновить информацию о группе');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!id) return;
        
        try {
            setActionLoading(true);
            setActionError(null);
            
            await groupService.removeMember(parseInt(id), userId);
            
            // Обновляем список участников
            setMembers(prev => prev.filter(member => member.id !== userId));
            // Если пользователь был админом, также удаляем из списка админов
            setAdmins(prev => prev.filter(admin => admin.id !== userId));
            
            setActionSuccess('Участник удален из группы');
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
            console.error('Ошибка при удалении участника:', err);
            setActionError('Не удалось удалить участника');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBanMember = async (userId: number) => {
        if (!id) return;
        
        try {
            setActionLoading(true);
            setActionError(null);
            
            await groupService.banMember(parseInt(id), userId);
            
            // Обновляем список участников
            setMembers(prev => prev.filter(member => member.id !== userId));
            // Если пользователь был админом, также удаляем из списка админов
            setAdmins(prev => prev.filter(admin => admin.id !== userId));
            
            setActionSuccess('Участник забанен');
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
            console.error('Ошибка при бане участника:', err);
            setActionError('Не удалось забанить участника');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddAdmin = async (userId: number) => {
        if (!id) return;
        
        try {
            setActionLoading(true);
            setActionError(null);
            
            await groupService.addAdmin(parseInt(id), userId);
            
            // Получаем обновленный список админов
            const updatedAdmins = await groupService.getGroupAdmins(parseInt(id));
            setAdmins(updatedAdmins);
            
            setActionSuccess('Пользователь назначен администратором');
            setTimeout(() => setActionSuccess(null), 3000);
        } catch (err) {
            console.error('Ошибка при назначении администратора:', err);
            setActionError('Не удалось назначить администратора');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveAdmin = async (userId: number) => {
        if (!id) return;
        
        try {
            setActionLoading(true);
            setActionError(null);
            
            await groupService.removeAdmin(parseInt(id), userId);
            
            // Обновляем список админов
            setAdmins(prev => prev.filter(admin => admin.id !== userId));
            
            setActionSuccess('Права администратора удалены');
            setTimeout(() => setActionSuccess(null), 3000);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!id || !window.confirm('Вы уверены, что хотите удалить группу? Это действие нельзя отменить.')) return;
        
        try {
            setActionLoading(true);
            
            await groupService.deleteGroup(parseInt(id));
            
            navigate('/groups');
        } catch (err) {
            console.error('Ошибка при удалении группы:', err);
            setActionError('Не удалось удалить группу');
            setActionLoading(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!id || !user) return;
        
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setActionLoading(true);
            setActionError(null);
            
            const formData = new FormData();
            formData.append('avatar', file);
            
            const response = await api.post(`/groups/${id}/avatar`, formData);
            
            // Обновляем состояние группы с новым аватаром
            if (response && response.avatar) {
                setGroup(response); // Используем обновленную группу из ответа сервера
                setActionSuccess('Аватар группы успешно обновлен');
                setTimeout(() => setActionSuccess(null), 3000);
            } else {
                throw new Error('Ошибка при обновлении аватара группы');
            }
            
            // Очищаем input после успешной загрузки
            if (avatarInputRef.current) {
                avatarInputRef.current.value = '';
            }
        } catch (err: any) {
            console.error('Ошибка при загрузке аватара группы:', err);
            setActionError(err.message || 'Не удалось загрузить аватар');
            
            // Очищаем input в случае ошибки
            if (avatarInputRef.current) {
                avatarInputRef.current.value = '';
            }
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return <div className={styles.loading}>Загрузка...</div>;
    }

    if (error || !group) {
        return <div className={styles.error}>{error || 'Группа не найдена'}</div>;
    }

    return (
        <div className={styles.editPage}>
            <div className={styles.header}>
                <h1>Управление сообществом</h1>
                <button 
                    className={styles.backButton}
                    onClick={() => navigate(`/groups/${id}`)}
                >
                    Вернуться к группе
                </button>
            </div>

            <div className={styles.tabs}>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'info' ? styles.active : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    Информация
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'members' ? styles.active : ''}`}
                    onClick={() => setActiveTab('members')}
                >
                    Участники ({members.length})
                </button>
                <button 
                    className={`${styles.tabButton} ${activeTab === 'admins' ? styles.active : ''}`}
                    onClick={() => setActiveTab('admins')}
                >
                    Администраторы ({admins.length})
                </button>
                {isCreator && (
                    <button 
                        className={`${styles.tabButton} ${activeTab === 'dangerous' ? styles.active : ''} ${styles.dangerTab}`}
                        onClick={() => setActiveTab('dangerous')}
                    >
                        Опасная зона
                    </button>
                )}
            </div>

            {actionSuccess && <div className={styles.successMessage}>{actionSuccess}</div>}
            {actionError && <div className={styles.errorMessage}>{actionError}</div>}

            <div className={styles.tabContent}>
                {activeTab === 'info' && (
                    <form onSubmit={handleSaveInfo} className={styles.infoForm}>
                        <div className={styles.avatarSection}>
                            <div className={styles.currentAvatar}>
                                {group.avatar ? (
                                    <ServerImage
                                        path={group.avatar.path}
                                        alt={group.name}
                                        className={styles.avatarPreview}
                                    />
                                ) : (
                                    <div className={styles.defaultAvatar}>
                                        {group.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className={styles.avatarUpload}>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    id="avatar-input"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="avatar-input" className={styles.uploadButton}>
                                    {group.avatar ? 'Изменить аватар' : 'Загрузить аватар'}
                                </label>
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="name">Название сообщества</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="description">Описание</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={5}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="isPrivate"
                                    checked={formData.isPrivate}
                                    onChange={handleCheckboxChange}
                                />
                                Закрытое сообщество
                            </label>
                        </div>
                        <button 
                            type="submit" 
                            className={styles.saveButton}
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Сохранение...' : 'Сохранить изменения'}
                        </button>
                    </form>
                )}

                {activeTab === 'members' && (
                    <div className={styles.membersList}>
                        <h3>Управление участниками</h3>
                        {members.length === 0 ? (
                            <p>В сообществе нет участников</p>
                        ) : (
                            <div className={styles.usersGrid}>
                                {members.map(member => (
                                    <div key={member.id} className={styles.userCard}>
                                        <div className={styles.userAvatar}>
                                            {member.avatar ? (
                                                <ServerImage 
                                                    path={member.avatar.path}
                                                    alt={member.nickname || `${member.firstName} ${member.lastName}`}
                                                    className={styles.memberAvatar}
                                                />
                                            ) : (
                                                <div className={styles.defaultAvatar}>
                                                    {member.firstName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.userInfo}>
                                            <span className={styles.userName}>{member.nickname || `${member.firstName} ${member.lastName}`}</span>
                                            {member.id === group.creatorId && (
                                                <span className={styles.creatorBadge}>Создатель</span>
                                            )}
                                            {admins.some(admin => admin.id === member.id) && (
                                                <span className={styles.adminBadge}>Администратор</span>
                                            )}
                                        </div>
                                        <div className={styles.userActions}>
                                            {isCreator && member.id !== group.creatorId && (
                                                <>
                                                    {!admins.some(admin => admin.id === member.id) ? (
                                                        <button 
                                                            onClick={() => handleAddAdmin(member.id)}
                                                            className={styles.actionButton}
                                                            disabled={actionLoading}
                                                        >
                                                            Назначить админом
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleRemoveAdmin(member.id)}
                                                            className={styles.actionButton}
                                                            disabled={actionLoading}
                                                        >
                                                            Разжаловать
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        className={`${styles.actionButton} ${styles.removeButton}`}
                                                        disabled={actionLoading}
                                                    >
                                                        Исключить
                                                    </button>
                                                    <button 
                                                        onClick={() => handleBanMember(member.id)}
                                                        className={`${styles.actionButton} ${styles.banButton}`}
                                                        disabled={actionLoading}
                                                    >
                                                        Забанить
                                                    </button>
                                                </>
                                            )}
                                            {isAdmin && !isCreator && member.id !== user?.id && member.id !== group.creatorId && (
                                                <button 
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className={`${styles.actionButton} ${styles.removeButton}`}
                                                    disabled={actionLoading}
                                                >
                                                    Исключить
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'admins' && (
                    <div className={styles.adminsList}>
                        <h3>Управление администраторами</h3>
                        {admins.length === 0 ? (
                            <p>В сообществе нет администраторов</p>
                        ) : (
                            <div className={styles.usersGrid}>
                                {admins.map(admin => (
                                    <div key={admin.id} className={styles.userCard}>
                                        <div className={styles.userAvatar}>
                                            {admin.avatar ? (
                                                <ServerImage 
                                                    path={admin.avatar.path}
                                                    alt={admin.nickname || `${admin.firstName} ${admin.lastName}`}
                                                    className={styles.memberAvatar}
                                                />
                                            ) : (
                                                <div className={styles.defaultAvatar}>
                                                    {admin.firstName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.userInfo}>
                                            <span className={styles.userName}>{admin.nickname || `${admin.firstName} ${admin.lastName}`}</span>
                                            {admin.id === group.creatorId && (
                                                <span className={styles.creatorBadge}>Создатель</span>
                                            )}
                                        </div>
                                        <div className={styles.userActions}>
                                            {isCreator && admin.id !== group.creatorId && (
                                                <button 
                                                    onClick={() => handleRemoveAdmin(admin.id)}
                                                    className={`${styles.actionButton} ${styles.removeButton}`}
                                                    disabled={actionLoading}
                                                >
                                                    Снять с должности
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'dangerous' && isCreator && (
                    <div className={styles.dangerZone}>
                        <h3>Опасная зона</h3>
                        <p className={styles.warningText}>
                            Действия в этом разделе нельзя будет отменить. Будьте внимательны.
                        </p>
                        
                        <div className={styles.dangerAction}>
                            <h4>Удаление сообщества</h4>
                            <p>
                                При удалении сообщества будут удалены все его данные, включая посты, 
                                участников и другую информацию. Это действие необратимо.
                            </p>
                            <button 
                                onClick={handleDeleteGroup}
                                className={styles.deleteButton}
                                disabled={actionLoading}
                            >
                                {actionLoading ? 'Удаление...' : 'Удалить сообщество'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupEditPage; 