/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RouterProvider, createBrowserRouter, Outlet, Navigate, Link } from 'react-router-dom';
import { Chat } from './components/Chat';
import { Login } from './components/Login';
import { Admin } from './components/Admin';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Loader2, LogOut, Shield } from 'lucide-react';

function Layout() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserChange(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserChange(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserChange = async (u: any) => {
    if (u) {
      setUser(u);
      const { data } = await supabase.from('users').select('is_admin').eq('id', u.id).single();
      setIsAdmin(!!data?.is_admin);
    } else {
      setUser(null);
      setIsAdmin(false);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-[#e0e8f5] via-[#f4ecf7] to-[#e0e8f5] dark:from-black dark:via-zinc-950 dark:to-black">
        <Login />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#e0e8f5] via-[#f4ecf7] to-[#e0e8f5] dark:from-black dark:via-zinc-950 dark:to-black font-sans text-slate-900 dark:text-zinc-100 flex flex-col transition-colors duration-500">
      <header className="px-6 py-4 flex items-center justify-between shrink-0 top-0 w-full absolute z-50">
         <div className="font-bold text-lg text-slate-800 dark:text-slate-200">MarkIt</div>
         <div className="flex items-center gap-4">
            {isAdmin && (
               <Link to="/admin" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">
                 <Shield size={16} /> Admin
               </Link>
            )}
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">Chat</Link>
            <button onClick={handleSignOut} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors" aria-label="Sign Out">
              <LogOut size={16} />
            </button>
         </div>
      </header>
      <div className="flex-1 flex items-center justify-center pt-12">
        <Outlet />
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/', element: <Chat /> },
      { path: '/admin', element: <Admin /> }
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
