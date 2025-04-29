import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groupService } from '../../services/groupService';
import { Group as GroupType, User } from '../../types/group.types';
import { useAuth } from '../../contexts/AuthContext';
import { ServerImage } from '../../components/ServerImage/ServerImage';
import styles from './GroupMembersPage.module.css';

export const GroupMembersPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<GroupType | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  
  // Определяем, является ли текущий пользователь админом или создателем
  const isCurrentUserAdmin = admins.some(admin => admin.id === user?.id);
  const isCurrentUserCreator = group?.creatorId === user?.id;
  const canManageGroup = isCurrentUserAdmin || isCurrentUserCreator;
  
  // Загружаем данные группы и участников
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const groupId = parseInt(id, 10);
        const [groupData, membersData, adminsData] = await Promise.all([
          groupService.getGroupById(groupId),
          groupService.getGroupMembers(groupId),
          groupService.getGroupAdmins(groupId)
        ]);
        
        setGroup(groupData);
        setMembers(membersData);
        setAdmins(adminsData);
      } catch (err) {
        console.error('Ошибка при загрузке данных о группе:', err);
        setError('Не удалось загрузить информацию о группе и её участниках');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, user]);
  
  // Функция для удаления участника
  const handleRemoveMember = async (memberId: number) => {
    if (!id || !window.confirm('Вы уверены, что хотите удалить этого участника?')) return;
    
    try {
      await groupService.removeMember(parseInt(id, 10), memberId);
      // Обновляем список участников
      setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
    } catch (err) {
      console.error('Ошибка при удалении участника:', err);
      alert('Не удалось удалить участника');
    }
  };
  
  // Функция для назначения администратором
  const handleMakeAdmin = async (memberId: number) => {
    if (!id || !window.confirm('Назначить этого участника администратором?')) return;
    
    try {
      await groupService.addAdmin(parseInt(id, 10), memberId);
      // Обновляем списки
      const userToPromote = members.find(member => member.id === memberId);
      if (userToPromote && !admins.some(admin => admin.id === memberId)) {
        setAdmins(prevAdmins => [...prevAdmins, userToPromote]);
      }
    } catch (err) {
      console.error('Ошибка при назначении администратора:', err);
      alert('Не удалось назначить администратора');
    }
  };
  
  // Функция для снятия администратора
  const handleRemoveAdmin = async (adminId: number) => {
    if (!id || !window.confirm('Снять администраторские права с этого участника?')) return;
    
    try {
      await groupService.removeAdmin(parseInt(id, 10), adminId);
      // Обновляем список администраторов
      setAdmins(prevAdmins => prevAdmins.filter(admin => admin.id !== adminId));
    } catch (err) {
      console.error('Ошибка при снятии администратора:', err);
      alert('Не удалось снять администратора');
    }
  };
  
  if (loading) {
    return <div className={styles.loading}>Загрузка списка участников...</div>;
  }
  
  if (error || !group) {
    return <div className={styles.error}>{error || 'Группа не найдена'}</div>;
  }
  
  return (
    <div className={styles.membersPage}>
      <div className={styles.header}>
        <div className={styles.groupInfo}>
          <Link to={`/groups/${group.id}`} className={styles.backLink}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Вернуться к группе
          </Link>
          <h1>{group.name}: Участники ({members.length})</h1>
        </div>
        
        {canManageGroup && (
          <Link to={`/groups/${group.id}/edit?tab=members`} className={styles.manageButton}>
            Управление участниками
          </Link>
        )}
      </div>
      
      <div className={styles.tabs}>
        <span className={`${styles.tab} ${styles.active}`}>Все участники</span>
        <Link to={`/groups/${group.id}/admins`} className={styles.tab}>
          Администраторы ({admins.length})
        </Link>
      </div>
      
      <div className={styles.membersList}>
        {members.map(member => (
          <div key={member.id} className={styles.memberItem}>
            <div className={styles.memberMain}>
              <div className={styles.memberAvatar}>
                {member.avatar ? (
                  <ServerImage
                    path={member.avatar.path}
                    alt={`${member.firstName} ${member.lastName}`}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.defaultAvatar}>
                    {member.firstName.charAt(0)}
                  </div>
                )}
              </div>
              
              <div className={styles.memberInfo}>
                <Link to={`/users/${member.id}`} className={styles.memberName}>
                  {member.firstName} {member.lastName}
                </Link>
                <div className={styles.memberStatus}>
                  {member.id === group.creatorId ? (
                    <span className={styles.creatorBadge}>Создатель группы</span>
                  ) : admins.some(admin => admin.id === member.id) ? (
                    <span className={styles.adminBadge}>Администратор</span>
                  ) : (
                    <span className={styles.memberBadge}>Участник</span>
                  )}
                </div>
              </div>
            </div>
            
            {canManageGroup && member.id !== user?.id && member.id !== group.creatorId && (
              <div className={styles.memberActions}>
                {!admins.some(admin => admin.id === member.id) && isCurrentUserCreator && (
                  <button 
                    className={styles.actionButton} 
                    onClick={() => handleMakeAdmin(member.id)}
                    title="Назначить администратором"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Сделать админом
                  </button>
                )}
                
                {admins.some(admin => admin.id === member.id) && isCurrentUserCreator && (
                  <button 
                    className={styles.actionButton} 
                    onClick={() => handleRemoveAdmin(member.id)}
                    title="Снять администратора"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                    Снять админа
                  </button>
                )}
                
                <button 
                  className={`${styles.actionButton} ${styles.removeButton}`} 
                  onClick={() => handleRemoveMember(member.id)}
                  title="Удалить из группы"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                  Удалить
                </button>
              </div>
            )}
          </div>
        ))}
        
        {members.length === 0 && (
          <div className={styles.emptyState}>
            В этой группе пока нет участников
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMembersPage; 