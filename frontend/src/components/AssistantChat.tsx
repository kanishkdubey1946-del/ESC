import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUp, ArrowUpRight, BookOpen, Check, ChevronDown, FileText, Mic, Paperclip, Plus, RefreshCw, ShieldCheck, Sparkles, Square, X } from 'lucide-react';
import { AIStatus } from './ui/AIStatus';
import { ThinkingOrb, type OrbState } from './ui/thinking-orbs';
import { ChatBubble } from './ui/ChatBubble';
import { streamAssistantChat } from '../utils/assistantChat';
import { readConversations, saveConversation, type AssistantMessage } from '../lib/assistantMemory';
import { consumeSpecialistLaunch, type WorkspaceMode } from '../lib/modeAgents';
import { loadWorkspace, type WorkspaceDocument } from '../lib/workspaceMemory';

type SpeechResultEvent = { results: ArrayLike<{ 0: { transcript: string } }> };
type VoiceRecognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: SpeechResultEvent) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void; abort: () => void };
const starters = [
  { title: 'Make it click', description: 'Understand a tricky concept', icon: Sparkles, tone: 'lilac', prompt: 'Help me understand a concept step by step. Ask me which topic I am finding difficult.' },
  { title: 'Make a plan', description: 'Turn a big goal into small steps', icon: BookOpen, tone: 'sage', prompt: 'Help me make a realistic study plan. First ask me about my goal, deadline, and available time.' },
  { title: 'Put me to the test', description: 'Find out what really stuck', icon: Check, tone: 'peach', prompt: 'Quiz me on my study material, one question at a time. Ask for the topic if I have not attached sources.' },
  { title: 'Connect the dots', description: 'Get more from your notes', icon: FileText, tone: 'blue', prompt: 'Summarize the key ideas in my attached sources and explain how they connect. If I have not attached any, ask me to add them.' },
];

