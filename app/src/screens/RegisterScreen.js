import React from 'react';
import AuthForm from '../components/AuthForm';

export default function RegisterScreen({ onBack, onLogin, onAuthenticated }) {
  return <AuthForm mode="register" onBack={onBack} onSwitch={onLogin} onAuthenticated={onAuthenticated} />;
}
