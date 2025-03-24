import React, { useState } from 'react';
import { LoginForm } from '../components/LoginForm/LoginForm';
import { RegisterForm } from '../components/RegisterForm/RegisterForm';

export const AuthPage: React.FC = () => {
    const [isLoginForm, setIsLoginForm] = useState(true);

    return isLoginForm ? (
        <LoginForm onSwitchToRegister={() => setIsLoginForm(false)} />
    ) : (
        <RegisterForm onSwitchToLogin={() => setIsLoginForm(true)} />
    );
}; 