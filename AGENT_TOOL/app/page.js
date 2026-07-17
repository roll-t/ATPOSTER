'use client';

import Link from 'next/link';

export default function HubPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1b1931 0%, #0c0a15 100%)',
      color: '#fff',
      padding: '40px 20px',
      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif'
    }}>
      {/* Background glowing decorations */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: '350px',
        height: '350px',
        background: 'rgba(0, 242, 254, 0.15)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '20%',
        width: '350px',
        height: '350px',
        background: 'rgba(254, 44, 85, 0.12)',
        filter: 'blur(100px)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />

      {/* Header Container */}
      <div style={{
        textAlign: 'center',
        marginBottom: '50px',
        zIndex: 2,
        maxWidth: '700px'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <img src="/logo.png" alt="AutoPoster Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 900,
            letterSpacing: '-0.05em',
            margin: 0,
            background: 'linear-gradient(to right, #00f2fe, #4facfe, #f355da, #7000ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            AI Workspace
          </h1>
        </div>
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          margin: 0
        }}>
          Hệ thống quản trị và hỗ trợ sáng tạo nội dung. Vui lòng chọn công cụ bạn muốn làm việc. Các ứng dụng hoạt động độc lập để tối ưu hóa hiệu suất.
        </p>
      </div>

      {/* Grid of Tools */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        width: '100%',
        maxWidth: '860px',
        zIndex: 2,
        marginBottom: '40px'
      }}>
        
        {/* Tool 1: YouTube Shorts AutoPoster */}
        <Link href="/autoposter" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{
            padding: '30px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.4)';
            e.currentTarget.style.background = 'rgba(0, 242, 254, 0.04)';
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.querySelector('.tool-btn').style.background = 'var(--secondary-glow)';
            e.currentTarget.querySelector('.tool-btn').style.borderColor = '#00f2fe';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.querySelector('.tool-btn').style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.querySelector('.tool-btn').style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}>
            <div>
              <div style={{
                fontSize: '2.5rem',
                marginBottom: '16px',
                display: 'inline-block'
              }}>
                📺
              </div>
              <h2 style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                AutoPoster & Manager
              </h2>
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                margin: 0
              }}>
                Quản lý các tài khoản mạng xã hội, lên lịch đăng bài, tự động tải lên Shorts/Videos qua trình duyệt giả lập, theo dõi hiệu suất và chẩn đoán lỗi chéo.
              </p>
            </div>
            <div className="tool-btn" style={{
              marginTop: '24px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#fff',
              fontSize: '0.88rem',
              fontWeight: 700,
              textAlign: 'center',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              Truy cập AutoPoster 
              <span style={{ fontSize: '1rem' }}>→</span>
            </div>
          </div>
        </Link>

        {/* Tool 2: Prompt AI Studio */}
        <Link href="/prompts" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{
            padding: '30px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(254, 44, 85, 0.4)';
            e.currentTarget.style.background = 'rgba(254, 44, 85, 0.03)';
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.querySelector('.tool-btn').style.background = 'rgba(254, 44, 85, 0.15)';
            e.currentTarget.querySelector('.tool-btn').style.borderColor = '#fe2c55';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.querySelector('.tool-btn').style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.querySelector('.tool-btn').style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}>
            <div>
              <div style={{
                fontSize: '2.5rem',
                marginBottom: '16px',
                display: 'inline-block'
              }}>
                🎨
              </div>
              <h2 style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                Prompt AI Studio
              </h2>
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                margin: 0
              }}>
                Công cụ sáng tạo và dịch thuật prompt thông minh. Hỗ trợ dịch tự động sang tiếng Anh bằng Gemini AI, thiết kế nhân vật và kịch bản video đồng nhất thương hiệu.
              </p>
            </div>
            <div className="tool-btn" style={{
              marginTop: '24px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#fff',
              fontSize: '0.88rem',
              fontWeight: 700,
              textAlign: 'center',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              Mở Prompt Studio
              <span style={{ fontSize: '1rem' }}>→</span>
            </div>
          </div>
        </Link>

      </div>

      <div style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        zIndex: 2,
        textAlign: 'center'
      }}>
        © 2026 AutoPoster AI Hub — Phiên bản Alpha v1.0.0
      </div>
    </div>
  );
}
