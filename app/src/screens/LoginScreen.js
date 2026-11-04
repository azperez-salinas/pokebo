import React, { useState } from 'react';
import AuthForm from '../components/AuthForm';
import EmailVerificationForm from '../components/EmailVerificationForm';

export default function LoginScreen({ onBack, onRegister }) {
  const [pending, setPending] = useState(null);

  if (pending) {
    return (
      <EmailVerificationForm
        pending={pending}
        purpose="login"
        onBack={() => setPending(null)}
      />
    );
  }

  return (
    <AuthForm
      mode="login"
      onBack={onBack}
      onSwitch={onRegister}
      onLoginStarted={setPending}
    />
  );
}
