import React, { useState } from 'react';
import AuthForm from '../components/AuthForm';
import EmailVerificationForm from '../components/EmailVerificationForm';

export default function RegisterScreen({ onBack, onLogin }) {
  const [pending, setPending] = useState(null);

  if (pending) {
    return <EmailVerificationForm pending={pending} purpose="registration" onBack={() => setPending(null)} />;
  }

  return (
    <AuthForm
      mode="register"
      onBack={onBack}
      onSwitch={onLogin}
      onRegistrationStarted={setPending}
    />
  );
}
