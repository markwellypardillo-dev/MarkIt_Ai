import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageProps } from '../components/Message';

export interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: MessageProps[];
  userId?: string;
}

export function useChats() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;
    let authSub: any;

    const setupListener = async (userId: string) => {
      // First fetch
      const fetchChats = async () => {
        const { data } = await supabase.from('chats').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
        if (data) {
          const loadedSessions = data.map(d => ({
            id: d.id,
            title: d.title,
            updatedAt: new Date(d.updated_at).getTime(),
            messages: d.messages || [],
            userId: d.user_id,
          }));
          setSessions(loadedSessions);
          if (loadedSessions.length > 0 && !currentSessionId) {
            setCurrentSessionId(loadedSessions[0].id);
          }
        }
        setIsInitializing(false);
      };
      await fetchChats();

      // Real-time subscription
      const channel = supabase
        .channel('chats-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chats', filter: `user_id=eq.${userId}` },
          (payload) => {
             fetchChats(); // Simplest way to sync, though not perfectly optimistic for all clients
          }
        )
        .subscribe();
      
      unsubscribe = () => supabase.removeChannel(channel);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setupListener(session.user.id);
      } else {
        setIsInitializing(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setupListener(session.user.id);
      } else {
        setSessions([]);
        setCurrentSessionId(null);
        setIsInitializing(false);
        if (unsubscribe) unsubscribe();
      }
    });
    authSub = subscription;

    return () => {
      if (unsubscribe) unsubscribe();
      if (authSub) authSub.unsubscribe();
    };
  }, []);

  const createNewSession = (initialMessages: MessageProps[] = []): ChatSession => ({
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    title: initialMessages.length > 0 ? (initialMessages[0].text.substring(0, 30) + (initialMessages[0].text.length > 30 ? '...' : '')) : 'New Chat',
    updatedAt: Date.now(),
    messages: initialMessages,
  });

  const handleNewChat = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      alert('Please log in to start a chat');
      return;
    }

    const currentSession = sessions.find(s => s.id === currentSessionId);
    if (currentSession && currentSession.messages.length === 0) return;

    const newSession = createNewSession();
    newSession.userId = user.id;
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);

    try {
      await supabase.from('chats').insert([
        {
          id: newSession.id,
          title: newSession.title,
          user_id: user.id,
          updated_at: new Date(newSession.updatedAt).toISOString(),
          messages: newSession.messages
        }
      ]);
    } catch(e) {
      console.error(e);
    }
  };

  const deleteSession = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;

    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (id === currentSessionId) {
        const nextId = remaining.length > 0 ? remaining[0].id : null;
        setCurrentSessionId(nextId);
      }
      return remaining;
    });

    try {
      await supabase.from('chats').delete().eq('id', id);
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const syncSessionToDb = async (session: ChatSession) => {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.user) return;
    
    try {
      await supabase.from('chats').upsert([
        {
          id: session.id,
          title: session.title,
          user_id: authSession.user.id,
          updated_at: new Date(session.updatedAt).toISOString(),
          messages: session.messages
        }
      ], { onConflict: 'id' });
    } catch(err) {
      console.error(err);
    }
  };

  const updateSessionMessages = (sessionId: string, newMessages: MessageProps[]) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === sessionId) {
          const updatedSession = {
            ...s,
            messages: newMessages,
            updatedAt: Date.now(),
            title: newMessages.length > 0 && s.title === 'New Chat' 
              ? (newMessages[0].text.substring(0, 30) + (newMessages[0].text.length > 30 ? '...' : '')) 
              : s.title
          };
          syncSessionToDb(updatedSession);
          return updatedSession;
        }
        return s;
      });
      return updated;
    });
  };

  const updateLastMessageObject = (sessionId: string, fullText: string) => {
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === sessionId) {
          const msgs = [...s.messages];
          const lastIdx = msgs.length - 1;
          if (msgs[lastIdx]?.role === 'model') {
             msgs[lastIdx] = { ...msgs[lastIdx], text: fullText };
          }
          const updatedSession = { ...s, messages: msgs, updatedAt: Date.now() };
          syncSessionToDb(updatedSession);
          return updatedSession;
        }
        return s;
      });
      return updated;
    });
  };

  const appendModelText = (sessionId: string, text: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const msgs = [...s.messages];
        const lastIdx = msgs.length - 1;
        if (msgs[lastIdx]?.role === 'model') {
          msgs[lastIdx] = { ...msgs[lastIdx], text: msgs[lastIdx].text + text };
        }
        return { ...s, messages: msgs };
      }
      return s;
    }));
  };

  const finalizeStreaming = (sessionId: string) => {
    setSessions(prev => {
      const session = prev.find(s => s.id === sessionId);
      if (session) {
        syncSessionToDb({ ...session, updatedAt: Date.now() });
      }
      return prev;
    });
  }

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    handleNewChat,
    deleteSession,
    updateSessionMessages,
    appendModelText,
    updateLastMessageObject,
    finalizeStreaming,
    isInitializing
  };
}
