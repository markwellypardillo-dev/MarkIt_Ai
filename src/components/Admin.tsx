import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setUsers(data || []);
      } catch (e: any) {
         console.error('Error fetching users:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <div className="p-8">Loading users...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto w-full h-full overflow-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-600 dark:text-zinc-400">User ID</th>
              <th className="px-6 py-4 font-semibold text-slate-600 dark:text-zinc-400">Email</th>
              <th className="px-6 py-4 font-semibold text-slate-600 dark:text-zinc-400">Role</th>
              <th className="px-6 py-4 font-semibold text-slate-600 dark:text-zinc-400">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50">
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{u.id}</td>
                <td className="px-6 py-4 font-medium">{u.email}</td>
                <td className="px-6 py-4">
                  {u.is_admin ? (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border dark:border-indigo-500/30 rounded text-xs font-semibold uppercase tracking-wider">Admin</span>
                  ) : (
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 dark:border dark:border-zinc-700 rounded text-xs font-semibold uppercase tracking-wider">User</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
