import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Check, Copy, RefreshCw, Lightbulb, HelpCircle } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface QuizData {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface MessageProps {
  role: 'user' | 'model';
  text: string;
  onQuickAction?: (actionPrompt: string, msgText?: string) => void;
  isLatestModelMessage?: boolean;
  isLoading?: boolean;
  type?: 'text' | 'quiz';
  quizData?: QuizData;
  image?: string;
}

function CodeBlock({ inline, className, children, ...props }: any) {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group rounded-md overflow-hidden my-4 bg-[#1E1E1E]">
        <div className="flex items-center justify-between px-4 py-2 bg-[#2D2D2D] text-xs text-slate-300">
          <span className="font-mono uppercase">{match[1]}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
            title="Copy code"
          >
            {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{isCopied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={match[1]}
          PreTag="div"
          className="!mt-0 !mb-0 !bg-transparent !p-4 custom-scrollbar"
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className={`${className || ''} bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 px-1 py-0.5 rounded font-mono text-sm`} {...props}>
      {children}
    </code>
  );
}

function QuizBlock({ quizData }: { quizData: QuizData }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isAnswered = selectedIndex !== null;

  return (
    <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-zinc-800 my-2">
      <div className="flex items-center gap-2 mb-3 text-orange-600 dark:text-orange-400 font-semibold tracking-wide text-xs">
        <HelpCircle size={14} /> Quick Knowledge Check
      </div>
      <h4 className="text-slate-800 dark:text-zinc-100 font-medium mb-4">{quizData.question}</h4>
      <div className="flex flex-col gap-2">
        {quizData.options.map((option, idx) => {
          let btnClass = "text-left px-4 py-3 rounded-lg border text-sm transition-all ";
          
          if (!isAnswered) {
             btnClass += "border-slate-200 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-100 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300";
          } else {
             if (idx === quizData.correctAnswerIndex) {
                 btnClass += "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-400";
             } else if (idx === selectedIndex) {
                 btnClass += "border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-400";
             } else {
                 btnClass += "border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 opacity-60";
             }
          }

          return (
            <button 
              key={idx} 
              disabled={isAnswered}
              className={btnClass}
              onClick={() => setSelectedIndex(idx)}
            >
              {option}
            </button>
          );
        })}
      </div>
      {isAnswered && (
        <div className={`mt-4 p-3 rounded-lg flex gap-3 text-sm ${selectedIndex === quizData.correctAnswerIndex ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200'}`}>
          <div className="mt-0.5">
            {selectedIndex === quizData.correctAnswerIndex ? <Check size={16} /> : <div className="font-bold text-lg leading-none">&times;</div>}
          </div>
          <div>
            <div className="font-semibold mb-1">
               {selectedIndex === quizData.correctAnswerIndex ? 'Correct!' : 'Not quite.'}
            </div>
            <div className="opacity-90">{quizData.explanation}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Message({ role, text, type, quizData, image, onQuickAction, isLatestModelMessage, isLoading }: MessageProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[85%] sm:max-w-[75%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>
        <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {isUser ? 'You' : 'MarkIt'}
          </span>
          <div className={`px-5 py-3.5 rounded-2xl w-full ${isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 rounded-tl-sm shadow-sm'}`}>
            <div className={`prose prose-sm dark:prose-invert max-w-none w-full ${isUser ? 'prose-invert' : ''}`}>
              {isUser ? (
                <div>
                  <div className="whitespace-pre-wrap">{text}</div>
                  {image && <img src={image} className="mt-3 rounded-lg max-w-full h-auto max-h-64 object-contain shadow-sm" alt="Attached" />}
                </div>
              ) : type === 'quiz' && quizData ? (
                <QuizBlock quizData={quizData} />
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: CodeBlock
                  }}
                >
                  {text}
                </ReactMarkdown>
              )}
            </div>
            {!isUser && isLatestModelMessage && !isLoading && onQuickAction && type !== 'quiz' && (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/50">
                <button onClick={() => onQuickAction("Can you explain that more simply with an analogy?")} className="px-3 py-1.5 text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-full transition-colors flex items-center gap-1.5" aria-label="Simplify">
                  <RefreshCw size={12} /> Simplify
                </button>
                <button onClick={() => onQuickAction("Can you give me a concrete example of this?")} className="px-3 py-1.5 text-[11px] font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-full transition-colors flex items-center gap-1.5" aria-label="Example">
                  <Lightbulb size={12} /> Example
                </button>
                <button onClick={() => onQuickAction("QUIZ_TRIGGER", text)} className="px-3 py-1.5 text-[11px] font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-full transition-colors flex items-center gap-1.5" aria-label="Test Me">
                  <HelpCircle size={12} /> Test Me
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
