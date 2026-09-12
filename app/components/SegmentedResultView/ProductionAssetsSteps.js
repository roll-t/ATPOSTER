'use client';

import StepProgressBar from './StepProgressBar.js';
import { bgMusicTrackLabel } from './constants.js';

export default function ProductionAssetsSteps({ controller }) {
  const {
    isPexelsTalkVideo, result, isExternalVoiceSkill, assetCounts, flowStatus,
    isOpeningImages, handleOpenImagesFolder, openImagesError, pushToFlow,
    flowButtonLabel, renderBgMusicEnabled, selectedBgMusicTrackId, bgMusicLibrary,
    renderBgMusicVolume, isRenderingVideo, isGeneratingVoice, setShowBgMusicModal,
    setRenderBgMusicEnabled, persistBgMusicConfig,
  } = controller;
  return <>
                {/* Bước 2: Sinh & tải ảnh — ẩn với pexels_talk_video */}
                {!isPexelsTalkVideo && (() => {
                  const total = result.segments.length;
                  // isStep1Done ở đây là CỬA MỞ của bước này, không phải "đã lồng tiếng xong":
                  // skill lồng tiếng ngoài thì cửa luôn mở (xem isExternalVoiceSkill).
                  const isStep1Done = isExternalVoiceSkill || assetCounts.audioCount >= total;
                  const completedFlow = flowStatus ? flowStatus.completed : 0;
                  const isFlowDone = flowStatus && flowStatus.phase === 'completed';
                  const hasAllImages = assetCounts.imageCount >= total;
                  const isStep2Done = isFlowDone || hasAllImages;
                  const isStep2Running = !isStep2Done && flowStatus && flowStatus.phase === 'running';

                  return (
                    <div className={isStep2Running ? 'running-glow-card' : ''} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: isStep2Running ? '1.5px solid transparent' : isStep2Done ? '1px solid rgba(16, 185, 129, 0.25)' : isStep1Done ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid rgba(255, 255, 255, 0.03)',
                      borderRadius: '10px',
                      opacity: isStep1Done ? 1 : 0.5,
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isStep2Done ? '#10b981' : isStep1Done ? 'linear-gradient(135deg, #FE2C55, #ff5a79)' : 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            flexShrink: 0,
                            animation: isStep2Running ? 'pulse-ring 1.6s ease-in-out infinite' : 'none'
                          }}>
                            {isStep2Done ? '✓' : '2'}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                              Sinh & tải ảnh tự động
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            title={assetCounts.imageCount > 0 ? `Mở thư mục chứa ${assetCounts.imageCount} ảnh đã tải về` : 'Mở thư mục lưu ảnh của dự án'}
                            style={{
                              height: '32px',
                              width: '32px',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                              borderRadius: '8px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              boxSizing: 'border-box',
                              flexShrink: 0,
                              cursor: isOpeningImages ? 'wait' : 'pointer'
                            }}
                            onClick={handleOpenImagesFolder}
                            disabled={isOpeningImages}
                          >
                            {isOpeningImages ? '⏳' : '📁'}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{
                              height: '32px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '0 14px',
                              fontSize: '0.76rem',
                              borderRadius: '8px',
                              fontWeight: 700,
                              background: isStep2Done ? 'rgba(46, 213, 115, 0.15)' : isStep1Done ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'rgba(255, 255, 255, 0.05)',
                              color: isStep2Done ? '#2ed573' : isStep1Done ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                              border: isStep2Done ? '1px solid rgba(46, 213, 115, 0.3)' : isStep1Done ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                              boxShadow: isStep2Done || !isStep1Done ? 'none' : '0 4px 15px rgba(254, 44, 85, 0.25)',
                              cursor: !isStep1Done ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              boxSizing: 'border-box'
                            }}
                            onClick={() => pushToFlow(flowStatus)}
                            disabled={!isStep1Done}
                          >
                            {flowButtonLabel(flowStatus)}
                          </button>
                        </div>
                      </div>

                      {openImagesError && (
                        <div style={{ fontSize: '0.74rem', color: '#f87171' }}>⚠️ {openImagesError}</div>
                      )}

                      {/* Dòng tiến độ dạng thanh - chỉ hiện TRONG lúc đang chạy, ẩn ngay khi xong */}
                      {isStep2Running && flowStatus && flowStatus.total > 0 && (
                        <StepProgressBar
                          percent={(flowStatus.completed / flowStatus.total) * 100}
                          label={`${flowStatus.completed}/${flowStatus.total}`}
                          color={flowStatus.color}
                          showShimmer={true}
                        />
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  const total = result.segments.length;
                  const isStep1Done = isExternalVoiceSkill || assetCounts.audioCount >= total;
                  const isStep3Done = assetCounts.hasBgMusic || !renderBgMusicEnabled;

                  const currentTrackName = bgMusicTrackLabel(selectedBgMusicTrackId, { short: true, library: bgMusicLibrary });

                  return (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: isStep3Done ? '1px solid rgba(16, 185, 129, 0.25)' : isStep1Done ? '1px solid rgba(168, 85, 247, 0.28)' : '1px solid rgba(255, 255, 255, 0.03)',
                      borderRadius: '10px',
                      opacity: (isStep1Done && renderBgMusicEnabled) ? 1 : 0.5,
                      gap: '10px',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isStep3Done ? '#10b981' : isStep1Done ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            flexShrink: 0
                          }}>
                            {isStep3Done ? '✓' : '3'}
                          </div>
                          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                              Nhạc nền hòa âm
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              background: renderBgMusicEnabled ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                              color: renderBgMusicEnabled ? '#d8b4fe' : 'rgba(255, 255, 255, 0.5)',
                              border: renderBgMusicEnabled ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              {renderBgMusicEnabled ? `🎵 ${currentTrackName} (${renderBgMusicVolume}%)` : '🔇 Tắt nhạc'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                          {/* Nút Cài đặt dạng Icon. Chỉ khoá khi đang chạy render/lồng tiếng — trước
                          đây còn khoá theo !isStep1Done và !renderBgMusicEnabled, nghĩa là muốn
                          xem/đổi bản nhạc thì buộc phải bật nhạc lên và phải lồng tiếng xong đã,
                          dù chọn nhạc nền chẳng phụ thuộc gì vào hai việc đó. */}
                          <button
                            type="button"
                            className="btn btn-secondary"
                            title="Chọn bản nhạc nền & chỉnh âm lượng"
                            style={{
                              height: '32px',
                              width: '32px',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                              borderRadius: '8px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              boxSizing: 'border-box',
                              flexShrink: 0,
                              opacity: (isRenderingVideo || isGeneratingVoice) ? 0.5 : 1,
                              cursor: (isRenderingVideo || isGeneratingVoice) ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => setShowBgMusicModal(true)}
                            disabled={isRenderingVideo || isGeneratingVoice}
                          >
                            ⚙️
                          </button>

                          {/* Công tắc Bật/Tắt Nhạc Nền — lưu ngay xuống kịch bản, nếu không thì tắt
                          nhạc xong rời trang là lần mở sau nhạc lại tự bật. */}
                          <label className="custom-switch" title={renderBgMusicEnabled ? 'Đang bật nhạc nền' : 'Đang tắt nhạc nền'} style={{ margin: 0, transform: 'scale(0.85)' }}>
                            <input
                              type="checkbox"
                              checked={renderBgMusicEnabled}
                              disabled={isRenderingVideo || isGeneratingVoice}
                              onChange={(e) => {
                                setRenderBgMusicEnabled(e.target.checked);
                                persistBgMusicConfig({ bgMusicEnabled: e.target.checked });
                              }}
                            />
                            <span className="switch-slider" style={{
                              backgroundColor: renderBgMusicEnabled ? '#a855f7' : 'rgba(255, 255, 255, 0.1)'
                            }}></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })()}

  </>;
}

