import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Group, User } from '../../types/group.types';
import { ServerImage } from '../ServerImage/ServerImage';
import styles from './GroupSidebarModule.module.css';
import { useAuth } from '../../contexts/AuthContext';

interface GroupSidebarModuleProps {
  group: Group;
  members: User[];
  admins: User[];
  isCurrentUserMember: boolean;
  onJoinGroup?: () => void;
  onLeaveGroup?: () => void;
}

export const GroupSidebarModule: React.FC<GroupSidebarModuleProps> = ({
  group,
  members,
  admins,
  isCurrentUserMember,
  onJoinGroup,
  onLeaveGroup
}) => {
  const [showAllMembers, setShowAllMembers] = useState(false);
  const { user } = useAuth();
  const userId = user ? user.id : 0;
  const isCurrentUserAdmin = admins.some(admin => admin.id === userId);
  const isCurrentUserCreator = group.creatorId === userId;
  const canManageGroup = isCurrentUserAdmin || isCurrentUserCreator;
  
  console.log('User ID:', userId);
  console.log('Is admin:', isCurrentUserAdmin, 'admins:', admins.map(a => a.id));
  console.log('Is creator:', isCurrentUserCreator, 'creatorId:', group.creatorId);
  console.log('Can manage:', canManageGroup);
  
  // Функция для переключения показа всех участников
  const toggleShowAllMembers = () => {
    setShowAllMembers(!showAllMembers);
  };
  
  // Количество участников для отображения в свернутом виде
  const displayMembersCount = showAllMembers ? members.length : 6;
  
  return (
    <div className={styles.groupSidebarModule}>
      <div className={styles.header}>
        <h3 className={styles.title}>Информация о сообществе</h3>
      </div>
      
      <div className={styles.groupInfo}>
        <div className={styles.avatarWrapper}>
          {group.avatar ? (
            <ServerImage
              path={group.avatar.path}
              alt={group.name}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.defaultAvatar}>{group.name.charAt(0)}</div>
          )}
          
          {canManageGroup && (
            <button 
              className={styles.editAvatarBtn}
              title="Изменить аватар сообщества"
              onClick={() => window.location.href = `/groups/${group.id}/edit?tab=avatar`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
          )}
        </div>
        
        <div className={styles.groupDetails}>
          <div className={styles.groupNameContainer}>
            <h4 className={styles.groupName}>{group.name}</h4>
            {canManageGroup && (
              <button 
                className={styles.editNameBtn}
                title="Редактировать информацию"
                onClick={() => window.location.href = `/groups/${group.id}/edit?tab=info`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
            )}
          </div>
          
          {group.isPrivate && <span className={styles.privateBadge}>Закрытая группа</span>}
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{members.length}</span>
              <span className={styles.statLabel}>участников</span>
            </div>
            {group.postsCount !== undefined && (
              <div className={styles.statItem}>
                <span className={styles.statValue}>{group.postsCount}</span>
                <span className={styles.statLabel}>публикаций</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {group.description && (
        <div className={styles.description}>
          <p>{group.description}</p>
          {canManageGroup && (
            <button 
              className={styles.editDescriptionBtn}
              title="Редактировать описание"
              onClick={() => window.location.href = `/groups/${group.id}/edit?tab=info`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
          )}
        </div>
      )}
      
      <div className={styles.actions}>
        {isCurrentUserMember ? (
          <button className={styles.leaveButton} onClick={onLeaveGroup}>
            Выйти из сообщества
          </button>
        ) : (
          <button className={styles.joinButton} onClick={onJoinGroup}>
            Вступить в сообщество
          </button>
        )}
        {canManageGroup && (
          <>
            <Link to={`/groups/${group.id}/edit`} className={`${styles.editLink} ${styles.editButton}`}>
              Редактировать сообщество
            </Link>
          </>
        )}
      </div>
      
      <div className={styles.createdInfo}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Создано:</span>
          <span className={styles.infoValue}>
            {new Date(group.createdAt).toLocaleDateString('ru-RU')}
          </span>
        </div>
        {group.creatorId && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Создатель:</span>
            <span className={styles.infoValue}>
              {members.find(member => member.id === group.creatorId) ? (
                <Link 
                  to={`/users/${group.creatorId}`} 
                  className={styles.creatorLink}
                >
                  {members.find(member => member.id === group.creatorId)?.firstName || ''} {members.find(member => member.id === group.creatorId)?.lastName || ''}
                </Link>
              ) : (
                <span>Неизвестный пользователь</span>
              )}
            </span>
          </div>
        )}
      </div>
      
      <div className={styles.membersSection}>
        <h4 className={styles.sectionTitle}>
          Участники ({members.length})
          
          <Link to={`/groups/${group.id}/members`} className={styles.viewAllLink}>
            Все
          </Link>
        </h4>
        <div className={styles.membersList}>
          {members.slice(0, displayMembersCount).map(member => (
            <div key={member.id} className={styles.memberItem}>
              <div className={styles.memberAvatarWrapper}>
                {member.avatar ? (
                  <ServerImage
                    path={member.avatar.path}
                    alt={`${member.firstName} ${member.lastName}`}
                    className={styles.memberAvatar}
                  />
                ) : (
                  <div className={styles.defaultMemberAvatar}>
                    {member.firstName.charAt(0)}
                  </div>
                )}
              </div>
              <div className={styles.memberInfo}>
                <Link to={`/users/${member.id}`} className={styles.memberName}>
                  {member.firstName} {member.lastName}
                </Link>
                {member.id === group.creatorId && (
                  <span className={styles.memberBadge}>создатель</span>
                )}
                {member.id !== group.creatorId && admins.some(admin => admin.id === member.id) && (
                  <span className={styles.adminBadge}>админ</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {members.length > 6 && (
          <button 
            className={styles.showAllButton} 
            onClick={toggleShowAllMembers}
          >
            {showAllMembers ? 'Показать меньше' : `Показать всех участников (${members.length})`}
          </button>
        )}
      </div>
      
      {admins.length > 0 && (
        <div className={styles.membersSection}>
          <h4 className={styles.sectionTitle}>
            Администраторы ({admins.length})
            
          </h4>
          <div className={styles.membersList}>
            {admins.slice(0, 3).map(admin => (
              <div key={admin.id} className={styles.memberItem}>
                <div className={styles.memberAvatarWrapper}>
                  {admin.avatar ? (
                    <ServerImage
                      path={admin.avatar.path}
                      alt={`${admin.firstName} ${admin.lastName}`}
                      className={styles.memberAvatar}
                    />
                  ) : (
                    <div className={styles.defaultMemberAvatar}>
                      {admin.firstName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className={styles.memberInfo}>
                  <Link to={`/users/${admin.id}`} className={styles.memberName}>
                    {admin.firstName} {admin.lastName}
                  </Link>
                  {admin.id === group.creatorId && (
                    <span className={styles.memberBadge}>создатель</span>
                  )}
                  {admin.id !== group.creatorId && (
                    <span className={styles.adminBadge}>админ</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {admins.length > 3 && (
            <Link to={`/groups/${group.id}/admins`} className={styles.showAllLink}>
              Показать всех администраторов
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupSidebarModule; 