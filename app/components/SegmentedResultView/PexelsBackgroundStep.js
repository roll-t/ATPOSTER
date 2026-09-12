'use client';

export default function PexelsBackgroundStep({ controller, formatDuration, isRenderingVideo }) {
  const {
    assetCounts,
    result,
    pexelsQuery,
    setPexelsQuery,
    pexelsVideos,
    isPexelsSearching,
    pexelsSearchMsg,
    isDlBgVideo,
    dlBgVideoMsg,
    dlBgVideoProgress,
    selectedPexelsIds,
    setSelectedPexelsIds,
    previewPexelsId,
    setPreviewPexelsId,
    pexelsKeywords,
    setPexelsKeywords,
    pexelsPage,
    pexelsHasMore,
    setPexelsHasMore,
    isSuggestingKeywords,
    selectedPexelsVideos,
    selectedCoverSeconds,
    estimatedVideoSeconds,
    bgSelectionFull,
    recommendedBgClipCount,
    hasUnappliedBgSelection,
    togglePexelsSelection,
    handlePexelsSearch,
    handleSuggestPexelsKeywords,
    handleDownloadAllBgVideos,
    runPexelsSearch,
  } = controller;

  const isStep1Done = assetCounts.audioCount >= result.segments.length;
  const hasBgVideo = assetCounts.hasBgVideo;
  const selectedCount = selectedPexelsIds.length;
  const coverPercent = estimatedVideoSeconds > 0
    ? Math.min(100, Math.round((selectedCoverSeconds / estimatedVideoSeconds) * 100))
    : 0;

  const showKeyword = keyword => {
    setPexelsQuery(keyword);
    setPexelsKeywords([keyword]);
    setPexelsHasMore(true);
    runPexelsSearch([keyword], 1);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', padding: '12px 16px', borderRadius: '10px', gap: '10px',
      opacity: isStep1Done ? 1 : 0.5, background: 'rgba(255,255,255,0.015)',
      border: hasBgVideo ? '1px solid rgba(16,185,129,.25)' : isStep1Done ? '1px solid rgba(167,139,250,.25)' : '1px solid rgba(255,255,255,.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '.8rem',
          background: hasBgVideo ? '#10b981' : isStep1Done ? 'linear-gradient(135deg,#a78bfa,#7c3aed)' : 'rgba(255,255,255,.1)',
        }}>{hasBgVideo ? '✓' : '2'}</div>
        <strong style={{ fontSize: '.85rem', color: '#fff' }}>Chọn Video Nền Pexels</strong>
        {hasBgVideo && <span style={{ fontSize: '.75rem', color: '#10b981' }}>✓ Đã có video nền</span>}
      </div>

      {isStep1Done && <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            value={pexelsQuery}
            onChange={event => setPexelsQuery(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && handlePexelsSearch()}
            placeholder="Nhập từ khoá tìm video nền"
            disabled={isPexelsSearching || isDlBgVideo}
            style={{ flex: 1, minWidth: '220px', padding: '7px 10px', borderRadius: '7px', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.15)', color: '#fff' }}
          />
          <button type="button" className="btn btn-secondary" onClick={handlePexelsSearch} disabled={isPexelsSearching || isDlBgVideo || !pexelsQuery.trim()}>
            {isPexelsSearching ? '⏳ Tìm...' : '🔍 Tìm video'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => handleSuggestPexelsKeywords()} disabled={isPexelsSearching || isDlBgVideo || isSuggestingKeywords}>
            {isSuggestingKeywords ? '⏳ Đang nghĩ...' : '✨ Gợi ý theo kịch bản'}
          </button>
        </div>

        {pexelsKeywords.length > 1 && <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {pexelsKeywords.map(keyword => <button key={keyword} type="button" onClick={() => showKeyword(keyword)} disabled={isPexelsSearching || isDlBgVideo} style={{ fontSize: '.7rem', padding: '3px 9px', borderRadius: '999px', background: 'rgba(167,139,250,.12)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,.3)' }}>{keyword}</button>)}
        </div>}

        {pexelsSearchMsg && <div style={{ fontSize: '.78rem', color: '#fbbf24' }}>{pexelsSearchMsg}</div>}

        {pexelsVideos.length > 0 && <>
          <div style={{ padding: '8px 10px', borderRadius: '7px', background: 'rgba(167,139,250,.08)', border: '1px solid rgba(167,139,250,.2)' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '.76rem' }}>
              <span style={{ color: '#c4b5fd' }}>Video ~{formatDuration(estimatedVideoSeconds)} · nên chọn {recommendedBgClipCount} clip</span>
              <strong style={{ marginLeft: 'auto', color: bgSelectionFull ? '#10b981' : '#fbbf24' }}>
                {selectedCount ? `${selectedCount} clip · phủ ${formatDuration(Math.round(selectedCoverSeconds))}` : 'Chưa chọn — hệ thống sẽ tự lấy'}
              </strong>
            </div>
            {selectedCount > 0 && <div style={{ height: '4px', marginTop: '6px', background: 'rgba(255,255,255,.1)' }}><div style={{ width: `${coverPercent}%`, height: '100%', background: bgSelectionFull ? '#10b981' : '#a78bfa' }} /></div>}
            {hasUnappliedBgSelection && <button type="button" className="btn btn-secondary" style={{ marginTop: '8px' }} onClick={() => handleDownloadAllBgVideos(selectedPexelsVideos, { keepList: true })} disabled={isDlBgVideo || isRenderingVideo}>⬇ Áp dụng clip đang chọn</button>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px' }}>
            {pexelsVideos.map(video => {
              const selectedOrder = selectedPexelsIds.indexOf(video.id);
              const isSelected = selectedOrder >= 0;
              const isLocked = !isSelected && bgSelectionFull;
              const previewFile = (video.video_files || []).filter(file => file.file_type === 'video/mp4' && file.link).sort((a, b) => (a.width || 0) - (b.width || 0))[0];
              const isPreviewing = previewPexelsId === video.id;
              return <div key={video.id} onClick={() => !isDlBgVideo && !isLocked && togglePexelsSelection(video)} style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? .4 : 1, border: isSelected ? '2px solid #a78bfa' : '1px solid rgba(167,139,250,.3)', background: '#000' }}>
                {isPreviewing && previewFile
                  ? <video src={previewFile.link} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={video.image || video.video_pictures?.[0]?.picture || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                <span style={{ position: 'absolute', left: '6px', bottom: '5px', color: '#fff', fontSize: '.68rem', fontWeight: 700 }}>{isSelected ? `#${selectedOrder + 1}` : `${video.duration}s`}</span>
                {previewFile && <button type="button" onClick={event => { event.stopPropagation(); setPreviewPexelsId(isPreviewing ? null : video.id); }} style={{ position: 'absolute', right: '5px', top: '5px', border: 0, borderRadius: '5px', background: 'rgba(0,0,0,.65)', color: '#fff' }}>{isPreviewing ? '⏸' : '▶'}</button>}
              </div>;
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {pexelsHasMore && <button type="button" className="btn btn-secondary" onClick={() => runPexelsSearch(pexelsKeywords, pexelsPage + 1, { append: true })} disabled={isPexelsSearching || isDlBgVideo}>⬇ Xem thêm</button>}
            {selectedCount > 0 && <>
              <button type="button" className="btn btn-secondary" onClick={() => handleDownloadAllBgVideos(selectedPexelsVideos, { keepList: true })} disabled={isDlBgVideo}>✓ Dùng {selectedCount} clip</button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedPexelsIds([])} disabled={isDlBgVideo}>Bỏ chọn hết</button>
            </>}
          </div>
        </>}

        {isDlBgVideo && dlBgVideoProgress.total > 0 && <div style={{ fontSize: '.78rem', color: '#a78bfa' }}>⏳ Đang tải {dlBgVideoProgress.current}/{dlBgVideoProgress.total}</div>}
        {!isDlBgVideo && dlBgVideoMsg && <div style={{ fontSize: '.78rem', color: dlBgVideoMsg.startsWith('✓') ? '#10b981' : '#fbbf24' }}>{dlBgVideoMsg}</div>}
      </div>}
    </div>
  );
}
