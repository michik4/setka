import React from 'react';
import styles from './AboutPage.module.css';

export const AboutPage: React.FC = () => {
    return (
        <div className={styles.aboutPage}>
            <div className={styles.aboutPageContainer}>
                <h1>О Всети</h1>
                <p className={styles.secondary}>v0.5.0</p>
                <p>
                    Всем привет, меня зовут Мишаня.
                    Я создатель социальной сети <a href='/'>"Всети"</a>, программист и автор паблика <a href='https://vk.com/skksjsn'>чшыщмхиэк</a> вконтакте.
                </p>
                <p>
                    Я создал "Всети" для того чтобы пользователи смогли свободно <span className={styles.secondary}>(в пределах законов РФ естественно)</span>, удобно публиковать свое творчество и создавать платформу для себя и людей.
                </p>
                <p>
                    Если у вас есть предложение по улучшению сервиса, то можете написать мне в <a href="https://t.me/mishk10">Телеграмм</a>,
                    <a href="https://vk.com/mishka777228"> ВКонтакте</a>,
                    или написать на <a href="mailto:mihalixz1221@gmail.com">Почту</a>.
                </p>
                <p>
                    Контакты для сотрудничества и предложений помощи в развитии проекта: <br />
                    <span className={styles.secondary}>(пишите пожалуйста сразу что вы с сайта для сотрудничества)</span>
                    <ul>
                        <li>Почта: <a href="mailto:mihalixz1221job@gmail.com">mihalixz1221job@gmail.com</a></li>
                        <li>Телеграмм: <a href="https://t.me/mishk10">@mishk10</a> </li>
                    </ul>
                </p>
                
            </div>
        </div>
    );
};

