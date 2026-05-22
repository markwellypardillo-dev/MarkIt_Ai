import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const checkAndCreateUser = async (user: any) => {
    const { data: existingUser } = await supabase.from('users').select('*').eq('id', user.id).single();

    if (!existingUser) {
      const isAdmin = user.email === 'pmarkwelly@gmail.com' || user.email === 'admin@gmail.com';
      await supabase.from('users').insert([
        {
          id: user.id,
          email: user.email,
          is_admin: isAdmin,
        }
      ]);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          await checkAndCreateUser(data.user);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (email === 'admin@gmail.com' && password === 'admin123') {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: 'Admin' } } });
            if (signUpError) throw signUpError;
            if (signUpData.user) {
              await checkAndCreateUser(signUpData.user);
            }
          } else {
            throw error;
          }
        } else if (data.user) {
          await checkAndCreateUser(data.user);
        }
      }
    } catch (e: any) {
       console.error("Auth fail:", e);
       setError(e.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 border border-transparent dark:border-zinc-800 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-2 dark:text-zinc-100">Welcome to MarkIt Ai</h1>
        <p className="text-slate-500 dark:text-zinc-400 mb-6 font-medium">
          {isSignUp ? 'Create an account to get started' : 'Log in to chat'}
        </p>
        
        {error && <div className="mb-4 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 py-2 px-3 rounded-lg border border-rose-100 dark:border-rose-900/50">{error}</div>}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6 text-left">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg py-2.5 font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        
        <button
           type="button"
           onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
           className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}
