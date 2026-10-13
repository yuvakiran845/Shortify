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
import { safeRedirectPath, validateLoginForm } from '../lib/validateAuth';

export default function Login() {
  usePageTitle('Log in');
  const { status, login } = useAuth();
  const location = useLocation();
  // Where to go after logging in: the protected page that sent us here, or the dashboard.
  const redirectTo = safeRedirectPath(location.state?.from, ROUTES.dashboard);

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in (or just logged in): leave this page.
  if (status === 'authenticated') return <Navigate to={redirectTo} replace />;

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;

    const fieldErrors = validateLoginForm(values);
    setErrors(fieldErrors);
    setFormError('');
    const firstInvalid = Object.keys(fieldErrors)[0];
    if (firstInvalid) {
      form.elements.namedItem(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const { user, claimedLinks } = await login(values.email.trim(), values.password);
      toast.success(welcomeMessage(user, claimedLinks));
      // The status change re-renders this page, and <Navigate> above redirects.
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
      title="Welcome back"
      subtitle="Log in to manage your links."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to={ROUTES.signup} state={location.state} className="font-semibold text-brand-700 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      {location.state?.from && !formError && (
        <Alert className="mb-6">Please log in to continue to that page.</Alert>
      )}
      {formError && (
        <Alert tone="error" className="mb-6">
          {formError}
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
          autoComplete="current-password"
          value={values.password}
          onChange={update('password')}
          error={errors.password}
        />
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthCard>
  );
}
