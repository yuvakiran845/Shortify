import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import AuthCard from '../components/auth/AuthCard';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import useAuth from '../hooks/useAuth';
import usePageTitle from '../hooks/usePageTitle';
import { welcomeMessage } from '../lib/authMessages';
import { ROUTES } from '../lib/routes';
import { toast } from '../lib/toast';
import { PASSWORD_MIN_LENGTH, safeRedirectPath, validateSignupForm } from '../lib/validateAuth';

export default function Signup() {
  usePageTitle('Create an account');
  const { status, register } = useAuth();
  const location = useLocation();
  const redirectTo = safeRedirectPath(location.state?.from, ROUTES.dashboard);

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to={redirectTo} replace />;

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;

    const fieldErrors = validateSignupForm(values);
    setErrors(fieldErrors);
    setFormError('');
    const firstInvalid = Object.keys(fieldErrors)[0];
    if (firstInvalid) {
      form.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const { user, claimedLinks } = await register(values.name.trim(), values.email.trim(), values.password);
      toast.success(welcomeMessage(user, claimedLinks, { isNewAccount: true }));
    } catch (error) {
      if (error.field) {
        setErrors({ [error.field]: error.message });
        form.elements.namedItem(error.field)?.focus();
      } else {
        setFormError(error.message);
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Keep your links organized and see how each one performs."
      footer={
        <>
          Already have an account?{' '}
          <Link to={ROUTES.login} state={location.state} className="font-semibold text-brand-700 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {formError && (
        <Alert tone="error" className="mb-6">
          {formError}
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input
          label="Name"
          name="name"
          autoComplete="name"
          maxLength={80}
          value={values.name}
          onChange={update('name')}
          error={errors.name}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={values.email}
          onChange={update('email')}
          error={errors.email}
        />
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN_LENGTH} characters. A short phrase is easy to remember and hard to guess.`}
        />
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-xs leading-5 text-ink-subtle">
          Links you already shortened in this browser will move into your new account.
        </p>
      </form>
    </AuthCard>
  );
}
