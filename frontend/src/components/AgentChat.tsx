import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Send, Copy, Download, Bot, User, Check, Terminal } from 'lucide-react';

interface Message {
  id: string;
  role: 'agent' | 'user';
  content: string;
  isStreaming?: boolean;
}

export const AgentChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      content: 'Hello! I am the Development Planning Agent. I have reviewed the citizen insights from Ward 3. Shall we prioritize the infrastructure gap analysis?',
    },
    {
      id: '2',
      role: 'user',
      content: 'Yes, please focus on road repairs as the critical priority.',
    },
    {
      id: '3',
      role: 'agent',
      content: 'Updating Development Plan...\n\n### Project Prioritization\n1. **Critical Priority**: Main Market Road Repair (Est. 45 days, ₹12 Lakhs)\n2. **High Priority**: Ward 3 Drainage Clearance (Est. 15 days, ₹3 Lakhs)\n3. **Medium Priority**: Public Park Lighting Installation.',
      isStreaming: true
    }
  ]);

  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };
    setMessages(prev => [...prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m), userMsg]);
    setInput('');

    setTimeout(() => {
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: `I've received your request: "${input}". Working on integrating this into the development strategy and updating the planning timeline.`,
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 1000);
  };

  return (
    <Card className="flex flex-col h-[600px] w-full max-w-3xl mx-auto overflow-hidden p-0 border-t-4 border-t-accent">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent border border-accent/20">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-white rounded-full"></span>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Dev Planning Agent</h3>
            <p className="text-xs text-text-secondary">Prioritizing Infrastructure</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="px-3 py-2 text-text-secondary">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-background/50">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className="shrink-0">
              {msg.role === 'agent' ? (
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent border border-accent/20 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Bubble */}
            <div className={`relative max-w-[80%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-tr-sm' 
                : 'bg-white border border-border text-text-primary rounded-tl-sm'
            }`}>
              {msg.role === 'agent' && (
                <div className="absolute -top-3 -right-2 bg-white rounded-full shadow-sm border border-border flex p-1">
                  <button onClick={handleCopy} className="p-1 text-text-secondary hover:text-accent transition-colors">
                    {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
              
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content}
                {msg.isStreaming && (
                  <motion.span
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="inline-block w-1.5 h-4 ml-1 align-middle bg-accent"
                  />
                )}
              </div>
            </div>
          </motion.div>
        ))}
        
        {/* Suggested Prompts */}
        <div className="flex flex-wrap gap-2 pt-4">
          <span className="w-full text-xs text-text-secondary font-medium mb-1">Suggested Refinements:</span>
          <button className="text-xs px-3 py-1.5 rounded-full border border-border bg-white text-text-secondary hover:border-accent hover:text-accent transition-colors">
            Include budget estimates
          </button>
          <button className="text-xs px-3 py-1.5 rounded-full border border-border bg-white text-text-secondary hover:border-accent hover:text-accent transition-colors">
            Draft timeline for approval
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-border">
        <form 
          onSubmit={handleSubmit}
          className="relative flex items-center"
        >
          <button type="button" className="absolute left-3 text-text-secondary hover:text-primary transition-colors p-1">
             <Terminal className="w-5 h-5" />
          </button>
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Instruct the Planning Agent..." 
            className="pl-12 pr-14 py-4 rounded-full bg-slate-50 border-transparent focus:bg-white focus:border-accent shadow-inner text-sm" 
          />
          <button 
            type="submit" 
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent/90 transition-colors shadow-md"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
        <div className="text-center mt-2">
          <span className="text-[10px] text-text-secondary">AI outputs can be inaccurate. Always verify government data manually.</span>
        </div>
      </div>
    </Card>
  );
};
