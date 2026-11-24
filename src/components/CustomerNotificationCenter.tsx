import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { api } from '../services/api';

type Notice = { id: string; orderId: string; title: string; message: string; timestamp: string; read: boolean };

export const CustomerNotificationCenter: React.FC<{ onOpenOrder: (orderId: string) => void }> = ({ onOpenOrder }) => {
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const response = await api.getCustomerNotifications();
      setItems(response.notifications || []);
      setError('');
    } catch {
      // Keep existing notifications on transient network errors.
      setError('Notifications could not be refreshed.');
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 10000);
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  const unread = items.filter(item => !item.read).length;
  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      await api.markCustomerNotificationsRead(ids);
      setItems(prev => prev.map(item => ids.includes(item.id) ? { ...item, read: true } : item));
      setError('');
    } catch {
      setError('Could not save read status. Please retry.');
    }
  };
  return (
    <div className="relative">
      <button type="button" onClick={() => { setOpen(v => !v); void refresh(); }}
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        className="relative px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 flex items-center gap-2 text-xs font-semibold">
        <Bell className="w-4 h-4" /> <span className="hidden sm:inline">Notifications</span>
        {unread > 0 && <span className="rounded-full bg-amber-500 text-black text-[10px] px-1.5 py-0.5 font-bold">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div role="region" aria-label="Customer notifications" className="absolute right-0 top-full mt-2 z-50 w-[min(90vw,380px)] max-h-[440px] overflow-y-auto rounded-2xl border border-amber-500/25 bg-[#171719] shadow-2xl p-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-bold text-sm text-white">Notifications</h3>
            <div className="flex gap-2">
              <button type="button" onClick={() => void markRead(items.filter(n => !n.read).map(n => n.id))} className="text-xs text-amber-400 flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5" /> Mark all read</button>
              <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          </div>
          {error && <p role="alert" className="text-xs text-red-300 mb-2">{error}</p>}
          {items.length === 0 ? <p className="text-xs text-zinc-400 py-5 text-center">No notifications yet.</p> :
            <div className="space-y-1.5">
              {items.map(item => (
                <button type="button" key={item.id}
                  onClick={() => { void markRead([item.id]); onOpenOrder(item.orderId); setOpen(false); }}
                  className={`w-full text-left rounded-xl p-3 border transition-colors ${item.read ? 'bg-zinc-900/60 border-zinc-800' : 'bg-amber-500/10 border-amber-500/25'}`}>
                  <span className="flex justify-between gap-2 text-xs font-semibold text-zinc-100"><span>{item.title}</span>{!item.read && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}</span>
                  <span className="block text-[11px] text-amber-400 mt-1">{item.orderId}</span>
                  <span className="block text-xs text-zinc-400 mt-1">{item.message}</span>
                  <span className="block text-[10px] text-zinc-500 mt-1">{Number.isFinite(Date.parse(item.timestamp)) ? new Date(item.timestamp).toLocaleString() : ''}</span>
                </button>
              ))}
            </div>}
        </div>
      )}
    </div>
  );
};
