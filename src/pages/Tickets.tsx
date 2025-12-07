import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { useTitle } from '../hooks/useTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { 
  Ticket as TicketIcon, Plus, 
  MessageSquare, Clock, CheckCircle, XCircle, 
  AlertCircle, Loader2, ChevronRight, Send, 
  FileText, History, Image as ImageIcon,
  ShieldCheck, ArrowLeft
} from 'lucide-react';
import clsx from 'clsx';
import { Ticket, TicketLog, CreateTicketDTO } from '../types/ticket';
import { SERVER_NAMES } from '../utils/servers';

const TicketStatusBadge = ({ status }: { status: string }) => {
  const styles = {
    open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    resolved: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
  };

  const labels = {
    open: "待受理",
    in_progress: "处理中",
    resolved: "已解决",
    rejected: "已驳回"
  };

  return (
    <span className={clsx(
      "px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 w-fit",
      styles[status as keyof typeof styles] || styles.open
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status as keyof typeof labels] || status}
    </span>
  );
};

const ImageUpload = ({ onUploadComplete, disabled }: { onUploadComplete: (url: string) => void, disabled?: boolean }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert('请上传有效的图片文件');
        return;
      }
      
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch('https://img-api.kuke.ink/raw', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('上传失败');
        }

        const imageUrl = await response.text();
        onUploadComplete(imageUrl);
      } catch (err) {
        alert('图片上传失败，请稍后重试');
        console.error(err);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || disabled}
        className="p-3 text-slate-400 hover:text-brand-500 transition-colors rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
        title="上传图片"
      >
        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
      </button>
    </>
  );
};


const getWsUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_BASE || 'https://api.kuke.ink';
  const protocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
  const host = baseUrl.replace(/^https?:\/\//, '');
  const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;
  return `${protocol}://${cleanHost}${path}`;
};

