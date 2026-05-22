import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, Bot, Trash2, Menu, Plus, MessageSquare, X, Download, Mic, MicOff, Search, Compass, Users, Clock, Layers, Calendar, Lightbulb, Image as ImageIcon, Music, MoreHorizontal, ChevronDown, Navigation, Settings } from 'lucide-react';
import { Message, MessageProps } from './Message';
import { useChats } from '../hooks/useChats';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { SettingsModal } from './SettingsModal';
import { supabase } from '../lib/supabase';

export function Chat() {
  const {
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
  } = useChats();

  const { theme, toggleTheme } = useUserPreferences();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
      // clear the input
      e.target.value = '';
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInput(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const exportChat = () => {
    if (!currentSession) return;
    let markdown = `# ${currentSession.title}\n\n`;
    currentSession.messages.forEach(m => {
      markdown += `### ${m.role === 'user' ? 'You' : 'MarkIt'}\n${m.text}\n\n---\n\n`;
    });
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSession.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickAction = async (prompt: string, sourceText?: string) => {
    if (prompt === "QUIZ_TRIGGER" && sourceText && currentSessionId) {
      setIsLoading(true);
      // Immediately add a new empty model message for the quiz
      updateSessionMessages(currentSessionId, [...messages, { role: 'user', text: "Can you test me on this?" }]);
      const messagesWithUser = [...messages, { role: 'user' as const, text: "Can you test me on this?" }];
      updateSessionMessages(currentSessionId, [...messagesWithUser, { role: 'model', text: 'Generating quiz...', isLoading: true }]);

      try {
        const res = await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sourceText }),
        });
        
        if (!res.ok) throw new Error("Quiz API Error");
        
        const quizData = await res.json();
        
        // Update the last message to be the quiz
        const currentSession = sessions.find(s => s.id === currentSessionId);
        if (currentSession) {
           const updatedMessages = [...currentSession.messages];
           const lastIdx = updatedMessages.length - 1;
           updatedMessages[lastIdx] = { 
             role: 'model', 
             text: 'Here is a quick question to test your understanding:', 
             type: 'quiz', 
             quizData: quizData 
           };
           updateSessionMessages(currentSessionId, updatedMessages);
        }
        
        finalizeStreaming(currentSessionId);
      } catch(e) {
        updateLastMessageObject(currentSessionId, "Sorry, I couldn't generate a quiz right now.");
      } finally {
        setIsLoading(false);
      }
    } else {
      handleSubmit(undefined, prompt);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, presetInput?: string) => {
    if (e) e.preventDefault();
    const textToSend = presetInput || input;
    if (!textToSend.trim() || isLoading || !currentSessionId) return;

    const userText = textToSend.trim();
    setInput('');
    setIsLoading(true);

    const newMessages: MessageProps[] = [
      ...messages,
      { role: 'user', text: userText, image: attachment || undefined }
    ];
    
    setAttachment(null);
    updateSessionMessages(currentSessionId, newMessages);
    updateSessionMessages(currentSessionId, [...newMessages, { role: 'model', text: '' }]);

    try {
      const contents = newMessages.map(msg => {
        const parts: any[] = [{ text: msg.text }];
        if (msg.image) {
           const mimeType = msg.image.substring(msg.image.indexOf(":")+1, msg.image.indexOf(";"));
           const base64Data = msg.image.substring(msg.image.indexOf(",")+1);
           parts.push({
             inlineData: {
               data: base64Data,
               mimeType: mimeType
             }
           });
        }
        return {
          role: msg.role,
          parts: parts
        };
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch from API');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader!.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (dataStr === '[DONE]') {
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.error) {
                  console.error(data.error);
                  break;
                }
                if (data.text) {
                   appendModelText(currentSessionId, data.text);
                }
              } catch (e) {
                console.error("Error parsing SSE data", e);
              }
            }
          }
        }
      }
      
      finalizeStreaming(currentSessionId);
    } catch (error) {
      console.error(error);
      updateLastMessageObject(currentSessionId, "An error occurred while fetching the response. Please check your connection or API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (isInitializing) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-[#e0e8f5] via-[#f4ecf7] to-[#e0e8f5] flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-slate-800 opacity-20" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] h-full sm:h-[90vh] bg-white/80 dark:bg-zinc-950/80 backdrop-blur-3xl sm:rounded-[2.5rem] shadow-2xl sm:border border-white/60 dark:border-zinc-800/80 flex flex-col sm:flex-row overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 sm:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl sm:bg-white/30 dark:sm:bg-zinc-900/30 border-r border-slate-100/50 dark:border-zinc-800 w-20 flex flex-col items-center py-6 sm:py-8 z-50 transition-transform duration-300 ease-in-out sm:relative sm:translate-x-0 shrink-0 justify-between ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col gap-4 items-center">
          <button aria-label="New Chat" onClick={() => { handleNewChat(); setIsHistoryOpen(false); }} className="w-12 h-12 bg-slate-900 dark:bg-zinc-100 dark:text-zinc-900 text-white rounded-full flex items-center justify-center shadow-md hover:bg-slate-800 dark:hover:bg-zinc-300 transition-colors">
             <Plus size={24} />
          </button>
          <button aria-label="Search" className="w-12 h-12 text-slate-400 hover:text-slate-700 hover:bg-white rounded-full flex items-center justify-center hover:shadow-sm transition-all mt-4">
             <Search size={22} />
          </button>
          <button aria-label="Explore" className="w-12 h-12 text-slate-400 hover:text-slate-700 hover:bg-white rounded-full flex items-center justify-center hover:shadow-sm transition-all">
             <Compass size={22} />
          </button>
          <button aria-label="History" className="w-12 h-12 text-slate-400 hover:text-slate-700 hover:bg-white rounded-full flex items-center justify-center hover:shadow-sm transition-all">
             <Users size={22} />
          </button>
          <button aria-label="Recent Discussions" className={`w-12 h-12 rounded-full flex items-center justify-center hover:shadow-sm transition-all relative ${isHistoryOpen ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-slate-400 hover:text-slate-700 hover:bg-white'}`} onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
             <Clock size={22} />
             {sessions.length > 0 && !isHistoryOpen && (
               <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white"></span>
             )}
          </button>
        </div>
        <div className="relative">
           <button aria-label="User Profile" onClick={() => setIsProfileOpen(!isProfileOpen)} className="w-10 h-10 bg-slate-900 dark:bg-zinc-800 text-white dark:text-zinc-300 font-bold rounded-xl flex items-center justify-center flex-col leading-none shadow-md border border-transparent dark:border-zinc-700 overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span>{user?.email?.charAt(0).toUpperCase() || 'U'}</span>
              )}
           </button>
           {isProfileOpen && (
              <div className="absolute bottom-12 left-12 sm:-left-2 sm:bottom-12 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                 <div className="px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 mb-2">Options</div>
                 <button onClick={() => { setIsSettingsModalOpen(true); setIsProfileOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors">
                   <Settings size={16} /> <span>Settings</span>
                 </button>
                 <button onClick={toggleTheme} className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg flex items-center justify-between transition-colors">
                   <span>Dark Mode</span>
                   <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                     <div className={`w-3 h-3 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                   </div>
                 </button>
              </div>
           )}
        </div>
      </div>

      {isSettingsModalOpen && <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />}

      {/* History Drawer */}
      {isHistoryOpen && (
        <div className="absolute left-20 top-0 bottom-0 w-64 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl border-r border-slate-100 dark:border-zinc-800 z-40 flex flex-col py-6 animate-in slide-in-from-left duration-300">
           <div className="px-5 mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-200 tracking-tight">Recent Conversations</h3>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
           </div>
           <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
             {sessions.sort((a, b) => b.updatedAt - a.updatedAt).map(session => (
              <div 
                key={session.id}
                onClick={() => {
                  setCurrentSessionId(session.id);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  setIsHistoryOpen(false);
                }}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={14} className={currentSessionId === session.id ? 'text-indigo-500' : 'text-slate-400'} />
                  <span className="truncate text-xs font-medium pr-2">{session.title}</span>
                </div>
                <button 
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1"
                  title="Delete Chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-slate-400 text-xs text-center py-6 font-medium">
                No previous chats
              </div>
            )}
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full bg-white/40 dark:bg-zinc-950/40">
         {/* Header */}
         <header className="px-6 sm:px-8 py-5 sm:py-6 flex items-center justify-between shrink-0">
            <button aria-label="Model Selector" className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-medium cursor-pointer hover:bg-white/60 dark:hover:bg-zinc-800/60 px-3 py-2 rounded-xl transition-colors">
               <span 
                  className="sm:hidden mr-2 p-1 text-slate-400 hover:text-slate-700"
                  onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }}
               >
                 <Menu size={20} />
               </span>
               <Sparkles size={18} className="text-slate-400 hidden sm:block" />
               <span className="text-sm">MarkIt</span>
               <ChevronDown size={16} className="text-slate-400" />
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-slate-800 tracking-wide hidden sm:block">
               Daily Nixtio
            </div>
            <button aria-label="Upgrade" className="bg-slate-900 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center gap-2 text-xs sm:text-sm font-medium hover:bg-slate-800 shadow-md transition-colors w-auto">
               <Sparkles size={14} className="text-amber-300" />
               <span className="hidden sm:block">Upgrade</span>
            </button>
         </header>

         {/* Conversation Area */}
         <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-40 pt-4 flex flex-col">
             {messages.length === 0 ? (
                 // Empty State
                 <div className="w-full max-w-4xl mx-auto mt-6 sm:mt-12 relative flex-1 flex flex-col">
                    <h1 className="text-3xl sm:text-[3rem] leading-[1.1] font-semibold text-slate-900 dark:text-zinc-100 mb-8 sm:mb-12 max-w-xl font-display tracking-tight px-2">
                      Hi Nixtio, Ready to<br/>Achieve Great Things?
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative px-2 shrink-0">
                       {/* Robot illustration placeholder (emoji approach for simplicity) */}
                       <div className="absolute -top-16 right-10 text-5xl animate-bounce hidden md:block">
                         🤖
                         <div className="absolute -top-8 -right-12 bg-white px-3 py-2 rounded-2xl rounded-bl-none shadow-md text-xs font-medium whitespace-nowrap text-slate-600">
                           Hey there! 👋<br/>Need a boost?
                         </div>
                       </div>
                       
                       {/* Card 1 */}
                       <button onClick={() => handleSubmit(undefined, "Contribute ideas, offer feedback, and manage tasks.")} className="bg-white dark:bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100/50 dark:border-zinc-800 hover:shadow-md transition-all text-left flex flex-col group h-full">
                          <div className="text-amber-500 mb-4 sm:mb-6 shrink-0 w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Layers size={24} />
                          </div>
                          <p className="text-slate-700 font-medium text-sm sm:text-base leading-snug mb-6 flex-1">
                            Contribute ideas, offer feedback, and manage tasks — all in sync.
                          </p>
                          <span className="text-slate-400 text-xs sm:text-sm font-medium">Fast Start</span>
                       </button>
                       {/* Card 2 */}
                       <button onClick={() => handleSubmit(undefined, "Stay connected, share ideas, and align goals effortlessly.")} className="bg-white dark:bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100/50 dark:border-zinc-800 hover:shadow-md transition-all text-left flex flex-col group h-full">
                          <div className="text-rose-500 mb-4 sm:mb-6 shrink-0 w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                             <MessageSquare size={24} />
                          </div>
                          <p className="text-slate-700 font-medium text-sm sm:text-base leading-snug mb-6 flex-1">
                            Stay connected, share ideas, and align goals effortlessly. Boost your productivity with AI Bot
                          </p>
                          <span className="text-slate-400 text-xs sm:text-sm font-medium">Collaborate with Team</span>
                       </button>
                       {/* Card 3 */}
                       <button onClick={() => handleSubmit(undefined, "Organize your time efficiently, set clear priorities.")} className="bg-white dark:bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100/50 dark:border-zinc-800 hover:shadow-md transition-all text-left flex flex-col group h-full">
                          <div className="text-blue-500 mb-4 sm:mb-6 shrink-0 w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                             <Calendar size={24} />
                          </div>
                          <p className="text-slate-700 font-medium text-sm sm:text-base leading-snug mb-6 flex-1">
                            Organize your time efficiently, set clear priorities, and stay focused
                          </p>
                          <span className="text-slate-400 text-xs sm:text-sm font-medium">Planning</span>
                       </button>
                    </div>
                 </div>
             ) : (
                 // Messages
                 <div className="w-full max-w-3xl mx-auto mt-4 px-2 sm:px-0">
                    {messages.map((msg, idx) => {
                      const isLatestModelMessage = msg.role === 'model' && idx === messages.length - 1;
                      return (
                        <Message 
                          key={idx} 
                          role={msg.role} 
                          text={msg.text} 
                          type={msg.type}
                          quizData={msg.quizData}
                          onQuickAction={(prompt, text) => handleQuickAction(prompt, text)}
                          isLatestModelMessage={isLatestModelMessage}
                          isLoading={isLoading}
                        />
                      );
                    })}
                    {isLoading && messages[messages.length - 1]?.text === '' && (
                      <div className="flex items-center gap-2 text-slate-400 text-sm ml-14 mb-4">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                 </div>
             )}
         </div>

         {/* Fixed Input Area at bottom */}
         <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 sm:px-6 z-20">
            <div className="flex justify-between items-center px-4 mb-2 sm:mb-3 text-[10px] sm:text-xs font-medium text-slate-500">
               <div className="flex items-center gap-1.5"><Sparkles size={14} className="text-slate-400"/> Unlock more with Pro Plan</div>
               <div className="flex items-center gap-1.5"><Sparkles size={14} className="text-slate-400"/> Powered by MarkIt</div>
            </div>
            
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-zinc-800 p-2 relative flex flex-col">
               {attachment && (
                 <div className="mx-4 mt-2 relative w-16 h-16 rounded-md overflow-hidden border border-slate-200">
                   <img src={attachment} alt="Attachment preview" className="w-full h-full object-cover" />
                   <button 
                     type="button" 
                     onClick={() => setAttachment(null)} 
                     className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                   >
                     <X size={12} />
                   </button>
                 </div>
               )}
               <form onSubmit={(e) => handleSubmit(e)} className="flex items-center bg-transparent rounded-full pr-2 pl-3 sm:pl-4 py-1">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                  />
                  <button type="button" aria-label="Add Attachment" onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 hidden sm:block">
                     <Plus size={20} />
                  </button>
                  <input 
                    type="text"
                    aria-label="Message Input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:outline-none px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500"
                    placeholder="Example: 'Explain quantum computing in simple terms'"
                    disabled={isLoading}
                  />
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button type="button" aria-label="Voice Input" onClick={toggleRecording} className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isRecording ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                       {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                    <button type="submit" aria-label="Send Message" disabled={!input.trim() || isLoading} className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-full hover:bg-slate-800 disabled:opacity-50 transition-all">
                       {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} className="ml-[-2px] mt-[1px] rotate-45" />}
                    </button>
                  </div>
               </form>
               
               {/* Quick Actions Row */}
               {messages.length === 0 && (
                 <div className="flex items-center gap-2 px-2 sm:px-3 pb-2 pt-1 overflow-x-auto no-scrollbar">
                    <button onClick={() => handleSubmit(undefined, "Conduct deep research on ")} className="flex items-center gap-2 bg-slate-900/95 text-white text-xs font-medium px-4 py-2 rounded-full whitespace-nowrap hover:bg-slate-800 transition-colors">
                       <Lightbulb size={14} className="text-amber-200" /> Deep Research
                    </button>
                    <button onClick={() => handleSubmit(undefined, "Generate an image of ")} className="flex items-center gap-2 bg-slate-900/95 text-white text-xs font-medium px-4 py-2 rounded-full whitespace-nowrap hover:bg-slate-800 transition-colors">
                       <ImageIcon size={14} className="text-blue-200" /> Make an Image
                    </button>
                    <button onClick={() => handleSubmit(undefined, "Search the web for ")} className="flex items-center gap-2 bg-slate-900/95 text-white text-xs font-medium px-4 py-2 rounded-full whitespace-nowrap hover:bg-slate-800 transition-colors">
                       <Search size={14} className="text-emerald-200" /> Search
                    </button>
                    <button onClick={() => handleSubmit(undefined, "Create music that sounds like ")} className="flex items-center gap-2 bg-slate-900/95 text-white text-xs font-medium px-4 py-2 rounded-full whitespace-nowrap hover:bg-slate-800 transition-colors">
                       <Music size={14} className="text-purple-200" /> Create music
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center bg-slate-900/95 text-white rounded-full shrink-0 hover:bg-slate-800 transition-colors">
                       <MoreHorizontal size={14} />
                    </button>
                 </div>
               )}
            </div>
         </div>

      </div>
    </div>
  );
}
