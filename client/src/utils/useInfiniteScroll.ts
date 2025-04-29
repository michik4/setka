import { useEffect, useState, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  // Порог в пикселях до конца страницы, при котором начинается загрузка
  threshold?: number;
  // Изначальное значение страницы
  initialPage?: number;
  // Функция загрузки данных
  loadMore: (page: number) => Promise<any>;
  // Размер страницы
  pageSize?: number;
  // Функция для определения, есть ли еще данные для загрузки
  hasMore: (data: any) => boolean;
}

export const useInfiniteScroll = <T>({
  threshold = 300,
  initialPage = 0,
  loadMore,
  pageSize = 10,
  hasMore
}: UseInfiniteScrollOptions) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [hasMoreData, setHasMoreData] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  const fetchData = useCallback(async (pageNum: number) => {
    if (!hasMoreData) return;
    
    try {
      setLoading(true);
      setError(null);
      const newData = await loadMore(pageNum);
      
      setData(prevData => {
        // Если это первая страница, замещаем данные
        if (pageNum === initialPage) {
          return newData;
        }
        // Иначе добавляем к существующим
        return [...prevData, ...newData];
      });
      
      setHasMoreData(hasMore(newData));
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  }, [hasMoreData, loadMore, hasMore, initialPage]);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    loadingRef.current = node;
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreData && !loading) {
        setPage(prevPage => prevPage + 1);
      }
    }, { rootMargin: `0px 0px ${threshold}px 0px` });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMoreData, threshold]);

  // Загрузка данных при изменении страницы
  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  // Очистка observer при размонтировании
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  const reset = useCallback(() => {
    setData([]);
    setPage(initialPage);
    setHasMoreData(true);
    setError(null);
  }, [initialPage]);

  return {
    data,
    loading,
    error,
    hasMore: hasMoreData,
    lastElementRef,
    reset
  };
}; 