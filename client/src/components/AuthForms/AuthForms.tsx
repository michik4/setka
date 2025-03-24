import React, { useState } from 'react';
import { LoginForm } from '../LoginForm/LoginForm';
import { RegisterForm } from '../RegisterForm/RegisterForm';

export const AuthForms: React.FC = () => {
    const [isLoginForm, setIsLoginForm] = useState(true);

    return isLoginForm ? (
        <LoginForm onSwitchToRegister={() => setIsLoginForm(false)} />
    ) : (
        <RegisterForm onSwitchToLogin={() => setIsLoginForm(true)} />
    );
}; 