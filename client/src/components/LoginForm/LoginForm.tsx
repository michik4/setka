import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './LoginForm.module.css';

interface LoginFormProps {
    onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await login(email, password);
            navigate('/feed');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Произошла ошибка при входе');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <h2>Вход</h2>
            
            {error && (
                <div className={styles.error}>
                    {error}
                </div>
            )}

            <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Введите email"
                    className={styles.input}
                />
            </div>

            <div className={styles.field}>
                <label htmlFor="password">Пароль</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Введите пароль"
                    className={styles.input}
                />
            </div>

            <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Вход...' : 'Войти'}
            </button>

            <div className={styles.switchForm}>
                Нет аккаунта?{' '}
                <button type="button" onClick={onSwitchToRegister} className={styles.switchButton}>
                    Зарегистрироваться
                </button>
            </div>
        </form>
    );
}; 