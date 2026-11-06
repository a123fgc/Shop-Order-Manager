import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, Loader2, AlertCircle } from 'lucide-react';

// Registration password validation
const validatePassword = (password) => {
  if (typeof password !== 'string') {
    return 'Password must be a valid string';
  }

  const byteLength = new TextEncoder().encode(password).length;

  if (password.length < 12) {
    return 'Password must be at least 12 characters long';
  }

  if (byteLength > 72) {
    return 'Password cannot exceed 72 UTF-8 bytes';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain a lowercase letter';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain an uppercase letter';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain a number';
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain a special character';
  }

  return null;
};

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Always validate password format and bcrypt byte limit.
    if (
      typeof password !== 'string' ||
      password.length === 0 ||
      new TextEncoder().encode(password).length > 72
    ) {
      setError('Invalid password. Please check your password length.');
      return;
    }

    // Apply strong password policy to new registrations.
    if (isRegister) {
      const passwordError = validatePassword(password);

      if (passwordError) {
        setError(passwordError);
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password, phone, address);
      } else {
        await login(email, password);
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 mb-4">
            <Store className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            Shop Order Manager
          </h1>

          <p className="text-gray-500 mt-1">
            {isRegister
              ? 'Create your account'
              : 'Sign in to your account'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">

          {error && (
            <div className="mb-6 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="John Doe"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="john@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                autoComplete={
                  isRegister ? 'new-password' : 'current-password'
                }
                required
                minLength={isRegister ? 12 : 1}
                maxLength={72}
              />

              {isRegister && (
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 12 characters with uppercase, lowercase,
                  number and special character. Maximum 72 UTF-8 bytes.
                </p>
              )}
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field"
                    placeholder="03XXXXXXXXX"
                    autoComplete="tel"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address
                  </label>

                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input-field min-h-[90px] resize-y"
                    placeholder="Enter your complete address"
                    autoComplete="street-address"
                    required
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2"
            >
              {loading && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}

              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
