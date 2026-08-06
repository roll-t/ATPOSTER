'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatNumber, formatTime, formatDate } from '@/lib/format.js';

const getFriendlyError = (err) => {
  if (!err) return '';
  if (err.includes('Daily upload limit') || err.includes('giới hạn')) {
    return 'Kênh đạt giới hạn tải lên của YouTube';
  }
  if (err.includes('Timeout') || err.includes('locator') || err.includes('intercepts') || err.includes('waiting for')) {
    return 'Lỗi phản hồi trình duyệt (Timeout)';
  }
  if (err.includes('session') || err.includes('đăng nhập') || err.includes('login')) {
    return 'Lỗi phiên đăng nhập (Session)';
  }
  return err.length > 50 ? err.slice(0, 47) + '...' : err;
};

const getErrorTag = (err) => {
  if (!err) return { label: 'Không xác định', color: '#ffeaa7', bg: 'rgba(255, 234, 167, 0.15)', border: '1px solid rgba(255, 234, 167, 0.3)' };
  const lower = err.toLowerCase();
  if (lower.includes('daily upload limit') || lower.includes('limit reached') || lower.includes('giới hạn') || lower.includes('quota')) {
    return { 
      label: '🚫 Giới hạn (Upload Limit)', 
      color: '#ff7675', 
      bg: 'rgba(255, 118, 117, 0.15)', 
      border: '1px solid rgba(255, 118, 117, 0.3)' 
    };
  }
  if (lower.includes('session') || lower.includes('đăng nhập') || lower.includes('login') || lower.includes('signin') || lower.includes('cookie') || lower.includes('credentials')) {
    return { 
      label: '🔑 Đăng nhập (Auth Error)', 
      color: '#fdcb6e', 
      bg: 'rgba(253, 203, 110, 0.15)', 
      border: '1px solid rgba(253, 203, 110, 0.3)' 
    };
  }
  if (lower.includes('timeout') || lower.includes('navigation') || lower.includes('network') || lower.includes('waiting for') || lower.includes('timed out')) {
    return { 
      label: '🌐 Kết nối / Timeout', 
      color: '#00cec9', 
      bg: 'rgba(0, 206, 201, 0.15)', 
      border: '1px solid rgba(0, 206, 201, 0.3)' 
    };
  }
  if (lower.includes('file') || lower.includes('không tìm thấy video') || lower.includes('not found') || lower.includes('video file') || lower.includes('path')) {
    return { 
      label: '📁 Tệp Video (File Error)', 
      color: '#a29bfe', 
      bg: 'rgba(162, 155, 254, 0.15)', 
      border: '1px solid rgba(162, 155, 254, 0.3)' 
    };
  }
  if (lower.includes('element') || lower.includes('click') || lower.includes('locator') || lower.includes('selector') || lower.includes('button')) {
    return { 
      label: '🤖 Trình duyệt / DOM Error', 
      color: '#e84393', 
      bg: 'rgba(232, 67, 147, 0.15)', 
      border: '1px solid rgba(232, 67, 147, 0.3)' 
    };
  }
  return { 
    label: '⚠️ Lỗi Hệ Thống Khác', 
    color: '#fab1a0', 
    bg: 'rgba(250, 177, 160, 0.15)', 
    border: '1px solid rgba(250, 177, 160, 0.3)' 
  };
};

// Component hiển thị Avatar kênh đẹp mắt, tự động đổi sang dạng chữ cái đầu gradient nếu ảnh lỗi/trống
function ChannelAvatar({ acc }) {
  const [imgError, setImgError] = useState(false);
  const firstLetter = acc.label ? acc.label.charAt(0).toUpperCase() : 'Y';

  const gradients = [
    'linear-gradient(135deg, #FF5E36 0%, #FFAE33 100%)',
    'linear-gradient(135deg, #00F2FE 0%, #4FACFE 100%)',
    'linear-gradient(135deg, #F355DA 0%, #7000FF 100%)',
    'linear-gradient(135deg, #20E2D7 0%, #F9FEA5 100%)',
    'linear-gradient(135deg, #FF4757 0%, #FF6B81 100%)'
  ];

  const charCodeSum = acc.label ? acc.label.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0;
  const gradient = gradients[charCodeSum % gradients.length];

  if (acc.avatar && acc.avatar !== '/no-avatar.png' && !imgError) {
    return (
      <img
        src={acc.avatar}
        alt=""
        onError={() => setImgError(true)}
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          flexShrink: 0
        }}
      />
    );
  }

  return (
    <div style={{
      width: '38px',
      height: '38px',
      borderRadius: '50%',
      background: gradient,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      fontSize: '1.15rem',
      color: '#fff',
      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
      textShadow: '0 1px 3px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.15)',
      flexShrink: 0
    }}>
      {firstLetter}
    </div>
  );
}

