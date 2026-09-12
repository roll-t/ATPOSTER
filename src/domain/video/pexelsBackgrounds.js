const THEME_KEYWORDS = {
  healing_pressure: ['misty forest morning', 'calm lake water', 'rain on window', 'soft sunlight through trees', 'quiet mountain fog'],
  self_help: ['sunrise over hills', 'empty road morning', 'ocean waves dawn', 'runner silhouette sunrise', 'city skyline first light'],
  inner_world: ['forest path alone', 'foggy field dusk', 'still water reflection', 'window rainy day', 'starry night sky'],
  self_acceptance: ['sunlight through leaves', 'wildflowers in wind', 'gentle stream stones', 'warm golden field', 'calm sea horizon'],
  overthinking: ['rain on glass', 'slow moving clouds', 'candle flame dark', 'empty room window light', 'waves at night'],
  love_boundaries: ['couple walking park', 'autumn leaves falling', 'two chairs empty', 'sunset over water', 'quiet street evening'],
  social_connection: ['friends walking outdoors', 'city crowd slow motion', 'campfire at night', 'shared table sunlight', 'park in summer'],
  gratitude: ['golden hour sky', 'sun through window', 'harvest field evening', 'calm river sunset', 'morning dew grass'],
  growth: ['plant sprouting soil', 'sunrise over forest', 'time lapse clouds', 'tree in wind', 'mountain trail climb'],
};

const DEFAULT_KEYWORDS = [
  'peaceful nature landscape',
  'calm water reflection',
  'misty forest',
  'golden hour sky',
  'slow clouds timelapse',
];

export const BG_VIDEO_MAX_SIZE_MB = 15;
export const BG_CLIP_MAX_SECONDS = 30;

export function deriveThemeKeywords(result) {
  return THEME_KEYWORDS[result?.input?.moralTheme] || DEFAULT_KEYWORDS;
}

export function derivePexelsQueryFromResult(result) {
  return deriveThemeKeywords(result)[0];
}

export function rankBgVideoFiles(video, isPortrait, maxSizeMB = BG_VIDEO_MAX_SIZE_MB) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  const files = (video?.video_files || []).filter(file =>
    file?.file_type === 'video/mp4'
    && file?.link
    && (typeof file.size !== 'number' || file.size <= maxBytes)
  );
  const maxWidth = isPortrait ? 1080 : 1920;
  const maxHeight = isPortrait ? 1920 : 1080;
  const area = file => (file.width || 0) * (file.height || 0);
  const fits = file => (file.width || 0) <= maxWidth && (file.height || 0) <= maxHeight;
  return [
    ...files.filter(fits).sort((a, b) => area(b) - area(a)),
    ...files.filter(file => !fits(file)).sort((a, b) => area(a) - area(b)),
  ];
}

export function orderBgVideosByOrientation(videos, isPortrait) {
  const wanted = isPortrait ? 'portrait' : 'landscape';
  const targetRatio = isPortrait ? 9 / 16 : 16 / 9;
  const orientation = video => (video?.height || 0) > (video?.width || 0) ? 'portrait' : 'landscape';
  const closest = (a, b) =>
    Math.abs((a.width / a.height) - targetRatio) - Math.abs((b.width / b.height) - targetRatio);
  return [
    ...videos.filter(video => orientation(video) === wanted).sort(closest),
    ...videos.filter(video => orientation(video) !== wanted).sort(closest),
  ];
}

export function pickBgClipForSegment(videos, isPortrait, neededSeconds, skipIds = []) {
  const skip = new Set(skipIds);
  const usable = orderBgVideosByOrientation(videos, isPortrait)
    .filter(video => !skip.has(video.id))
    .filter(video => rankBgVideoFiles(video, isPortrait).length > 0);
  return usable.find(video => (Number(video.duration) || 0) >= neededSeconds) || usable[0] || null;
}

export function clipCoverSeconds(video) {
  return Math.min(Number(video?.duration) || 0, BG_CLIP_MAX_SECONDS);
}

export function interleaveVideoLists(lists) {
  const result = [];
  const longest = Math.max(0, ...lists.map(list => list.length));
  for (let index = 0; index < longest; index++) {
    for (const list of lists) if (list[index]) result.push(list[index]);
  }
  return result;
}

export function recommendedClipCount(videos, durationSeconds) {
  if (videos.length === 0) return Math.max(3, Math.ceil(durationSeconds / BG_CLIP_MAX_SECONDS));
  let covered = 0;
  let count = 0;
  for (const video of videos) {
    if (covered >= durationSeconds) break;
    covered += clipCoverSeconds(video);
    count += 1;
  }
  return Math.max(1, count);
}
