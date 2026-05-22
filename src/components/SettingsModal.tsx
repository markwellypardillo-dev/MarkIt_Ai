import { X, User, Mail, Shield, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { theme, toggleTheme } = useUserPreferences();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <SettingsIcon className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-zinc-100">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-full hover:bg-white dark:hover:bg-zinc-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
          
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Profile Account</h3>
            {user ? (
               <div className="bg-slate-50 dark:bg-zinc-950/50 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-5">
                 {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="User Profile" className="w-16 h-16 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-zinc-800" referrerPolicy="no-referrer" />
                 ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-bold shadow-sm ring-2 ring-white dark:ring-zinc-800">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                 )}
                 <div className="flex-1">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-zinc-100">{user.user_metadata?.full_name || 'MarkIt User'}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-zinc-400">
                       <Mail size={14} />
                       <span>{user.email}</span>
                    </div>
                    {user.email === 'pmarkwelly@gmail.com' && (
                       <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded inline-flex">
                          <Shield size={12} /> Administrator
                       </div>
                    )}
                 </div>
               </div>
            ) : (
               <div className="text-slate-500 dark:text-zinc-400">Not logged in</div>
            )}
          </div>

          <div>
             <h3 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Preferences</h3>
             <div className="space-y-3">
                <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-950/50 hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-100 text-orange-600'}`}>
                       {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <div className="text-left">
                       <div className="font-semibold text-slate-800 dark:text-zinc-100">Appearance</div>
                       <div className="text-xs text-slate-500 dark:text-zinc-400">Toggle {theme === 'dark' ? 'light' : 'dark'} mode</div>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-zinc-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
