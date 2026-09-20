'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { derivePexelsSceneKeyword } from '@/src/domain/video/pexelsSceneMedia.js';

export function usePexelsMediaSearch({
  isOpen,
  sceneNumber,
  scenePrompt,
  sceneNarration,
  mediaType,
  orientation,
  onSearchReset
}) {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeSearch, setActiveSearch] = useState(null);
  const [aiKeywords, setAiKeywords] = useState([]);
  const [isFetchingAiKeywords, setIsFetchingAiKeywords] = useState(false);
  const searchAbortRef = useRef(null);
  const suggestionAbortRef = useRef(null);
  const searchRequestIdRef = useRef(0);
  const automaticSearchSupersededRef = useRef(false);
  const userChangedQueryRef = useRef(false);
  const searchContextRef = useRef({ mediaType, orientation });
  const sceneInputRef = useRef({ scenePrompt, sceneNarration });
  const onSearchResetRef = useRef(onSearchReset);
  searchContextRef.current = { mediaType, orientation };
  sceneInputRef.current = { scenePrompt, sceneNarration };
  onSearchResetRef.current = onSearchReset;

  const setQuery = useCallback((nextQuery) => {
    userChangedQueryRef.current = true;
    setQueryState(nextQuery);
  }, []);

  const fetchPexelsData = useCallback(async (
    rawQuery,
    type,
    orient,
    requestedPage = 1,
    { automatic = false } = {}
  ) => {
    const normalizedQuery = String(rawQuery || '').trim();
    if (!normalizedQuery) return false;

    // Any explicit search/filter action owns the result list from this point on.
    // Do not let the slower scene-keyword bootstrap overwrite it afterwards.
    if (!automatic) {
      automaticSearchSupersededRef.current = true;
      suggestionAbortRef.current?.abort();
      setIsFetchingAiKeywords(false);
    }

    const requestId = ++searchRequestIdRef.current;
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    if (requestedPage === 1) {
      setLoading(true);
      setHasMore(false);
      setResults([]);
      setActiveSearch({ query: normalizedQuery, type, orientation: orient });
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const orientationParam = orient ? `&orientation=${orient}` : '';
      const response = await fetch(`/api/prompts/pexels?query=${encodeURIComponent(normalizedQuery)}&type=${type}&page=${requestedPage}${orientationParam}`, {
        signal: controller.signal
      });
      const data = await response.json();
      if (requestId !== searchRequestIdRef.current) return false;
      if (!response.ok || !data.success) {
        setError(data.error || 'Lỗi tìm kiếm từ Pexels');
        return false;
      }

      const list = type === 'videos' ? data.data?.videos : data.data?.photos;
      if (requestedPage === 1) {
        setResults(list || []);
      } else {
        setResults(previous => {
          const byId = new Map(previous.map(item => [item.id, item]));
          for (const item of list || []) byId.set(item.id, item);
          return [...byId.values()];
        });
      }
      setHasMore(Boolean(data.data?.next_page) && (list || []).length > 0);
      return true;
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') setError('Lỗi kết nối máy chủ Pexels');
      return false;
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    // Invalidate a request from the previously opened scene before the browser paints
    // any response from it into this scene.
    searchRequestIdRef.current += 1;
    searchAbortRef.current?.abort();
    const suggestionController = new AbortController();
    suggestionAbortRef.current = suggestionController;
    const currentSceneInput = sceneInputRef.current;
    userChangedQueryRef.current = false;
    automaticSearchSupersededRef.current = false;
    const initialKeyword = derivePexelsSceneKeyword({
      narration: currentSceneInput.sceneNarration,
      visualPrompt: currentSceneInput.scenePrompt
    });
    setQueryState(initialKeyword);
    setResults([]);
    setError('');
    setAiKeywords([]);
    setPage(1);
    onSearchResetRef.current?.();
    // Keep the old scene completely hidden while resolving the best keyword. The media
    // request is intentionally made once, after this bootstrap has finished.
    setLoading(true);
    setIsFetchingAiKeywords(true);
    const initializeSceneSearch = async () => {
      let keywordToSearch = initialKeyword;
      try {
        const response = await fetch('/api/prompts/pexels/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: suggestionController.signal,
          body: JSON.stringify({
            title: `Scene ${sceneNumber}`,
            segments: [{
              segmentNumber: sceneNumber,
              narration: currentSceneInput.sceneNarration,
              visualPrompt: currentSceneInput.scenePrompt
            }]
          })
        });
        const data = await response.json();
        const keyword = data?.segmentKeywords?.[0]?.keyword;
        if (data?.success && keyword) {
          setAiKeywords([keyword]);
          if (!userChangedQueryRef.current) {
            keywordToSearch = keyword;
          }
        }
      } catch (requestError) {
        if (requestError?.name === 'AbortError') return;
        setAiKeywords([]);
      } finally {
        if (!suggestionController.signal.aborted) setIsFetchingAiKeywords(false);
      }

      if (suggestionController.signal.aborted || automaticSearchSupersededRef.current) return;

      if (!userChangedQueryRef.current && keywordToSearch !== initialKeyword) {
        setQueryState(keywordToSearch);
      }

      if (!String(keywordToSearch || '').trim()) {
        setLoading(false);
        setError('Không tìm thấy từ khóa phù hợp cho cảnh này');
        return;
      }

      const currentContext = searchContextRef.current;
      await fetchPexelsData(
        keywordToSearch,
        currentContext.mediaType,
        currentContext.orientation,
        1,
        { automatic: true }
      );
    };
    initializeSceneSearch();

    return () => {
      suggestionController.abort();
      if (suggestionAbortRef.current === suggestionController) {
        suggestionAbortRef.current = null;
      }
      searchRequestIdRef.current += 1;
      searchAbortRef.current?.abort();
    };
    // Prompt và narration được lấy tại thời điểm mở modal. Không đưa chúng vào dependency:
    // parent có thể đồng bộ lại draft trong lúc effect đang set kết quả, khiến hai giá trị này
    // đổi qua lại và khởi tạo tìm kiếm vô hạn. Đóng/mở modal hoặc đổi cảnh vẫn chạy lại đầy đủ.
  }, [isOpen, sceneNumber, fetchPexelsData]);

  const handleSearchSubmit = (event) => {
    event?.preventDefault();
    setPage(1);
    onSearchReset?.();
    return fetchPexelsData(query, mediaType, orientation, 1);
  };

  const handleLoadMore = async () => {
    if (!activeSearch || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    const loaded = await fetchPexelsData(activeSearch.query, activeSearch.type, activeSearch.orientation, nextPage);
    if (loaded) setPage(nextPage);
  };

  return {
    query,
    setQuery,
    results,
    loading,
    loadingMore,
    error,
    page,
    setPage,
    hasMore,
    activeSearch,
    aiKeywords,
    isFetchingAiKeywords,
    fetchPexelsData,
    handleSearchSubmit,
    handleLoadMore
  };
}
