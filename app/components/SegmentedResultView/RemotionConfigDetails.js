'use client';

function buildFallbackConfig(result, audioExt) {
  const folder = result.input?.folderPath || 'example';
  const imageExt = result.input?.imageExt || 'jpg';
  const resolvedAudioExt = audioExt || result.input?.audioExt || 'mp3';
  return {
    title: result.title || 'slideshow-video',
    captionPosition: 'bottom',
    imageFit: 'cover',
    kenBurns: true,
    transitionSeconds: 0.5,
    bgColor: '#0E0F13',
    fontFamily: "'Be Vietnam Pro','Noto Sans',Arial,sans-serif",
    captionMode: 'chunked',
    captionWordsPerChunk: 4,
    audioPaddingSeconds: 0.4,
    bgMusicVolume: 0.12,
    scenes: result.segments.map(segment => {
      const number = String(segment.segmentNumber).padStart(2, '0');
      return {
        image: `${folder}/images/scene-${number}.${imageExt}`,
        audio: `${folder}/audio/scene-${number}.${resolvedAudioExt}`,
        caption: segment.subtitle || segment.dialogueOrNarration || '',
      };
    }),
  };
}

export default function RemotionConfigDetails({ result, audioExt, copiedKey, onCopy }) {
  const config = result.remotionConfig || buildFallbackConfig(result, audioExt);
  const copy = () => onCopy(JSON.stringify(config, null, 2), 'remotion_config');
  return <details style={{ marginTop: '16px', outline: 'none' }}>
    <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,.4)', fontSize: '.78rem', fontWeight: 700 }}>
      🛠️ Xem cấu hình Remotion nâng cao (JSON & Copy)
    </summary>
    <div style={{ marginTop: '12px', background: 'rgba(0,0,0,.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '.8rem', color: 'var(--secondary)', fontWeight: 600 }}>Cấu hình Remotion JSON:</span>
        <button type="button" className="btn btn-secondary" onClick={copy} style={{ padding: '4px 10px', fontSize: '.72rem' }}>
          {copiedKey === 'remotion_config' ? '✓ Đã chép!' : '📋 Sao chép cấu hình'}
        </button>
      </div>
      <pre style={{ margin: 0, fontSize: '.78rem', lineHeight: 1.45, color: 'rgba(255,255,255,.85)', background: 'rgba(0,0,0,.3)', padding: '12px', borderRadius: '8px', maxHeight: '180px', overflowY: 'auto', fontFamily: 'monospace' }}>
        {JSON.stringify(config, null, 2)}
      </pre>
    </div>
  </details>;
}