const TicketCenter = () => {
  useTitle('工单中心 - KukeMC');
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerUuid, setPlayerUuid] = useState<string | null>(null);
  
  // Support Status
  const [isSupportOnline, setIsSupportOnline] = useState(false);
  const [onlineAdmins, setOnlineAdmins] = useState<string[]>([]);
  const [isAdminActive, setIsAdminActive] = useState(false);

  // Global WS
  useEffect(() => {
    const url = getWsUrl('/api/feedback/ws/global');
    const ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'support_status') {
          setIsSupportOnline(data.online);
          if (data.admins) setOnlineAdmins(data.admins);
        }
      } catch (e) { console.error(e); }
    };
    return () => ws.close();
  }, []);

  // Admin Heartbeat
  useEffect(() => {
    if (user?.role === 'admin' && isAdminActive) {
      const interval = setInterval(() => {
        api.post('/api/feedback/support/heartbeat');
      }, 60000);
      api.post('/api/feedback/support/heartbeat');
      return () => clearInterval(interval);
    }
  }, [isAdminActive, user]);

  const toggleAdminStatus = async () => {
      const newState = !isAdminActive;
      setIsAdminActive(newState);
      if (newState) {
          await api.post('/api/feedback/support/heartbeat');
      } else {
          await api.post('/api/feedback/support/offline');
      }
  };

  // Detail View State
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketDetail, setTicketDetail] = useState<{ item: Ticket, logs: TicketLog[] } | null>(null);

  // Chat WS
  const wsRef = useRef<WebSocket | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!selectedTicketId) return;
    const ws = new WebSocket(getWsUrl(`/api/feedback/ws/chat/${selectedTicketId}`));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_comment' && data.ticket_id === selectedTicketId) {
             setTicketDetail(prev => {
                 if (!prev) return null;
                 // Remove matching temp logs (optimistic UI)
                 const cleanLogs = prev.logs.filter(l => {
                     const isTemp = l.id > 1000000000000; // Timestamp based ID
                     if (isTemp && l.actor === data.log.actor && l.message === data.log.message) return false;
                     return true;
                 });
                 // Dedup real logs
                 if (cleanLogs.some(l => l.id === data.log.id)) return prev;
                 return { ...prev, logs: [...cleanLogs, data.log] };
             });
             if (data.log.actor === typingUser) setTypingUser(null);
        } else if (data.type === 'status_change' && data.ticket_id === selectedTicketId) {
             setTicketDetail(prev => prev ? ({ ...prev, item: { ...prev.item, status: data.status }, logs: [...prev.logs, data.log] }) : null);
             setTickets(prev => prev.map(t => t.id === selectedTicketId ? { ...t, status: data.status } : t));
        } else if (data.type === 'assign' && data.ticket_id === selectedTicketId) {
             setTicketDetail(prev => prev ? ({ ...prev, item: { ...prev.item, resolver: data.resolver }, logs: [...prev.logs, data.log] }) : null);
        } else if (data.type === 'typing' && data.ticket_id === selectedTicketId) {
            if (data.user !== user?.username) {
                setTypingUser(data.user);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
            }
        }
      } catch (e) { console.error(e); }
    };
    return () => {
        ws.close();
        wsRef.current = null;
    };
  }, [selectedTicketId, user]); // Removed typingUser from deps to avoid re-bind

  const [detailLoading, setDetailLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTicketDTO>({
    player_name: '',
    player_uuid: '',
    description: '',
    server: '',
    contact: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchUserInfo();
      fetchTickets();
    }
  }, [user]);

  // Auto-select ticket from URL param
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam && !selectedTicketId) {
      const id = parseInt(idParam);
      if (!isNaN(id)) {
        fetchTicketDetail(id);
      }
    }
  }, [searchParams, selectedTicketId]);

  const fetchUserInfo = async () => {
    if (!user) return;
    try {
      const res = await api.get('/api/playtime/player/details', { 
        params: { name: user.username } 
      });
      if (res.data && res.data.uuid) {
        setPlayerUuid(res.data.uuid);
        setCreateForm(prev => ({
          ...prev,
          player_name: user.username,
          player_uuid: res.data.uuid
        }));
      }
    } catch (err) {
      console.error("Failed to fetch UUID", err);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      // Fetch tickets by player name
      const res = await api.get('/api/feedback/list', {
        params: {
          player_name: user?.username,
          per_page: 50 // Load enough for now
        }
      });
      if (res.data.ok) {
        setTickets(res.data.items);
      }
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetail = async (id: number) => {
    setDetailLoading(true);
    setSelectedTicketId(id);
    try {
      const res = await api.get(`/api/feedback/detail/${id}`);
      if (res.data.ok) {
        setTicketDetail(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch detail", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.description.trim()) return;
    if (!playerUuid) {
      alert("无法获取您的UUID，请稍后重试或联系管理员");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...createForm,
        player_uuid: playerUuid
      };
      const res = await api.post('/api/feedback/create', payload);
      if (res.data.ok) {
        setIsCreateOpen(false);
        setCreateForm({ ...createForm, description: '', server: '', contact: '' });
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const lastTypingTime = useRef(0);
  const handleTyping = (value: string) => {
      setReplyContent(value);
      const now = Date.now();
      if (now - lastTypingTime.current > 2000 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'typing', user: user?.username }));
          lastTypingTime.current = now;
      }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!replyContent.trim() || !selectedTicketId) return;

    // Optimistic Update
    const tempId = Date.now();
    const tempLog: TicketLog = {
        id: tempId,
        ticket_id: selectedTicketId,
        actor: user.username,
        action: 'comment',
        message: replyContent,
        created_at: new Date().toISOString()
    };
    
    setTicketDetail(prev => prev ? ({ ...prev, logs: [...prev.logs, tempLog] }) : null);
    const contentToSend = replyContent;
    setReplyContent('');

    // Send via WS (as requested)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'comment', message: contentToSend, user: user.username }));
    }

    try {
      await api.post('/api/feedback/comment', {
        ticket_id: selectedTicketId,
        message: contentToSend,
        user: user.username,
        player_name: user.username
      });
      // Success - WS will handle sync
    } catch (err: any) {
      // Revert on failure
      setTicketDetail(prev => prev ? ({ ...prev, logs: prev.logs.filter(l => l.id !== tempId) }) : null);
      setReplyContent(contentToSend);
      alert(err.response?.data?.detail || "回复失败");
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicketId || !user) return;
    try {
      const res = await api.post('/api/feedback/status', {
        ticket_id: selectedTicketId,
        status: status,
        user: user.username
      });
      if (res.data.ok) {
        // WS will update detail
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "状态更新失败");
    }
  };

  const handleAssign = async () => {
    if (!selectedTicketId || !user) return;
    try {
      const res = await api.post('/api/feedback/assign', {
        ticket_id: selectedTicketId,
        resolver: user.username,
        user: user.username
      });
      if (res.data.ok) {
        // WS will update detail
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "分配失败");
    }
  };

  const filteredTickets = tickets.filter(t => 
    statusFilter === 'all' ? true : t.status === statusFilter
  );

  const logsContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTo({
        top: logsContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [ticketDetail?.logs]);

  const formatLogMessage = (message: string) => {
    try {
      const json = JSON.parse(message);
      if (json && typeof json === 'object') {
        if (json.contact) return `联系方式: ${json.contact}`;
        if (json.resolver) return `分配给: ${json.resolver}`;
        if (json.status) {
           const statusMap: any = { open: '待受理', in_progress: '处理中', resolved: '已解决', rejected: '已驳回' };
           return `状态更新为: ${statusMap[json.status] || json.status}`;
        }
        return message; // Fallback if JSON structure is unknown
      }
    } catch (e) {
      // Not JSON, return as is
    }
    return message;
  };

  if (!user) {
    return (
       <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4">
         <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center max-w-md w-full">
            <TicketIcon size={48} className="mx-auto text-slate-400 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">需要登录</h2>
            <p className="text-slate-500 mb-6">请先登录以查看和管理您的工单。</p>
            <a href="/login" className="inline-block px-6 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors">
              立即登录
            </a>
         </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <TicketIcon className="text-brand-500" size={32} />
              工单中心
            </h1>
            <p className="text-slate-500 mt-2">
              遇到问题？提交工单，我们将尽快为您解决。
            </p>
          </div>
          {user?.role === 'admin' && (
            <div className="flex flex-col items-end">
                <button
                onClick={toggleAdminStatus}
                className={clsx(
                    "px-4 py-2 rounded-xl font-medium shadow-lg transition-all flex items-center gap-2 w-fit mr-2",
                    isAdminActive 
                    ? "bg-green-500 hover:bg-green-600 text-white shadow-green-500/20" 
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                )}
                >
                {isAdminActive ? <CheckCircle size={20} /> : <Clock size={20} />}
                {isAdminActive ? "客服在线" : "客服离线"}
                </button>
                {onlineAdmins.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1 mr-2">
                        在线: {onlineAdmins.join(', ')}
                    </div>
                )}
            </div>
          )}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2 w-fit"
          >
            <Plus size={20} />
            提交新工单
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-240px)] min-h-[600px]">
          
          {/* Ticket List Column */}
          <div className={clsx(
            "lg:col-span-1 flex flex-col bg-white/80 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden",
            selectedTicketId ? "hidden lg:flex" : "flex"
          )}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {['all', 'open', 'in_progress', 'resolved', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    statusFilter === status 
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white" 
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  {status === 'all' ? '全部' : 
                   status === 'open' ? '待受理' :
                   status === 'in_progress' ? '处理中' :
                   status === 'resolved' ? '已解决' : '已驳回'}
                </button>
              ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-brand-500" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <FileText size={32} className="mx-auto mb-3 opacity-50" />
                  暂无工单
                </div>
              ) : (
                filteredTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => fetchTicketDetail(ticket.id)}
                    className={clsx(
                      "group p-4 rounded-xl border cursor-pointer transition-all duration-200",
                      selectedTicketId === ticket.id
                        ? "bg-brand-50 dark:bg-brand-900/20 border-brand-500 dark:border-brand-500 ring-1 ring-brand-500"
                        : "bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-xs text-slate-400">#{ticket.id}</span>
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                    <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1 mb-1">
                      {ticket.description}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                         <Clock size={12} />
                         {new Date(ticket.updated_at).toLocaleDateString()}
                      </span>
                      <ChevronRight size={14} className={clsx("transition-transform", selectedTicketId === ticket.id && "translate-x-1 text-brand-500")} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail Column */}
          <div className={clsx(
            "lg:col-span-2 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-col relative",
            selectedTicketId ? "flex" : "hidden lg:flex"
          )}>
            {detailLoading ? (
               <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10">
                 <Loader2 size={40} className="animate-spin text-brand-500" />
               </div>
            ) : !ticketDetail ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <MessageSquare size={48} className="mb-4 opacity-50" />
                <p>选择左侧工单查看详情</p>
              </div>
            ) : (
              <>
                {/* Detail Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50">
                  <div className="flex items-center gap-3 mb-4">
                    <button 
                      onClick={() => setSelectedTicketId(null)}
                      className="lg:hidden mr-1 p-1.5 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex-1">
                      工单 #{ticketDetail.item.id}
                    </h2>
                    <TicketStatusBadge status={ticketDetail.item.status} />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-500 text-xs mb-1">服务器</div>
                      <div className="font-medium dark:text-slate-200">{SERVER_NAMES[ticketDetail.item.server || ''] || ticketDetail.item.server || '-'}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-500 text-xs mb-1">创建时间</div>
                      <div className="font-medium dark:text-slate-200">{new Date(ticketDetail.item.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-500 text-xs mb-1">联系方式</div>
                      <div className="font-medium dark:text-slate-200 truncate" title={ticketDetail.item.contact || ''}>{ticketDetail.item.contact || '-'}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-slate-500 text-xs mb-1">受理人</div>
                      <div className="font-medium dark:text-slate-200">{ticketDetail.item.resolver || '暂无'}</div>
                    </div>
                  </div>

                  {!isSupportOnline && (
                    <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-xl text-sm flex items-center justify-center gap-2 border border-amber-100 dark:border-amber-800/30">
                        <Clock size={16} />
                        <span>暂无管理在线，请耐心等待，如有急事联系腐竹</span>
                    </div>
                  )}

                  <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                     <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wider">问题描述</h3>
                     <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                       {ticketDetail.item.description}
                     </p>
                  </div>

                  {user?.role === 'admin' && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">管理操作:</div>
                      
                      {/* Assign to me */}
                      {ticketDetail.item.resolver !== user.username && (
                        <button
                          onClick={handleAssign}
                          className="px-3 py-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <ShieldCheck size={14} />
                          受理此工单
                        </button>
                      )}

                      <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />

                      {/* Status Actions */}
                      {['open', 'in_progress', 'resolved', 'rejected'].map(status => {
                        if (status === ticketDetail.item.status) return null;
                        
                        const labels: Record<string, string> = {
                          open: '重置为待受理',
                          in_progress: '标记为处理中',
                          resolved: '标记为已解决',
                          rejected: '驳回工单'
                        };
                        
                        const colors: Record<string, string> = {
                          open: 'text-slate-600 bg-slate-100 hover:bg-slate-200',
                          in_progress: 'text-blue-600 bg-blue-100 hover:bg-blue-200',
                          resolved: 'text-green-600 bg-green-100 hover:bg-green-200',
                          rejected: 'text-red-600 bg-red-100 hover:bg-red-200'
                        };

                        return (
                          <button
                            key={status}
                            onClick={() => handleUpdateStatus(status)}
                            className={clsx(
                              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                              colors[status]
                            )}
                          >
                            {labels[status]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Conversation Logs */}
                <div ref={logsContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-black/20">
                  {ticketDetail.logs.map((log, index) => {
                    const isMe = user && log.actor === user.username;
                    const isSystem = ['assign', 'update_status', 'create'].includes(log.action);
                    
                    if (log.action === 'create') {
                         return (
                            <div key={log.id} className="flex justify-center">
                                <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-3 py-1 rounded-full">
                                    工单创建于 {new Date(log.created_at).toLocaleString()}
                                </div>
                            </div>
                         );
                    }

                    if (isSystem) {
                      return (
                        <div key={log.id} className="flex justify-center">
                           <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-3 py-1 rounded-full flex items-center gap-2">
                             <History size={12} />
                             <span>
                               <span className="font-bold">{log.actor}</span> 
                               {log.action === 'assign' ? ' 分配给了 ' : ' 更新状态为 '}
                               <span className="font-bold">
                                 {log.action === 'assign' ? JSON.parse(log.message).resolver : 
                                  (JSON.parse(log.message).status === 'open' ? '待受理' :
                                   JSON.parse(log.message).status === 'in_progress' ? '处理中' :
                                   JSON.parse(log.message).status === 'resolved' ? '已解决' : '已驳回')}
                               </span>
                             </span>
                             <span className="opacity-60">{new Date(log.created_at).toLocaleString()}</span>
                           </div>
                        </div>
                      );
                    }

                    const formattedMessage = formatLogMessage(log.message);
                    
                    // Grouping Logic
                    const prevLog = ticketDetail.logs[index - 1];
                    const isSameUser = prevLog && prevLog.actor === log.actor && prevLog.action === 'comment' && !['assign', 'update_status', 'create'].includes(prevLog.action);

                    return (
                      <div key={log.id} className={clsx("flex gap-3 w-full", isMe ? "flex-row-reverse" : "", isSameUser ? "mt-1" : "mt-4")}>
                         <div className={clsx(
                           "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm bg-slate-200",
                           isSameUser ? "invisible" : ""
                         )}>
                           <img 
                                src={`https://minotar.net/helm/${log.actor}/32`} 
                                alt={log.actor}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${log.actor}&background=random`;
                                }}
                           />
                         </div>
                         <div className={clsx("max-w-[80%] min-w-0 flex flex-col", isMe ? "items-end" : "items-start")}>
                           {!isSameUser && (
                               <div className={clsx("text-xs text-slate-500 mb-1 ml-1 flex items-center gap-1.5", isMe ? "mr-1 justify-end" : "ml-1 justify-start")}>
                                 <span className="font-medium">{log.actor}</span>
                                 {log.actor !== ticketDetail.item.player_name && (
                                   <span className="bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 font-medium border border-brand-200 dark:border-brand-800">
                                     <ShieldCheck size={10} />
                                     管理员
                                   </span>
                                 )}
                               </div>
                           )}
                           <div className={clsx(
                             "p-3 rounded-2xl text-sm shadow-sm break-words whitespace-pre-wrap w-fit",
                             isMe ? "bg-brand-500 text-white rounded-tr-none" : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none"
                           )}>
                             {formattedMessage}
                           </div>
                           <div className={clsx("text-xs text-slate-400 mt-1", isMe ? "text-right" : "text-left")}>
                             {new Date(log.created_at).toLocaleString()}
                           </div>
                         </div>
                      </div>
                    );
                  })}
                  
                  {typingUser && (
                      <div className="flex gap-3 w-full mt-4">
                           <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm bg-slate-200">
                                <img src={`https://minotar.net/helm/${typingUser}/32`} className="w-full h-full" />
                           </div>
                           <div className="flex flex-col items-start">
                                <div className="text-xs text-slate-500 mb-1 ml-1 font-medium">{typingUser}</div>
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none text-slate-500 text-sm flex items-center gap-2">
                                     <Loader2 size={14} className="animate-spin" />
                                     正在输入...
                                </div>
                           </div>
                      </div>
                  )}
                </div>

                {/* Reply Input */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                  <form onSubmit={handleReply} className="relative">
                    <div className={clsx(
                      "flex items-end gap-2 p-2 rounded-2xl transition-all border",
                      "bg-slate-50 dark:bg-slate-950",
                      "border-slate-200 dark:border-slate-800",
                      "focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10"
                    )}>
                      <div className="flex-shrink-0 mb-[2px]">
                          <ImageUpload 
                             onUploadComplete={(url) => setReplyContent(prev => prev + (prev ? '\n' : '') + `![图片](${url})`)} 
                             disabled={ticketDetail.item.status === 'resolved' || ticketDetail.item.status === 'rejected'}
                          />
                      </div>
                      
                      <textarea
                          value={replyContent}
                          onChange={(e) => handleTyping(e.target.value)}
                          placeholder={(ticketDetail.item.status === 'resolved' || ticketDetail.item.status === 'rejected') ? "此工单已结束，如有新问题请提交新工单" : "输入回复内容..."}
                          disabled={ticketDetail.item.status === 'resolved' || ticketDetail.item.status === 'rejected'}
                          rows={1}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleReply(e);
                              }
                          }}
                          className="flex-1 bg-transparent border-none focus:ring-0 outline-none p-3 min-h-[48px] max-h-[200px] resize-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 leading-relaxed"
                          style={{ height: 'auto', overflow: 'hidden' }} 
                          onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = Math.min(target.scrollHeight, 200) + 'px';
                              target.style.overflowY = target.scrollHeight > 200 ? 'auto' : 'hidden';
                          }}
                       />

                      <button
                        type="submit"
                        disabled={!replyContent.trim()}
                        className={clsx(
                          "p-3 rounded-xl flex-shrink-0 transition-all mb-[2px]",
                          !replyContent.trim()
                            ? "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                            : "bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20 active:scale-95"
                        )}
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence mode="wait">
        {isCreateOpen && (
          <ModalPortal>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCreateOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-[2001] pointer-events-none p-4"
            >
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-2xl shadow-black/20 pointer-events-auto overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800">
                <div className="p-6 pb-2 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TicketIcon className="text-brand-500" />
                      提交工单
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">请详细描述您遇到的问题，我们将尽快为您处理</p>
                  </div>
                  <button 
                    onClick={() => setIsCreateOpen(false)} 
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
                
                <form onSubmit={handleCreateSubmit} className="p-6 pt-4 space-y-6 overflow-y-auto">
                  {!playerUuid && (
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl text-sm flex items-center gap-2">
                      <AlertCircle size={16} />
                      正在获取您的玩家信息...
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      选择服务器
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {Object.entries(SERVER_NAMES)
                        .filter(([key]) => key !== 'all')
                        .map(([key, name]) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setCreateForm({...createForm, server: key})}
                          className={clsx(
                            "px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-200",
                            createForm.server === key 
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 shadow-sm ring-2 ring-brand-500/20"
                              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-700"
                          )}
                        >
                          {name}
                        </button>
                      ))}
                      <button
                         type="button"
                         onClick={() => setCreateForm({...createForm, server: 'other'})}
                         className={clsx(
                            "px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-200",
                            createForm.server === 'other'
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 shadow-sm ring-2 ring-brand-500/20"
                              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-700"
                         )}
                      >
                        其他
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      联系方式 (QQ/邮箱)
                    </label>
                    <input
                      type="text"
                      value={createForm.contact || ''}
                      onChange={e => setCreateForm({...createForm, contact: e.target.value})}
                      placeholder="方便我们在离线时联系您（选填）"
                      className="w-full rounded-xl border-transparent bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-950 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all py-3 px-4 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      问题描述 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                        <textarea
                          required
                          value={createForm.description}
                          onChange={e => setCreateForm({...createForm, description: e.target.value})}
                          rows={8}
                          placeholder="请详细描述您遇到的问题..."
                          className="w-full rounded-xl border-transparent bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-950 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all p-4 pb-12 text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
                        />
                        <div className="absolute left-3 bottom-3">
                            <ImageUpload onUploadComplete={(url) => setCreateForm(prev => ({ ...prev, description: prev.description + (prev.description ? '\n' : '') + `![图片](${url})` }))} />
                        </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-6 py-3 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors font-bold text-sm"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !playerUuid}
                      className="px-8 py-3 bg-gradient-to-r from-brand-500 to-blue-500 text-white rounded-xl hover:shadow-lg hover:shadow-brand-500/25 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none transition-all flex items-center gap-2 font-bold text-sm"
                    >
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      提交工单
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>
    </div>
  );
};

// Create a wrapper component for the portal
const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
};

export default TicketCenter;
