'use client';

export default function ManualResultView({ result, showJson, setShowJson, copiedKey, onCopy }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px', flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>✨</span>
          <span>Prompt Đã Tạo</span>
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              borderRadius: '6px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              boxShadow: '0 4px 15px rgba(254, 44, 85, 0.3)',
            }}
            onClick={() => {
              window.postMessage({
                type: 'START_FLOW_GENERATION',
                segments: [
                  {
                    segmentNumber: 1,
                    durationSeconds: 10,
                    textPrompt: result.textPrompt,
                    visualDescription: result.visualDescription || result.textPrompt,
                    dialogueOrNarration: '',
                    subtitle: ''
                  }
                ],
                title: result.title || 'Image Prompt',
                isImage: true,
                folderPath: result.input?.folderPath || 'example',
                imageExt: result.input?.imageExt || 'jpg'
              }, '*');
            }}
          >
            🚀 Đẩy sang Google Flow
          </button>

          <button
            type="button"
            onClick={() => setShowJson(v => !v)}
            style={{ 
              background: 'rgba(37, 244, 238, 0.08)', 
              border: '1px solid rgba(37, 244, 238, 0.2)', 
              borderRadius: '6px',
              padding: '6px 12px',
              color: 'var(--secondary)', 
              fontSize: '0.78rem', 
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(37, 244, 238, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(37, 244, 238, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(37, 244, 238, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(37, 244, 238, 0.2)';
            }}
          >
            {showJson ? '📖 Xem bản văn xuôi' : '💻 Xem bản JSON chi tiết'}
          </button>
        </div>
      </div>

      {!showJson ? (
        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.05em' }}>
            Dán trực tiếp vào Gemini / AI Video
          </div>
          <div style={{ 
            background: '#0a0912', 
            padding: '16px', 
            borderRadius: '10px', 
            fontSize: '0.88rem', 
            lineHeight: 1.6, 
            whiteSpace: 'pre-wrap', 
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255, 255, 255, 0.9)',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)'
          }}>
            {result.textPrompt}
          </div>
          <button
            type="button"
            onClick={() => onCopy(result.textPrompt, 'text')}
            className="btn btn-secondary"
            style={{ marginTop: '16px', padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
          >
            <span>{copiedKey === 'text' ? '✓' : '📋'}</span>
            <span>{copiedKey === 'text' ? 'Đã sao chép!' : 'Sao chép prompt'}</span>
          </button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.05em' }}>
            Bản JSON có cấu trúc (tham khảo chi tiết / dùng cho API)
          </div>
          <pre style={{ 
            background: '#0a0912', 
            padding: '16px', 
            borderRadius: '10px', 
            fontSize: '0.8rem', 
            lineHeight: 1.5, 
            overflowX: 'auto', 
            border: '1px solid rgba(255,255,255,0.06)', 
            margin: 0,
            color: '#2ed573',
            fontFamily: 'monospace',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)'
          }}>
            {JSON.stringify(result.jsonPrompt, null, 2)}
          </pre>
          <button
            type="button"
            onClick={() => onCopy(JSON.stringify(result.jsonPrompt, null, 2), 'json')}
            className="btn btn-secondary"
            style={{ marginTop: '16px', padding: '10px 18px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
          >
            <span>{copiedKey === 'json' ? '✓' : '📋'}</span>
            <span>{copiedKey === 'json' ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
