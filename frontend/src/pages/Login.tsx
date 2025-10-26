import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

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
          navigate('/sales-person/dashboard');
          break;
        case 'DOCTOR':
          navigate('/doctor/dashboard');
          break;
        case 'LAB_TECHNICIAN':
          navigate('/lab/dashboard');
          break;
        case 'NURSE':
          navigate('/nurse/dashboard');
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
<div className="min-h-screen flex">
  {/* Left Section (Image) */}
  <div className="relative hidden lg:flex w-1/2 items-center justify-center bg-gray-900">
    <div
      className="absolute inset-0 bg-cover bg-center opacity-100"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1518186178736-ec619d8502f6?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')`,
      }}
    ></div>
    <div className="absolute inset-0 bg-gradient-to-br from-black via-blue-900 to-gray-900 opacity-90"></div>
    <div
      className="relative z-10 flex flex-col justify-center items-center h-full text-white p-8 text-center"
    >
      <img
        src="/True_hospitals_logo.jpeg"
        alt="Logo"
        className="h-30 w-auto mb-6 rounded-2xl"
      />
      <h2 className="text-4xl font-extrabold mb-4">Welcome Back!</h2>
      <p className="text-lg font-light max-w-md">
        Manage your hospital admins, staff, and patient records with ease.
      </p>
    </div>
  </div>

  {/* Right Section (Login Form) */}
  <div className="flex flex-1 w-1/2 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-gray-50">
    <div className="mx-auto w-full max-w-md lg:w-96">
      {/* Logo for small screens */}
      <div className="lg:hidden text-center mb-8">
        <img
          src="/True_hospitals_logo.jpeg"
          alt="Logo"
          className="mx-auto h-16 w-auto"
        />
      </div>

      <div>
        <h2 className="mt-6 text-center text-3xl w-120 font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 bg-white p-8 rounded-lg shadow-lg">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full appearance-none rounded-md border border-gray-200 px-4 py-2 placeholder-gray-400 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-primary-400 sm:text-sm transition duration-150 ease-in-out"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full appearance-none rounded-md border border-gray-200 px-4 py-2 placeholder-gray-400 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-primary-400 sm:text-sm transition duration-150 ease-in-out"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md border border-transparent bg-blue-900 py-3 px-4 text-sm font-semibold text-white shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 transition duration-150 ease-in-out"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
  );
} 