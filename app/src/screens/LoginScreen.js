import React from 'react';
import AuthForm from '../components/AuthForm';

export default function LoginScreen({ onBack, onRegister, onAuthenticated }) {
  return <AuthForm mode="login" onBack={onBack} onSwitch={onRegister} onAuthenticated={onAuthenticated} />;
}