export default function AssistantChat({ owner, mode, conversationId, displayName, onOpenSources, initialPrompt, onPromptConsumed, onAskPlanner }: {
  owner: string; mode: WorkspaceMode; conversationId: string; displayName: string; onOpenSources: () => void;
  initialPrompt?: string; onPromptConsumed: () => void; onAskPlanner: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [messages, setMessages] = useState<AssistantMessage[]>(() => readConversations(owner, mode).find(item => item.id === conversationId)?.messages || []);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<OrbState>('listening');
  const [phaseLabel, setPhaseLabel] = useState('Ready when you are');
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>(() => loadWorkspace().documents);
  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [sourcePicker, setSourcePicker] = useState(false);
  const [agentId, setAgentId] = useState<string>();
  const [storageWarning, setStorageWarning] = useState('');
  const [showLatest, setShowLatest] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<AbortController | null>(null);
  const voiceRef = useRef<VoiceRecognition | null>(null);
  const latestRef = useRef<AssistantMessage[]>(messages);
  const stickRef = useRef(true);
  const selectedDocs = documents.filter(document => !excludedSources.includes(document.id));

  useEffect(() => {
    if (initialPrompt) { setPrompt(initialPrompt); onPromptConsumed(); textareaRef.current?.focus(); }
    const launch = consumeSpecialistLaunch(mode);
    if (launch) { setPrompt(launch.prompt); setAgentId(launch.agentId.replace(/^pg_/, '')); textareaRef.current?.focus(); }
  }, [mode, initialPrompt, onPromptConsumed]);

  useEffect(() => {
    const update = () => setDocuments(loadWorkspace().documents);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('storage', update); streamRef.current?.abort(); voiceRef.current?.abort(); };
  }, []);

  useEffect(() => {
    const input = textareaRef.current;
    if (input) { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 180)}px`; }
  }, [prompt]);

  useEffect(() => {
    latestRef.current = messages;
    if (stickRef.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, phase]);

  const persist = useCallback((next: AssistantMessage[]) => {
    if (!next.length) return;
    try { saveConversation(owner, mode, { id: conversationId, title: next.find(item => item.role === 'user')?.text.slice(0, 65) || 'New conversation', messages: next, updatedAt: new Date().toISOString() }); }
    catch { setStorageWarning('Browser storage is full. This conversation will stay available until you leave this page.'); }
  }, [owner, mode, conversationId]);

  const send = async (retry = false) => {
    if (streamRef.current) return;
    const previous = latestRef.current;
    const retryIndex = previous.findLastIndex(message => message.role === 'user');
    const text = retry ? previous[retryIndex]?.text : prompt.trim();
    if (!text) return;
    voiceRef.current?.abort(); voiceRef.current = null; setListening(false);
    const history = retry ? previous.slice(0, retryIndex) : previous;
    const responseId = crypto.randomUUID();
    let next: AssistantMessage[] = [...history, { id: crypto.randomUUID(), role: 'user', text }, { id: responseId, role: 'assistant', text: '' }];
    const controller = new AbortController();
    streamRef.current = controller;
    setBusy(true); setError(''); setPrompt(''); setSourcePicker(false);
    setPhase(selectedDocs.length ? 'searching' : 'solving');
    setPhaseLabel(selectedDocs.length ? 'Reading your sources' : 'Thinking it through');
    stickRef.current = true;
    setMessages(next); latestRef.current = next;
    const updateResponse = (patch: Partial<AssistantMessage>) => {
      next = next.map(item => item.id === responseId ? { ...item, ...patch } : item);
      latestRef.current = next; setMessages(next);
    };
    let answer = '';
    try {
      await streamAssistantChat({ prompt: text, documents: selectedDocs, agentId, history: history.filter(item => item.text && !item.interrupted).slice(-12).map(item => ({ role: item.role, content: item.text })), signal: controller.signal,
        onEvent: event => {
          if (event.type === 'status') { setPhase(event.state); setPhaseLabel(event.message); }
          if (event.type === 'sources') updateResponse({ sources: event.sources });
          if (event.type === 'delta') { answer += event.text; updateResponse({ text: answer }); setPhase('composing'); setPhaseLabel('Writing your answer'); }
          if (event.type === 'error') throw new Error(event.message);
        },
      });
    } catch (reason) {
      updateResponse({ interrupted: true });
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Your answer could not be completed. Please try again.');
    } finally {
      if (!answer) next = next.filter(item => item.id !== responseId);
      latestRef.current = next; setMessages(next); persist(next);
      streamRef.current = null; setBusy(false); setPhase('listening'); setPhaseLabel('Ready for your next question');
    }
  };

  const toggleVoice = () => {
    if (voiceRef.current) { voiceRef.current.stop(); return; }
    const speechWindow = window as typeof window & { SpeechRecognition?: new () => VoiceRecognition; webkitSpeechRecognition?: new () => VoiceRecognition };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setError('Voice input is not supported by this browser. You can type your question below.'); return; }
    const recognition = new Recognition();
    const prefix = prompt.trim();
    recognition.lang = 'en-US'; recognition.interimResults = true; recognition.continuous = false;
    recognition.onresult = event => {
      if (voiceRef.current !== recognition) return;
      const transcript = Array.from(event.results).map(result => result[0].transcript.trim()).join(' ');
      setPrompt([prefix, transcript].filter(Boolean).join(' '));
    };
    recognition.onerror = () => { setError('Voice input could not start. Check your microphone permission and try again.'); setListening(false); voiceRef.current = null; };
    recognition.onend = () => { setListening(false); if (voiceRef.current === recognition) voiceRef.current = null; };
    try { voiceRef.current = recognition; recognition.start(); setListening(true); setError(''); }
    catch { voiceRef.current = null; setError('The microphone could not start. Please try again.'); }
  };

  const empty = messages.length === 0;
  return <div className="esc-chat-layout">
    <div className="esc-chat-main">
      <div className={`esc-chat-scroll ${empty ? 'is-empty' : ''}`} ref={scrollRef} onScroll={() => { const scroll = scrollRef.current; if (scroll) { stickRef.current = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 100; setShowLatest(!stickRef.current); } }}>
        {empty ? <motion.div initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="esc-chat-welcome">
          <div className="esc-orb-stage"><div className="esc-orb-halo" /><ThinkingOrb state={listening ? 'listening' : 'shaping'} size={64} theme="dark" /><span className="esc-orbit-dot" /></div>
          <div className="esc-welcome-kicker"><span /> YOUR PERSONAL LEARNING COMPANION</div>
          <h1>A little curiosity.<br /><span>A whole new possibility.</span></h1>
          <p>Hey {displayName.split(' ')[0]}, what’s on your mind?<br className="sm:hidden" /> Let’s make it make sense.</p>
          <div className="esc-starters">{starters.map(starter => <button key={starter.title} onClick={() => { setPrompt(starter.prompt); textareaRef.current?.focus(); }} className={`esc-starter ${starter.tone}`}><starter.icon size={18} strokeWidth={1.5} /><ArrowUpRight className="esc-starter-arrow" size={14} /><strong>{starter.title}</strong><span>{starter.description}</span></button>)}</div>
        </motion.div> : <div className="esc-message-list">
          <div className="mb-10 text-center text-[10px] uppercase tracking-[.18em] text-[#65626f]">A little closer to understanding</div>
          {messages.map((message, index) => <div key={message.id} className="mb-8">
            {message.role === 'assistant' && !message.text && busy ? <AIStatus state={phase} label={phaseLabel} size={64} /> : <ChatBubble role={message.role} text={message.text} name={message.role === 'assistant' ? 'ESC' : undefined} streaming={busy && index === messages.length - 1} />}
            {!!message.sources?.length && !!message.text && <details className="esc-answer-sources"><summary><ShieldCheck size={12} /> Based on {message.sources.length} of your source{message.sources.length === 1 ? '' : 's'} <ChevronDown size={12} /></summary><div className="mt-3 grid gap-2">{message.sources.map(source => <div key={source.sourceId} className="rounded-lg border border-white/10 px-3 py-2"><p className="text-xs text-[#ccc2e1]">[{source.citationNumber}] {source.title}</p><p className="mt-1 text-[11px] leading-5 text-[#92909e]">{source.evidenceSnippets?.[0]}</p></div>)}</div></details>}
            {message.interrupted && message.text && <p className="mt-2 text-xs text-[#ae91b0]">Response interrupted. You can retry below.</p>}
          </div>)}
        </div>}
      </div>
      <div className="esc-composer-region">
        {showLatest && <button className="esc-scroll-latest" aria-label="Jump to latest message" onClick={() => { stickRef.current = true; scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reducedMotion ? 'instant' : 'smooth' }); setShowLatest(false); }}><ArrowDown size={17} /></button>}
        {error && <div className="esc-chat-error" role="alert"><span>{error}</span><div className="flex shrink-0 gap-3">{messages.some(message => message.role === 'user') && <button disabled={busy} onClick={() => void send(true)} className="inline-flex items-center gap-1"><RefreshCw size={12} /> Retry</button>}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div></div>}
        <div className="esc-composer">
          {(busy || listening) && <div className="px-4 pt-3"><AIStatus state={listening ? 'listening' : phase} label={listening ? 'Listening to you…' : phaseLabel} size={20} compact /></div>}
          <textarea aria-label="Message ESC" ref={textareaRef} rows={2} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder={selectedDocs.length ? 'Ask anything about your sources…' : 'Ask a question, untangle a concept, or dream up a plan…'} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
          <div className="esc-composer-toolbar">
            <div className="flex items-center gap-2">
              <button className="esc-icon-button" onClick={onOpenSources} aria-label="Attach sources"><Plus size={19} /></button>
              <div className="relative">
                <button className={`esc-source-button ${selectedDocs.length ? 'has-sources' : ''}`} onClick={() => documents.length ? setSourcePicker(!sourcePicker) : onOpenSources()} aria-expanded={sourcePicker}><Paperclip size={13} /> {selectedDocs.length ? `${selectedDocs.length} source${selectedDocs.length > 1 ? 's' : ''}` : 'Add sources'} {documents.length > 0 && <ChevronDown size={12} />}</button>
                <AnimatePresence>{sourcePicker && <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="esc-source-picker"><div className="mb-2 flex items-center justify-between text-xs text-[#bbb0ce]"><span>Answer only from selected sources</span><button aria-label="Close source selection" onClick={() => setSourcePicker(false)}><X size={13} /></button></div>{documents.map(document => <label key={document.id} className="flex items-center gap-2 py-2 text-xs"><input type="checkbox" checked={!excludedSources.includes(document.id)} onChange={() => setExcludedSources(previous => previous.includes(document.id) ? previous.filter(id => id !== document.id) : [...previous, document.id])} /><span className="truncate">{document.name}</span></label>)}</motion.div>}</AnimatePresence>
              </div>
            </div>
            <div className="flex items-center gap-2"><button className={`esc-icon-button ${listening ? 'text-[#c5b2f4]' : ''}`} disabled={busy} onClick={toggleVoice} aria-label={listening ? 'Stop voice input' : 'Start voice input'} aria-pressed={listening}>{listening ? <ThinkingOrb state="listening" size={20} /> : <Mic size={17} />}</button><button className="esc-send-button" aria-label={busy ? 'Stop response' : 'Send message'} onClick={() => busy ? streamRef.current?.abort() : void send()} disabled={!busy && !prompt.trim()}>{busy ? <Square size={14} fill="currentColor" /> : <ArrowUp size={18} />}</button></div>
          </div>
        </div>
        <p className="esc-composer-footnote">{storageWarning || (selectedDocs.length ? 'Grounded in your selected sources. A clearer answer starts with good context.' : 'A thinking partner, at your pace. Always double-check important details.')}</p>
      </div>
    </div>
    <aside className="esc-context-panel">
      <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[.16em] text-[#72707f]">A little direction</span><span className="h-1 w-1 rounded-full bg-[#9c8fba]" /></div>
      <div className="esc-context-art"><div className="esc-art-ring ring-one" /><div className="esc-art-ring ring-two" /><div className="esc-art-ring ring-three" /><Sparkles size={26} strokeWidth={1} /></div>
      <h2 className="text-[19px] font-medium leading-7 tracking-tight text-[#ddd7e9]">Big ambitions.<br />Small, steady steps.</h2>
      <p className="mt-3 text-xs leading-[1.9] text-[#85818f]">A plan that fits your life makes room for the things you want to learn.</p>
      <button onClick={onAskPlanner} className="mt-5 flex items-center gap-2 text-xs font-medium text-[#bea9ed]">Shape my study plan <ArrowUpRight size={13} /></button>
      <div className="my-7 border-t border-white/[.06]" />
      <div className="flex items-center justify-between"><h3 className="text-[11px] font-medium text-[#ada6ba]">Your learning context</h3><BookOpen size={13} className="text-[#797181]" /></div>
      <p className="mt-2 text-xs leading-6 text-[#797583]">{selectedDocs.length ? `${selectedDocs.length} source${selectedDocs.length > 1 ? 's' : ''} connected. Answers stay grounded in what you share.` : 'Bring your notes, PDFs, and big questions. We’ll connect the dots.'}</p>
      <div className="mt-4 space-y-2">{selectedDocs.slice(0, 3).map(document => <button key={document.id} onClick={onOpenSources} className="flex w-full items-center gap-2 rounded-lg border border-white/[.06] bg-white/[.02] p-2 text-left text-[10px] text-[#aaa3b8]"><FileText size={12} className="shrink-0" /><span className="truncate">{document.name}</span></button>)}</div>
      <button onClick={onOpenSources} className="mt-3 inline-flex items-center gap-2 text-xs text-[#aaa1bd]"><Plus size={13} /> Add to your library</button>
      <div className="mt-auto pt-12"><AIStatus state={busy ? phase : 'listening'} label={busy ? phaseLabel : 'Here for your next aha.'} size={20} compact /></div>
    </aside>
  </div>;
}
