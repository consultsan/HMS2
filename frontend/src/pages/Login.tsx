import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/api/login', {
        email,
        password
      }, {
        withCredentials: true
      });

      const { token, user } = response.data.data;
      login(token, user);

      // Redirect based on role
      switch (user.role) {
        case 'SUPER_ADMIN':
          navigate('/super-admin/dashboard');
          break;
        case 'HOSPITAL_ADMIN':
          navigate('/hospital-admin/dashboard');
          break;
        case 'RECEPTIONIST':
          navigate('/receptionist/dashboard');
          break;
        case 'SALES_PERSON':
          navigate('/sales/dashboard');
          break;
        case 'DOCTOR':
          navigate('/doctor/dashboard');
          break;
        case 'LAB_TECHNICIAN':
          navigate('/lab/dashboard');
          break;
        // Add more cases for other roles as needed
        default:
          navigate('/hospital-admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <img
        src="/True-Hospital-Logo.webp"
        alt="Logo"
        className="absolute top-8 left-8 h-12 w-auto"
      />
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 