// Biểu đồ mini (sparkline) hiển thị xu hướng lượt xem qua các lần đồng bộ gần nhất
function Sparkline({ history }) {
  const points = (history || []).map(h => h.views || 0);
  if (points.length < 2) {
    return <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa đủ dữ liệu</span>;
  }

  const width = 90;
  const height = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const rising = points[points.length - 1] >= points[0];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline
        points={coords}
        fill="none"
        stroke={rising ? '#2ed573' : '#ff4757'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const thStyle = { textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' };

export default function StatsPage() {
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [channelSyncStatus, setChannelSyncStatus] = useState(null);
  const [channelSyncMessage, setChannelSyncMessage] = useState('');
  const [isChannelSyncing, setIsChannelSyncing] = useState(false);

  const [postSyncStatus, setPostSyncStatus] = useState(null);
  const [postSyncMessage, setPostSyncMessage] = useState('');
  const [isPostSyncing, setIsPostSyncing] = useState(false);

  const [channelSearch, setChannelSearch] = useState('');
  const [channelSort, setChannelSort] = useState('views');
  const [growthFilter, setGrowthFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [postSearch, setPostSearch] = useState('');
  const [postSort, setPostSort] = useState('newest');
  const [postPage, setPostPage] = useState(1);

  const [queuePage, setQueuePage] = useState(1);
  const [failedPage, setFailedPage] = useState(1);
  const [failedSearch, setFailedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('queue');

  // Tải toàn bộ dữ liệu cần thiết cho trang thống kê hợp nhất
  const fetchData = async () => {
    try {
      const [accRes, channelSyncRes, postsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/accounts/sync-stats'),
        fetch('/api/posts') // API này cũng tự động trigger đăng bài đến lịch hẹn
      ]);
      const accData = await accRes.json();
      const channelSyncData = await channelSyncRes.json();
      const postsData = await postsRes.json();

      setAccounts(accData.accounts || []);
      setChannelSyncStatus(channelSyncData.syncStatus);
      setPosts(postsData.posts || []);
      setPostSyncStatus(postsData.syncStatus || null);

      setLoading(false);
    } catch (err) {
      console.error('Lỗi tải dữ liệu thống kê:', err);
    }
  };

  // Tự động cập nhật mỗi 5 giây (đồng thời giữ vai trò kích hoạt hàng đợi đăng bài đến lịch hẹn)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartChannelSync = async () => {
    setIsChannelSyncing(true);
    setChannelSyncMessage('');
    try {
      const res = await fetch('/api/accounts/sync-stats', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setChannelSyncMessage(data.message || 'Bắt đầu đồng bộ số liệu ngầm...');
        fetchData();
        setTimeout(() => setChannelSyncMessage(''), 5000);
      } else {
        alert(data.error || 'Lỗi khi đồng bộ.');
      }
    } catch (err) {
      alert('Không thể kết nối máy chủ.');
    } finally {
      setIsChannelSyncing(false);
    }
  };

  const handleStopChannelSync = async () => {
    if (!confirm('Bạn có chắc chắn muốn dừng quá trình đồng bộ số liệu các kênh?')) return;
    try {
      const res = await fetch('/api/accounts/sync-stats?action=stop', { method: 'POST' });
      if (res.ok) {
        setChannelSyncMessage('Đang yêu cầu dừng đồng bộ...');
        setTimeout(fetchData, 1000);
      } else {
        alert('Không thể dừng đồng bộ.');
      }
    } catch (err) {
      alert('Không thể kết nối máy chủ.');
    }
  };

  const handleStartPostSync = async () => {
    setIsPostSyncing(true);
    setPostSyncMessage('');
    try {
      const res = await fetch('/api/posts/sync-stats', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPostSyncMessage(data.message || 'Bắt đầu đồng bộ tương tác ngầm...');
        fetchData();
        setTimeout(() => setPostSyncMessage(''), 5000);
      } else {
        alert(data.error || 'Lỗi khi đồng bộ tương tác.');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setIsPostSyncing(false);
    }
  };

  const handleStopPostSync = async () => {
    if (!confirm('Bạn có chắc chắn muốn dừng quá trình đồng bộ tương tác đang chạy?')) return;
    try {
      const res = await fetch('/api/posts/sync-stats?action=stop', { method: 'POST' });
      if (res.ok) {
        setPostSyncMessage('Đang yêu cầu dừng đồng bộ...');
        setTimeout(fetchData, 1000);
      } else {
        alert('Không thể dừng đồng bộ.');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ.');
    }
  };

  const handleSyncSinglePost = async (postId) => {
    try {
      const res = await fetch(`/api/posts/sync-stats?id=${postId}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setPosts(prev => prev.map(p => (p.id === postId ? data.post : p)));
      } else {
        alert(data.error || 'Lỗi khi đồng bộ.');
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  // Thuật toán ước tính Điểm Hiệu Suất (%) của kênh dựa trên lượt xem trung bình/video.
  // Đây là chỉ số ước tính nội bộ, KHÔNG phải dữ liệu chính thức từ thuật toán đề xuất của YouTube.
  const getPerformanceScore = (views, videoCount) => {
    const avgViews = views / (videoCount || 1);
    if (avgViews <= 0) return 5;
    if (avgViews <= 10) {
      return Math.round(5 + (avgViews * 1));
    } else if (avgViews <= 100) {
      return Math.round(15 + ((avgViews - 10) * 0.28));
    } else if (avgViews <= 1000) {
      return Math.round(40 + ((avgViews - 100) * 0.039));
    } else {
      return Math.round(Math.min(98, 75 + ((avgViews - 1000) * 0.005)));
    }
  };

  // Tính toán số liệu tổng quan
  const totalSubscribers = accounts.reduce((sum, acc) => sum + (acc.subscribers || 0), 0);
  const totalChannelViews = accounts.reduce((sum, acc) => sum + (acc.views || 0), 0);
  const totalVideos = accounts.reduce((sum, acc) => sum + (acc.videoCount || 0), 0);

  const totalPosts = posts.length;
  const successPosts = posts.filter(p => p.status === 'success');
  const pendingCount = posts.filter(p => p.status === 'pending').length;
  const processingCount = posts.filter(p => p.status === 'processing').length;
  const failedCount = posts.filter(p => p.status === 'failed').length;

  // PHÂN TÍCH INSIGHTS TĂNG TRƯỞNG KÊNH
  const channelsAnalysis = useMemo(() => accounts.map(acc => {
    const subDelta = (acc.subscribers || 0) - (acc.prevSubscribers || acc.subscribers || 0);
    const viewDelta = (acc.views || 0) - (acc.prevViews || acc.views || 0);
    const videoDelta = (acc.videoCount || 0) - (acc.prevVideoCount || acc.videoCount || 0);
    const perfScore = getPerformanceScore(acc.views || 0, acc.videoCount || 0);

    let growthStatus = 'no_change';
    if (viewDelta > 50 || subDelta > 5) {
      growthStatus = 'strong';
    } else if (viewDelta > 0 || subDelta > 0) {
      growthStatus = 'light';
    }

    return { ...acc, subDelta, viewDelta, videoDelta, perfScore, growthStatus };
  }), [accounts]);

  // Danh sách danh mục kênh có sẵn (lấy từ dữ liệu tài khoản) để lọc
  const categories = useMemo(() => {
    const set = new Set();
    accounts.forEach(acc => {
      if (acc.category && acc.category.trim()) set.add(acc.category.trim());
    });
    return Array.from(set).sort();
  }, [accounts]);

  const visibleChannels = useMemo(() => {
    const term = channelSearch.trim().toLowerCase();
    let filtered = term
      ? channelsAnalysis.filter(c =>
          (c.label || '').toLowerCase().includes(term) ||
          (c.username || '').toLowerCase().includes(term) ||
          (c.email || '').toLowerCase().includes(term))
      : channelsAnalysis;

    if (growthFilter !== 'all') {
      filtered = filtered.filter(c => c.growthStatus === growthFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(c => (c.category || '').trim() === categoryFilter);
    }

    const sorted = [...filtered].sort((a, b) => {
      if (channelSort === 'subscribers') return (b.subscribers || 0) - (a.subscribers || 0);
      if (channelSort === 'videoCount') return (b.videoCount || 0) - (a.videoCount || 0);
      if (channelSort === 'perfScore') return b.perfScore - a.perfScore;
      if (channelSort === 'growth') return (b.viewDelta || 0) - (a.viewDelta || 0);
      return (b.views || 0) - (a.views || 0);
    });
    return sorted;
  }, [channelsAnalysis, channelSearch, channelSort, growthFilter, categoryFilter]);

  // Tìm kênh đề xuất cao nhất & tăng trưởng nhanh nhất
  let topPerformingChannel = null;
  let fastestGrowingChannel = null;

  if (channelsAnalysis.length > 0) {
    topPerformingChannel = [...channelsAnalysis].sort((a, b) => b.perfScore - a.perfScore)[0];
    const withPositiveGrowth = channelsAnalysis.filter(c => c.viewDelta > 0);
    if (withPositiveGrowth.length > 0) {
      fastestGrowingChannel = [...withPositiveGrowth].sort((a, b) => b.viewDelta - a.viewDelta)[0];
    }
  }

  // Top bài đăng nổi bật (5 video có lượt xem cao nhất)
  const topPosts = useMemo(() => {
    return [...successPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  }, [successPosts]);

  // Bảng hiệu suất bài đăng: chỉ tính các bài đã đăng thành công
  const visiblePosts = useMemo(() => {
    const term = postSearch.trim().toLowerCase();
    const filtered = successPosts.filter(p => {
      if (!term) return true;
      return (p.caption || '').toLowerCase().includes(term) || (p.accountLabel || '').toLowerCase().includes(term);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (postSort === 'views') return (b.views || 0) - (a.views || 0);
      if (postSort === 'likes') return (b.likes || 0) - (a.likes || 0);
      if (postSort === 'comments') return (b.comments || 0) - (a.comments || 0);
      return new Date(b.postedAt || b.createdAt) - new Date(a.postedAt || a.createdAt);
    });
    return sorted;
  }, [successPosts, postSearch, postSort]);

  const postsPerPage = 10;
  const totalPostPages = Math.max(1, Math.ceil(visiblePosts.length / postsPerPage));
  const paginatedPosts = visiblePosts.slice((postPage - 1) * postsPerPage, postPage * postsPerPage);

  // Hàng đợi / lịch sử đăng bài (trạng thái vận hành: hẹn giờ, đang đăng, thành công, lỗi)
  const queuePosts = useMemo(() => [...posts]
    .filter(p => p.status !== 'failed')
    .sort((a, b) => {
      const timeA = new Date(a.postedAt || a.scheduledAt || a.createdAt);
      const timeB = new Date(b.postedAt || b.scheduledAt || b.createdAt);
      return timeB - timeA;
    }), [posts]);

  const queuePerPage = 10;
  const totalQueuePages = Math.max(1, Math.ceil(queuePosts.length / queuePerPage));
  const paginatedQueue = queuePosts.slice((queuePage - 1) * queuePerPage, queuePage * queuePerPage);

  const failedPosts = useMemo(() => {
    let list = [...posts].filter(p => p.status === 'failed');
    if (failedSearch.trim()) {
      const q = failedSearch.toLowerCase();
      list = list.filter(p => 
        (p.caption && p.caption.toLowerCase().includes(q)) || 
        (p.accountLabel && p.accountLabel.toLowerCase().includes(q)) ||
        (p.error && p.error.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => {
      const timeA = new Date(a.postedAt || a.scheduledAt || a.createdAt);
      const timeB = new Date(b.postedAt || b.scheduledAt || b.createdAt);
      return timeB - timeA;
    });
  }, [posts, failedSearch]);

  const failedPerPage = 10;
  const totalFailedPages = Math.max(1, Math.ceil(failedPosts.length / failedPerPage));
  const paginatedFailed = failedPosts.slice((failedPage - 1) * failedPerPage, failedPage * failedPerPage);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div>
      {/* Tiêu đề trang */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
          Thống Kê <span className="gradient-text">Tổng Hợp</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Toàn bộ trạng thái hàng đợi, số liệu kênh và hiệu suất bài đăng ở một nơi duy nhất.
        </p>
      </div>

      {/* ========== TỔNG QUAN KÊNH ========== */}
      <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
        📡 Tổng Quan Kênh
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Số Kênh</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '8px', color: '#fff' }}>{accounts.length}</div>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Đăng Ký</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '8px', color: '#fff' }}>{formatNumber(totalSubscribers)}</div>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Lượt Xem Kênh</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '8px', color: '#fff' }}>{formatNumber(totalChannelViews)}</div>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid #ffb300' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Số Video</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '8px', color: '#fff' }}>{formatNumber(totalVideos)}</div>
        </div>
      </div>

      {/* ========== TỔNG QUAN BÀI ĐĂNG ========== */}
      <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
        🚀 Tổng Quan Bài Đăng
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Bài Đăng</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '8px', color: '#fff' }}>{totalPosts}</div>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid #10B981' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Thành Công</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '8px', color: '#10B981' }}>{successPosts.length}</div>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Đang Chờ / Đang Đăng</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '8px', color: '#fff' }}>{pendingCount + processingCount}</div>
        </div>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--danger)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Thất Bại</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '8px', color: 'var(--danger)' }}>{failedCount}</div>
        </div>
      </div>

      {/* ========== INSIGHTS ========== */}
      {accounts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>🔥 Phát Hiện Xu Hướng</h4>

            {topPerformingChannel && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '2rem' }}>🎯</div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Điểm hiệu suất cao nhất</div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#fff' }}>
                    {topPerformingChannel.label} <span style={{ color: 'var(--secondary)' }}>({topPerformingChannel.perfScore}%)</span>
                  </div>
                </div>
              </div>
            )}

            {fastestGrowingChannel ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '2rem' }}>⚡</div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tăng trưởng view nhanh nhất</div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#fff' }}>
                    {fastestGrowingChannel.label} <span style={{ color: 'var(--success)' }}>({formatNumber(fastestGrowingChannel.viewDelta)} views)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '2rem' }}>💤</div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tăng trưởng nhanh nhất</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa ghi nhận biến động tăng view trong phiên này</div>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>📊 Phân Loại Tăng Trưởng Kênh</h4>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Bấm vào một dòng để lọc bảng kênh bên dưới.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'strong', label: '🔥 Tăng trưởng mạnh', color: '#ff4757' },
                { key: 'light', label: '📈 Tăng trưởng nhẹ', color: '#2ed573' },
                { key: 'no_change', label: '➖ Không biến động', color: 'var(--text-muted)' }
              ].map(row => {
                const isActive = growthFilter === row.key;
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => setGrowthFilter(isActive ? 'all' : row.key)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.88rem',
                      background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                      border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                      borderRadius: '8px',
                      padding: '6px 8px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: row.color, fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontWeight: 800, color: '#fff' }}>{channelsAnalysis.filter(c => c.growthStatus === row.key).length} kênh</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>🏆 Top Bài Đăng Nổi Bật</h4>
            {topPosts.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có bài đăng thành công nào có lượt xem.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topPosts.map((post, idx) => (
                  <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', width: '18px' }}>#{idx + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {post.videoUrl ? (
                          <a
                            href={post.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Click để xem video trực tiếp"
                            style={{ color: '#fff', textDecoration: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--secondary)'}
                            onMouseLeave={e => e.currentTarget.style.color = '#fff'}
                          >
                            🔗 {post.caption || '(Không có caption)'}
                          </a>
                        ) : (
                          post.caption || '(Không có caption)'
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{post.accountLabel}</div>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', flexShrink: 0 }}>
                      👁️ {formatNumber(post.views)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== TAB BAR NAVIGATOR ========== */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '6px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        width: 'max-content'
      }}>
        <button
          onClick={() => setActiveTab('queue')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'queue' ? 'linear-gradient(135deg, var(--secondary), var(--primary))' : 'transparent',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: '0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🗂️ Hàng Đợi & Lịch Sử ({queuePosts.length})
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'channels' ? 'linear-gradient(135deg, var(--secondary), var(--primary))' : 'transparent',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: '0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📈 Hiệu Suất Kênh ({visibleChannels.length})
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'posts' ? 'linear-gradient(135deg, var(--secondary), var(--primary))' : 'transparent',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: '0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📊 Hiệu Suất Bài Đăng ({visiblePosts.length})
        </button>
        <button
          onClick={() => setActiveTab('failed')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'failed' ? 'linear-gradient(135deg, var(--secondary), var(--primary))' : 'transparent',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: '0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ❌ Bài Đăng Thất Bại ({failedPosts.length})
        </button>
      </div>

      {activeTab === 'queue' && (
        /* ========== HÀNG ĐỢI / LỊCH SỬ ĐĂNG BÀI ========== */
        <div className="glass-card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>🗂️ Hàng Đợi / Lịch Sử Đăng Bài ({queuePosts.length})</h3>

          {totalQueuePages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setQueuePage(prev => Math.max(prev - 1, 1))}
                disabled={queuePage === 1}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', opacity: queuePage === 1 ? 0.4 : 1 }}
              >
                ◀
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Trang {queuePage} / {totalQueuePages}
              </span>
              <button
                onClick={() => setQueuePage(prev => Math.min(prev + 1, totalQueuePages))}
                disabled={queuePage === totalQueuePages}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', opacity: queuePage === totalQueuePages ? 0.4 : 1 }}
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {queuePosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.5 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="9" x2="15" y2="9"></line>
              <line x1="9" y1="13" x2="15" y2="13"></line>
              <line x1="9" y1="17" x2="11" y2="17"></line>
            </svg>
            <p>Chưa có lịch sử đăng bài nào được lưu.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Mã bài đăng</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Kênh</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Caption</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Lịch hẹn / Đăng lúc</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueue.map((post) => (
                  <tr key={post.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '16px', fontWeight: 600, fontSize: '0.9rem' }}>{post.id}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="badge" style={{
                            background: post.platform === 'youtube' ? 'rgba(255, 71, 87, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: post.platform === 'youtube' ? '#ff4757' : '#fff',
                            border: post.platform === 'youtube' ? '1px solid rgba(255, 71, 87, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '1px 4px',
                            fontSize: '0.65rem'
                          }}>
                            {post.platform === 'youtube' ? 'YT' : 'TT'}
                          </span>
                          <span style={{ fontWeight: 600 }}>{post.accountLabel}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{post.platform === 'youtube' ? '' : '@'}{post.accountUsername}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                      {post.status === 'success' && post.videoUrl ? (
                        <a
                          href={post.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Click để xem video trực tiếp"
                          style={{ color: 'var(--secondary)', textDecoration: 'none', fontWeight: 500 }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                          🔗 {post.caption}
                        </a>
                      ) : (
                        post.caption
                      )}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {post.status === 'success'
                        ? new Date(post.postedAt).toLocaleString('vi-VN')
                        : new Date(post.scheduledAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span className={`badge badge-${post.status}`}>
                          {post.status === 'pending' && 'Hẹn giờ'}
                          {post.status === 'processing' && 'Đang tải lên...'}
                          {post.status === 'success' && 'Thành công'}
                          {post.status === 'failed' && 'Lỗi'}
                        </span>
                        {post.status === 'failed' && post.error && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--danger)',
                              maxWidth: '220px',
                              wordBreak: 'break-word',
                              display: 'inline-block',
                              marginTop: '2px',
                              lineHeight: '1.2',
                              cursor: 'help'
                            }}
                            title={post.error}
                          >
                            {getFriendlyError(post.error)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalQueuePages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => setQueuePage(prev => Math.max(prev - 1, 1))}
                  disabled={queuePage === 1}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', opacity: queuePage === 1 ? 0.4 : 1 }}
                >
                  ◀ Trước
                </button>

                {Array.from({ length: totalQueuePages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setQueuePage(page)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: queuePage === page ? 'linear-gradient(135deg, var(--secondary), var(--primary))' : 'rgba(255,255,255,0.02)',
                      color: '#fff',
                      fontWeight: queuePage === page ? 'bold' : 'normal',
                      cursor: 'pointer',
                      transition: '0.2s'
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setQueuePage(prev => Math.min(prev + 1, totalQueuePages))}
                  disabled={queuePage === totalQueuePages}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', opacity: queuePage === totalQueuePages ? 0.4 : 1 }}
                >
                  Sau ▶
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {activeTab === 'channels' && (
        /* ========== BẢNG HIỆU SUẤT KÊNH ========== */
        <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Hiệu Suất Kênh ({visibleChannels.length})</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔎 Tìm kênh..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="form-control"
              style={{ width: '180px', padding: '8px 12px', fontSize: '0.82rem' }}
            />
            <select
              value={channelSort}
              onChange={(e) => setChannelSort(e.target.value)}
              className="form-control"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '0.82rem' }}
            >
              <option value="views">Sắp xếp: Lượt xem</option>
              <option value="subscribers">Sắp xếp: Đăng ký</option>
              <option value="videoCount">Sắp xếp: Số video</option>
              <option value="perfScore">Sắp xếp: Điểm hiệu suất</option>
              <option value="growth">Sắp xếp: Tăng trưởng view</option>
            </select>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="form-control"
                style={{ width: 'auto', padding: '8px 12px', fontSize: '0.82rem' }}
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            {(growthFilter !== 'all' || categoryFilter !== 'all' || channelSearch) && (
              <button
                type="button"
                onClick={() => { setGrowthFilter('all'); setCategoryFilter('all'); setChannelSearch(''); }}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.8rem' }}
              >
                ✕ Xóa lọc
              </button>
            )}

            {channelSyncStatus && channelSyncStatus.active ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--secondary)', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
                  ⚡ {channelSyncStatus.message}
                </span>
                <button onClick={handleStopChannelSync} className="btn btn-secondary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', padding: '8px 14px', fontSize: '0.8rem' }}>
                  Dừng
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartChannelSync}
                disabled={isChannelSyncing || accounts.length === 0}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                🔄 Đồng bộ số liệu kênh
              </button>
            )}
          </div>
        </div>
        {channelSyncMessage && (
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginBottom: '12px' }}>{channelSyncMessage}</div>
        )}

        {accounts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Chưa có tài khoản kênh nào được liên kết.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1050px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={thStyle}>Kênh YouTube</th>
                  <th style={thStyle}>Trạng Thái</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Đăng Ký</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Lượt Xem</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Video</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Xu Hướng</th>
                  <th style={{ ...thStyle, width: '150px' }}>
                    Điểm Hiệu Suất{' '}
                    <span
                      title="Chỉ số ước tính nội bộ dựa trên lượt xem trung bình/video, KHÔNG phải số liệu chính thức từ thuật toán đề xuất của YouTube."
                      style={{ cursor: 'help', opacity: 0.7 }}
                    >
                      ℹ️
                    </span>
                  </th>
                  <th style={thStyle}>Chủ Đề (Top Hashtag)</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cập Nhật Cuối</th>
                </tr>
              </thead>
              <tbody>
                {visibleChannels.map((acc) => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ChannelAvatar acc={acc} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {acc.channelUrl ? (
                            <a
                              href={acc.channelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--secondary)'}
                              onMouseLeave={e => e.currentTarget.style.color = '#fff'}
                            >
                              {acc.label}
                            </a>
                          ) : (
                            <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>{acc.label}</span>
                          )}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{acc.email ? acc.email.split('@')[0] : acc.username}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px', fontSize: '0.85rem' }}>
                      {acc.growthStatus === 'strong' && (
                        <span style={{ background: 'rgba(255, 71, 87, 0.08)', color: '#ff4757', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>🔥 Tăng mạnh</span>
                      )}
                      {acc.growthStatus === 'light' && (
                        <span style={{ background: 'rgba(46, 213, 115, 0.08)', color: '#2ed573', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>📈 Tăng nhẹ</span>
                      )}
                      {acc.growthStatus === 'no_change' && (
                        <span style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-muted)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>➖ Không đổi</span>
                      )}
                    </td>

                    <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{formatNumber(acc.subscribers)}</span>
                        {acc.subDelta > 0 && <span style={{ fontSize: '0.72rem', color: '#2ed573', fontWeight: 600 }}>▲ +{acc.subDelta}</span>}
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: '#eee' }}>{formatNumber(acc.views)}</span>
                        {acc.viewDelta > 0 && <span style={{ fontSize: '0.72rem', color: '#2ed573', fontWeight: 600 }}>▲ +{formatNumber(acc.viewDelta)}</span>}
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: '#eee' }}>{formatNumber(acc.videoCount)}</span>
                        {acc.videoDelta > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--secondary)', fontWeight: 600 }}>▲ +{acc.videoDelta}</span>}
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                      <Sparkline history={acc.statsHistory} />
                    </td>

                    <td style={{ padding: '16px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: acc.perfScore > 50 ? 'var(--secondary)' : 'var(--text-muted)' }}>
                          {acc.perfScore}% {acc.perfScore > 75 ? '🔥' : acc.perfScore > 40 ? '👍' : ''}
                        </span>
                        <div style={{ width: '100%', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${acc.perfScore}%`,
                            height: '100%',
                            background: acc.perfScore > 75
                              ? 'linear-gradient(90deg, #F355DA 0%, #7000FF 100%)'
                              : acc.perfScore > 40
                              ? 'linear-gradient(90deg, #00F2FE 0%, #4FACFE 100%)'
                              : 'linear-gradient(90deg, #a4b0be 0%, #747d8c 100%)',
                            borderRadius: '3px'
                          }}></div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {acc.topHashtags && acc.topHashtags.length > 0 ? (
                          acc.topHashtags.map((tag, idx) => (
                            <span key={idx} style={{ background: 'rgba(255, 71, 87, 0.08)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa đăng clip nào</span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatTime(acc.statsUpdatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {activeTab === 'posts' && (
        /* ========== BẢNG HIỆU SUẤT BÀI ĐĂNG ========== */
        <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Hiệu Suất Bài Đăng ({visiblePosts.length})</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔎 Tìm caption / kênh..."
              value={postSearch}
              onChange={(e) => { setPostSearch(e.target.value); setPostPage(1); }}
              className="form-control"
              style={{ width: '200px', padding: '8px 12px', fontSize: '0.82rem' }}
            />
            <select
              value={postSort}
              onChange={(e) => { setPostSort(e.target.value); setPostPage(1); }}
              className="form-control"
              style={{ width: 'auto', padding: '8px 12px', fontSize: '0.82rem' }}
            >
              <option value="newest">Sắp xếp: Mới nhất</option>
              <option value="views">Sắp xếp: Lượt xem</option>
              <option value="likes">Sắp xếp: Lượt thích</option>
              <option value="comments">Sắp xếp: Bình luận</option>
            </select>

            {postSyncStatus && postSyncStatus.active ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--secondary)', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
                  ⚡ Đang đồng bộ ({postSyncStatus.current}/{postSyncStatus.total})
                </span>
                <button onClick={handleStopPostSync} className="btn btn-secondary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff', padding: '8px 14px', fontSize: '0.8rem' }}>
                  Dừng
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartPostSync}
                disabled={isPostSyncing || successPosts.length === 0}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                🔄 Đồng bộ tương tác
              </button>
            )}
          </div>
        </div>
        {postSyncMessage && (
          <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginBottom: '12px' }}>{postSyncMessage}</div>
        )}

        {successPosts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Chưa có bài đăng thành công nào để thống kê.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={thStyle}>Kênh</th>
                  <th style={thStyle}>Caption</th>
                  <th style={thStyle}>Đăng Lúc</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>👁️ Xem</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>❤️ Thích</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>💬 Bình Luận</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.map(post => (
                  <tr key={post.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>{post.accountLabel}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{post.accountUsername}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {post.videoUrl ? (
                        <a
                          href={post.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Click để xem video trực tiếp"
                          style={{ color: 'var(--secondary)', textDecoration: 'none', fontWeight: 500 }}
                          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                          🔗 {post.caption}
                        </a>
                      ) : (
                        post.caption
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatDate(post.postedAt || post.createdAt)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                      {formatNumber(post.views)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.85rem', color: '#ff7675' }}>
                      {formatNumber(post.likes)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.85rem', color: '#74b9ff' }}>
                      {formatNumber(post.comments)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleSyncSinglePost(post.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', opacity: 0.8 }}
                      >
                        Đồng bộ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPostPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => setPostPage(p => Math.max(p - 1, 1))}
                  disabled={postPage === 1}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', opacity: postPage === 1 ? 0.4 : 1 }}
                >
                  ◀ Trước
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Trang {postPage} / {totalPostPages}
                </span>
                <button
                  onClick={() => setPostPage(p => Math.min(p + 1, totalPostPages))}
                  disabled={postPage === totalPostPages}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', opacity: postPage === totalPostPages ? 0.4 : 1 }}
                >
                  Sau ▶
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {activeTab === 'failed' && (
        /* ========== DANH SÁCH BÀI ĐĂNG THẤT BẠI ========== */
        <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>❌ Danh Sách Bài Đăng Thất Bại ({failedPosts.length})</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="text"
                placeholder="🔎 Tìm kiếm lỗi / caption..."
                value={failedSearch}
                onChange={(e) => { setFailedSearch(e.target.value); setFailedPage(1); }}
                className="form-control"
                style={{ width: '220px', padding: '8px 12px', fontSize: '0.82rem' }}
              />
              {totalFailedPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setFailedPage(prev => Math.max(prev - 1, 1))}
                    disabled={failedPage === 1}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', opacity: failedPage === 1 ? 0.4 : 1 }}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Trang {failedPage} / {totalFailedPages}
                  </span>
                  <button
                    onClick={() => setFailedPage(prev => Math.min(prev + 1, totalFailedPages))}
                    disabled={failedPage === totalFailedPages}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px', opacity: failedPage === totalFailedPages ? 0.4 : 1 }}
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
          </div>

          {failedPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.5 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 15s1.5-2 4-2 4 2 4 2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
              <p>Tuyệt vời! Không có bài đăng nào bị thất bại.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Mã bài đăng</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Kênh</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Caption</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Thời gian lỗi</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Phân loại lỗi</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.85rem' }}>Chi tiết lý do thất bại</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFailed.map((post) => {
                    const tag = getErrorTag(post.error);
                    return (
                      <tr key={post.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '16px', fontWeight: 600, fontSize: '0.9rem' }}>{post.id}</td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="badge" style={{
                                background: post.platform === 'youtube' ? 'rgba(255, 71, 87, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: post.platform === 'youtube' ? '#ff4757' : '#fff',
                                border: post.platform === 'youtube' ? '1px solid rgba(255, 71, 87, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '1px 4px',
                                fontSize: '0.65rem'
                              }}>
                                {post.platform === 'youtube' ? 'YT' : 'TT'}
                              </span>
                              <span style={{ fontWeight: 600 }}>{post.accountLabel}</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{post.platform === 'youtube' ? '' : '@'}{post.accountUsername}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                          {post.caption}
                        </td>
                        <td style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {new Date(post.postedAt || post.scheduledAt || post.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            color: tag.color,
                            background: tag.bg,
                            border: tag.border,
                            whiteSpace: 'nowrap'
                          }}>
                            {tag.label}
                          </span>
                        </td>
                        <td style={{ padding: '16px', maxWidth: '320px', fontSize: '0.85rem', color: 'var(--danger)', wordBreak: 'break-word', lineHeight: 1.4 }}>
                          {post.error || 'Lỗi không xác định trong tiến trình.'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalFailedPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => setFailedPage(prev => Math.max(prev - 1, 1))}
                    disabled={failedPage === 1}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', opacity: failedPage === 1 ? 0.4 : 1 }}
                  >
                    ◀ Trước
                  </button>

                  {Array.from({ length: totalFailedPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setFailedPage(page)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: failedPage === page ? 'linear-gradient(135deg, var(--secondary), var(--primary))' : 'rgba(255,255,255,0.02)',
                        color: '#fff',
                        fontWeight: failedPage === page ? 'bold' : 'normal',
                        cursor: 'pointer',
                        transition: '0.2s'
                      }}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setFailedPage(prev => Math.min(prev + 1, totalFailedPages))}
                    disabled={failedPage === totalFailedPages}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', opacity: failedPage === totalFailedPages ? 0.4 : 1 }}
                  >
                    Sau ▶
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
