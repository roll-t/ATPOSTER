const CAPTION_STYLES = new Set(['box', 'tiktok', 'karaoke', 'page', 'hook', 'minimal', 'classic', 'pill', 'news', 'none']);
const CAPTION_FONTS = new Set(['paytone-one', 'itim', 'be-vietnam-pro', 'roboto', 'montserrat', 'nunito', 'inter', 'oswald', 'poppins']);
const TRANSITIONS = new Set(['crossfade', 'slide-left', 'slide-right', 'slide-up', 'zoom']);
const CAPTION_POSITIONS = new Set(['top', 'center', 'bottom']);
const TEXT_ALIGNS = new Set(['left', 'center', 'right']);
const KEN_BURNS_MODES = new Set(['in', 'out', 'pan-left', 'pan-right', 'none']);

const numberInRange = (value, min, max) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : undefined;
};

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const put = (target, key, value) => {
  if (value !== undefined) target[key] = value;
};

/**
 * Canonical visual contract shared by the live simulator, persistence and the render API.
 *
 * Old projects used short editor names (`font`, `fontSize`, `bgOpacity`, ...), while Remotion
 * uses explicit names (`captionFont`, `captionFontSize`, `captionBgOpacity`, ...). This boundary
 * accepts both, but always emits one stable vocabulary and validated units. UI music volume is
 * deliberately kept as 0..100 here; only the CLI adapter converts it to Remotion's 0..1.
 */
export function normalizeVideoRenderConfig(source = {}, context = {}) {
  const config = {};
  const category = context.category || source.category || '';
  const orientation = firstDefined(context.orientation, source.orientation) === 'landscape' ? 'landscape' : 'portrait';
  const captionStyleCandidate = firstDefined(source.captionStyle, source.captionEnabled === false ? 'none' : undefined);
  const captionStyle = CAPTION_STYLES.has(captionStyleCandidate) ? captionStyleCandidate : undefined;
  const captionEnabled = source.captionEnabled !== undefined
    ? Boolean(source.captionEnabled)
    : (source.showCaption !== undefined ? Boolean(source.showCaption) : captionStyle !== 'none');

  config.renderContractVersion = 1;
  config.orientation = orientation;
  config.width = orientation === 'landscape' ? 1920 : 1080;
  config.height = orientation === 'landscape' ? 1080 : 1920;
  config.aspectRatio = orientation === 'landscape' ? '16:9' : '9:16';
  config.captionEnabled = captionEnabled;
  config.captionStyle = captionEnabled ? (captionStyle || 'box') : 'none';

  const defaultCaptionPosition = ['moral_talk_slideshow', 'buddhist_wisdom', 'japanese_history'].includes(category)
    ? 'top'
    : (config.captionStyle === 'page' ? 'center' : 'bottom');
  config.captionPosition = CAPTION_POSITIONS.has(source.captionPosition) ? source.captionPosition : defaultCaptionPosition;
  config.captionTextAlign = TEXT_ALIGNS.has(firstDefined(source.captionTextAlign, source.textAlign))
    ? firstDefined(source.captionTextAlign, source.textAlign)
    : 'center';
  config.captionAnimation = typeof source.captionAnimation === 'string' && source.captionAnimation
    ? source.captionAnimation
    : (config.captionStyle === 'news' ? 'none' : 'zoom');

  const font = firstDefined(source.captionFont, source.font);
  put(config, 'captionFont', CAPTION_FONTS.has(font) ? font : undefined);
  put(config, 'captionFontSize', numberInRange(firstDefined(source.captionFontSize, source.fontSize), 14, 120));
  put(config, 'captionSecondaryFontSize', numberInRange(firstDefined(source.captionSecondaryFontSize, source.secondaryFontSize), 10, 100));
  put(config, 'captionTextColor', firstDefined(source.captionTextColor, source.textColor));
  put(config, 'captionBgColor', source.isBgTransparent || source.captionBgTransparent
    ? 'transparent'
    : firstDefined(source.captionBgColor, source.bgColor));
  put(config, 'captionBgOpacity', numberInRange(firstDefined(source.captionBgOpacity, source.bgOpacity), 0, 100));
  put(config, 'highlightColor', source.highlightColor);
  config.captionBgTransparent = source.isBgTransparent !== undefined
    ? Boolean(source.isBgTransparent)
    : Boolean(source.captionBgTransparent);
  put(config, 'captionMarginY', numberInRange(source.captionMarginY, -1600, 1600));
  put(config, 'captionWidth', numberInRange(source.captionWidth, 30, 100));

  const transition = firstDefined(source.transitionStyle, source.transitionEffect);
  config.transitionStyle = TRANSITIONS.has(transition) ? transition : 'crossfade';
  put(config, 'kenBurnsMode', KEN_BURNS_MODES.has(source.kenBurnsMode) ? source.kenBurnsMode : undefined);
  put(config, 'cornerPatch', typeof source.cornerPatch === 'boolean' ? source.cornerPatch : undefined);
  config.channelLogo = source.channelLogo !== false;
  put(config, 'logoTranslateX', numberInRange(source.logoTranslateX, -1500, 1500));
  put(config, 'logoTranslateY', numberInRange(source.logoTranslateY, -1800, 1800));
  put(config, 'logoScale', numberInRange(source.logoScale, 0.1, 4));
  put(config, 'imageScale', numberInRange(source.imageScale, 0.2, 2));
  put(config, 'imageTranslateY', numberInRange(source.imageTranslateY, -100, 100));
  put(config, 'videoBgColor', (typeof source.videoBgColor === 'string' && source.videoBgColor.trim()) ? source.videoBgColor.trim() : '#000000');

  config.showOpeningComment = source.showOpeningComment !== false;
  put(config, 'openingCommentAuthor', source.openingCommentAuthor);
  put(config, 'openingCommentText', source.openingCommentText);
  put(config, 'openingCommentTranslateY', numberInRange(source.openingCommentTranslateY, -1800, 1800));
  put(config, 'openingCommentScale', numberInRange(source.openingCommentScale, 0.1, 4));
  config.showOpeningNewsBanner = Boolean(source.showOpeningNewsBanner);
  put(config, 'openingNewsHeadline', source.openingNewsHeadline);
  put(config, 'openingNewsBrand', source.openingNewsBrand);
  put(config, 'openingNewsLikes', source.openingNewsLikes);
  put(config, 'openingNewsBannerTranslateY', numberInRange(source.openingNewsBannerTranslateY, -1800, 1800));
  put(config, 'openingNewsBannerScale', numberInRange(source.openingNewsBannerScale, 0.1, 4));
  put(config, 'openingNewsTitleColor', source.openingNewsTitleColor);
  put(config, 'openingNewsTitleSize', numberInRange(source.openingNewsTitleSize, 0, 150));
  put(config, 'openingNewsHeadlineWidth', numberInRange(source.openingNewsHeadlineWidth, 30, 100));

  config.bilingual = Boolean(source.bilingual);
  config.bgMusicEnabled = source.bgMusicEnabled !== false;
  put(config, 'bgMusicVolume', numberInRange(source.bgMusicVolume, 0, 100));
  put(config, 'bgMusicTrackId', source.bgMusicTrackId);

  put(config, 'heroHeightPercent', numberInRange(firstDefined(source.heroHeightPercent, source.heroPercent), 0, 60));
  put(config, 'titleHeightPercent', numberInRange(firstDefined(source.titleHeightPercent, source.titlePercent), 4, 30));
  put(config, 'bodyHeightPercent', numberInRange(firstDefined(source.bodyHeightPercent, source.bodyPercent), 15, 75));
  put(config, 'titleFontSize', numberInRange(source.titleFontSize, 20, 80));
  put(config, 'titleBodyGap', numberInRange(source.titleBodyGap, 0, 80));
  put(config, 'contentPaddingPercent', numberInRange(firstDefined(source.contentPaddingPercent, source.paddingPercent), 0, 30));
  put(config, 'bodyAlign', source.bodyAlign === 'justify' ? 'justify' : (source.bodyAlign === 'left' ? 'left' : undefined));
  put(config, 'imageMode', ['hero', 'full_bg', 'none'].includes(source.imageMode) ? source.imageMode : undefined);
  put(config, 'level', source.level);

  return config;
}

