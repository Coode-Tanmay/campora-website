import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Send, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

type ChatMessage = { id: string; senderRole: 'customer' | 'admin'; senderName: string; message: string; createdAt: string };

export const OrderSupportChat: React.FC<{ orderId: string; admin?: boolean }> = ({ orderId, admin = false }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const response = await api.getOrderMessages(orderId, admin);
      setMessages(response.messages || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not load this conversation.');
    } finally {
      setLoading(false);
    }
  }, [orderId, admin]);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 8000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await api.sendOrderMessage(orderId, message, admin);
      setMessages(response.messages || []);
      setDraft('');
    } catch (err: any) {
      setError(err.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="mt-5 rounded-xl border border-amber-500/20 bg-zinc-950/70 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><MessageCircle className="w-4 h-4 text-amber-400" /> Order support chat</h3>
        <button type="button" onClick={() => void refresh()} aria-label="Refresh messages" className="text-zinc-400 hover:text-white"><RefreshCw className="w-3.5 h-3.5" /></button>
      </div>
      <div className="max-h-64 min-h-20 overflow-y-auto space-y-2 pr-1" aria-live="polite">
        {loading ? <p className="text-xs text-zinc-500">Loading conversation…</p> : messages.length === 0 ? <p className="text-xs text-zinc-500">No messages yet. Send a message to contact {admin ? 'the customer' : 'CAMPORA support'} about this order.</p> :
          messages.map(item => {
            const own = admin ? item.senderRole === 'admin' : item.senderRole === 'customer';
            return <div key={item.id} className={`max-w-[90%] rounded-xl px-3 py-2 ${own ? 'ml-auto bg-amber-500/10 border border-amber-500/20' : 'mr-auto bg-zinc-900 border border-zinc-800'}`}>
              <div className="flex gap-2 justify-between text-[10px] text-zinc-400"><span>{own ? 'You' : item.senderName}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div>
              <p className="text-xs text-zinc-200 whitespace-pre-wrap break-words mt-1">{item.message}</p>
            </div>;
          })}
      </div>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <form onSubmit={send} className="flex items-end gap-2">
        <textarea value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} rows={2} placeholder="Write a message about this order…" className="min-w-0 flex-1 resize-y rounded-lg bg-zinc-900 border border-zinc-700 p-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500" />
        <button type="submit" disabled={!draft.trim() || sending} className="shrink-0 rounded-lg bg-amber-500 px-3 py-2.5 text-black text-xs font-bold disabled:opacity-40 flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Send</button>
      </form>
      <p className="text-[10px] text-zinc-500">Messages are visible to the customer and CAMPORA administrators for this order.</p>
    </section>
  );
};