const CLI_FIELDS = {
  captionStyle: 'captionStyle', transitionStyle: 'transitionStyle', kenBurnsMode: 'kenBurnsMode', cornerPatch: 'cornerPatch',
  channelLogo: 'channelLogo', bilingual: 'bilingual', orientation: 'orientation', captionFont: 'captionFont',
  captionFontSize: 'captionFontSize', captionSecondaryFontSize: 'captionSecondaryFontSize', captionTextColor: 'captionTextColor',
  captionBgColor: 'captionBgColor', captionBgOpacity: 'captionBgOpacity', highlightColor: 'highlightColor', videoBgColor: 'bgColor',
  heroHeightPercent: 'heroHeightPercent', titleHeightPercent: 'titleHeightPercent', bodyHeightPercent: 'bodyHeightPercent',
  titleFontSize: 'titleFontSize', titleBodyGap: 'titleBodyGap', contentPaddingPercent: 'contentPaddingPercent', bodyAlign: 'bodyAlign',
  imageMode: 'imageMode', level: 'level', bgMusicEnabled: 'bgMusicEnabled', imageScale: 'imageScale', imageTranslateY: 'imageTranslateY',
  captionMarginY: 'captionMarginY', captionWidth: 'captionWidth', logoTranslateX: 'logoTranslateX', logoTranslateY: 'logoTranslateY',
  logoScale: 'logoScale', showOpeningComment: 'showOpeningComment', openingCommentAuthor: 'openingCommentAuthor',
  openingCommentText: 'openingCommentText', openingCommentTranslateY: 'openingCommentTranslateY', openingCommentScale: 'openingCommentScale',
  showOpeningNewsBanner: 'showOpeningNewsBanner', openingNewsHeadline: 'openingNewsHeadline', openingNewsBrand: 'openingNewsBrand',
  openingNewsLikes: 'openingNewsLikes', openingNewsBannerTranslateY: 'openingNewsBannerTranslateY', openingNewsBannerScale: 'openingNewsBannerScale',
  openingNewsTitleColor: 'openingNewsTitleColor', openingNewsTitleSize: 'openingNewsTitleSize', openingNewsHeadlineWidth: 'openingNewsHeadlineWidth',
  captionPosition: 'captionPosition', captionTextAlign: 'captionTextAlign', captionAnimation: 'captionAnimation',
};

/** Convert a canonical snapshot to the backwards-compatible flags understood by every skill. */
export function videoRenderConfigToCliArgs(config) {
  const args = [];
  for (const [key, flag] of Object.entries(CLI_FIELDS)) {
    const value = config[key];
    if (value !== undefined && value !== null && value !== '') args.push(`--${flag}=${value}`);
  }
  if (config.bgMusicVolume !== undefined) args.push(`--bgMusicVolume=${config.bgMusicVolume / 100}`);
  return args;
}
