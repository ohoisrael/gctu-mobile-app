import React, { useEffect, useState, useCallback, useRef, memo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import Header from '@/components/Header';
import axios from 'axios';
import { NewsDataType } from '@/types';
import Loading from '@/components/Loading';
import Categories from '@/components/Categories';
import NewsList from '@/components/NewsList';
import BreakingNews from '@/components/BreakingNews';
import { EXPO_API_URL } from '@env';
import { useUser } from '@/context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';
import { Colors } from '@/constants/Colors';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { initSocket, disconnectSocket, getSocket } from '@/services/socketService';

export default function HomePage() {
  const { top: safeTop } = useSafeAreaInsets();
  const { user, token, isLoggingOut } = useUser();
  const scrollRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();

  const [birthdayModalVisible, setBirthdayModalVisible] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [currentCategoryId, setCurrentCategoryId] = useState(0);
  const [resetSlider, setResetSlider] = useState(false);
  const limit = 10;

  // Set appRestarted flag on app launch
  useEffect(() => {
    const setAppRestarted = async () => {
      try {
        await AsyncStorage.setItem('appRestarted', 'true');
        console.log('HomePage: Set appRestarted flag');
      } catch (error) {
        console.error('HomePage: Error setting appRestarted flag', error);
      }
    };
    setAppRestarted();
  }, []);

  // Initialize WebSocket
  useEffect(() => {
    if (!token || isLoggingOut || !isFocused) return;
    const socket = initSocket(token);
    if (!socket) return;

    socket.on('news:deleted', ({ id }) => {
      console.log('Socket: News deleted', id);
      queryClient.setQueryData(['breakingNews', user?.id, token], (oldData: NewsDataType[] | undefined) => {
        if (!oldData) return [];
        const updatedData = oldData.filter((news) => news.id !== id);
        console.log('Updated breakingNews cache:', updatedData);
        return updatedData;
      });

      queryClient.setQueryData(['allNews', user?.id, token, currentCategoryId], (oldData: any) => {
        if (!oldData) return { pages: [{ news: [], hasMore: false }], pageParams: [0] };
        const updatedData = {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            news: page.news.filter((news: NewsDataType) => news.id !== id),
          })),
        };
        console.log('Updated allNews cache:', updatedData);
        return updatedData;
      });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['breakingNews', user?.id, token], exact: true });
        queryClient.invalidateQueries({ queryKey: ['allNews', user?.id, token, currentCategoryId], exact: true });
      }, 100);
    });

    socket.on('news:paused', ({ id, isPaused }) => {
      console.log('Socket: News paused', { id, isPaused });
      if (isPaused) {
        queryClient.setQueryData(['breakingNews', user?.id, token], (oldData: NewsDataType[] | undefined) => {
          if (!oldData) return [];
          const updatedData = oldData.filter((news) => news.id !== id);
          console.log('Paused breakingNews cache:', updatedData);
          return updatedData;
        });

        queryClient.setQueryData(['allNews', user?.id, token, currentCategoryId], (oldData: any) => {
          if (!oldData) return { pages: [{ news: [], hasMore: false }], pageParams: [0] };
          const updatedData = {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              news: page.news.filter((news: NewsDataType) => news.id !== id),
            })),
          };
          console.log('Paused allNews cache:', updatedData);
          return updatedData;
        });
      } else {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['breakingNews', user?.id, token], exact: true });
          queryClient.invalidateQueries({ queryKey: ['allNews', user?.id, token, currentCategoryId], exact: true });
        }, 100);
      }
    });

    socket.on('news:updated', ({ id, ...updatedData }) => {
      console.log('Socket: News updated', { id, updatedData });
      queryClient.setQueryData(['breakingNews', user?.id, token], (oldData: NewsDataType[] | undefined) => {
        if (!oldData) return [];
        const updatedData = oldData.map((news) => (news.id === id ? { ...news, ...updatedData } : news));
        console.log('Updated breakingNews cache:', updatedData);
        return updatedData;
      });

      queryClient.setQueryData(['allNews', user?.id, token, currentCategoryId], (oldData: any) => {
        if (!oldData) return { pages: [{ news: [], hasMore: false }], pageParams: [0] };
        const updatedData = {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            news: page.news.map((news: NewsDataType) =>
              news.id === id ? { ...news, ...updatedData } : news
            ),
          })),
        };
        console.log('Updated allNews cache:', updatedData);
        return updatedData;
      });

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['breakingNews', user?.id, token], exact: true });
        queryClient.invalidateQueries({ queryKey: ['allNews', user?.id, token, currentCategoryId], exact: true });
      }, 100);
    });

    return () => {
      socket.off('news:deleted');
      socket.off('news:paused');
      socket.off('news:updated');
    };
  }, [token, isLoggingOut, user?.id, queryClient, currentCategoryId, isFocused]);

  useEffect(() => {
    if (isLoggingOut) {
      disconnectSocket();
    }
  }, [isLoggingOut]);

  const isUserBirthday = () => {
    if (!user?.dateOfBirth || isLoggingOut) return false;
    const today = new Date();
    const dob = new Date(user.dateOfBirth);
    return (
      today.getDate() === dob.getDate() &&
      today.getMonth() === dob.getMonth()
    );
  };

  const checkBirthdayShown = async () => {
    if (!user?.id || !isUserBirthday()) return;
    const year = new Date().getFullYear();
    const key = `birthdayShown_${user.id}_${year}`;
    const shown = await AsyncStorage.getItem(key);
    if (!shown) {
      setBirthdayModalVisible(true);
      await AsyncStorage.setItem(key, 'true');
    }
  };

  const clearOldBirthdayFlags = async () => {
    if (!user?.id || isLoggingOut) return;
    const year = new Date().getFullYear();
    const prevYearKey = `birthdayShown_${user.id}_${year - 1}`;
    await AsyncStorage.removeItem(prevYearKey);
  };

  const { data: breakingNews = [], isLoading: isLoadingBreaking } = useQuery({
    queryKey: ['breakingNews', user?.id, token],
    queryFn: async () => {
      if (!user || !token || isLoggingOut) {
        console.log('HomePage: Skipping getBreakingNews', { user: !!user, token: !!token, isLoggingOut });
        return [];
      }
      const URL = `${EXPO_API_URL}/api/news/user?limit=10`;
      const response = await axios.get(URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('HomePage: Fetched breaking news', { count: response.data.news?.length });
      const seenIds = new Set();
      const validNews = (response.data.news || []).filter((news: NewsDataType) => {
        if (
          !news.id ||
          !news.Category ||
          !news.Category.name ||
          news.isPaused ||
          seenIds.has(news.id)
        ) {
          if (seenIds.has(news.id)) {
            console.warn(`Duplicate news ID found in breakingNews: ${news.id}`);
          }
          return false;
        }
        seenIds.add(news.id);
        return true;
      });
      return validNews;
    },
    enabled: !!user && !!token && !isLoggingOut && isFocused,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 1,
    onError: (err: any) => {
      console.error('Error fetching breaking news:', err.message);
      Alert.alert('Error', 'Failed to load breaking news.');
    },
  });

  const {
    data: allNewsData,
    fetchNextPage,
    hasNextPage,
    isFetching: isFetchingAllNews,
    isLoading: isLoadingAllNews,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['allNews', user?.id, token, currentCategoryId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user || !token || isLoggingOut) {
        console.log('HomePage: Skipping getAllNews', { user: !!user, token: !!token, isLoggingOut });
        return { news: [], hasMore: false };
      }
      const URL = currentCategoryId === 0
        ? `${EXPO_API_URL}/api/news/user?limit=${limit}&offset=${pageParam}`
        : `${EXPO_API_URL}/api/news/user?limit=${limit}&offset=${pageParam}&categoryId=${currentCategoryId}`;
      console.log('Fetching news:', URL);
      const response = await axios.get(URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const seenIds = new Set();
      const validNews = (response.data.news || []).filter((news: NewsDataType) => {
        if (
          !news.id ||
          !news.Category ||
          !news.Category.name ||
          news.isPaused ||
          seenIds.has(news.id)
        ) {
          if (seenIds.has(news.id)) {
            console.warn(`Duplicate news ID found in allNews: ${news.id}`);
          }
          return false;
        }
        seenIds.add(news.id);
        return true;
      });
      return {
        news: validNews,
        hasMore: response.data.hasMore || false,
        nextOffset: pageParam + limit,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextOffset : undefined;
    },
    enabled: !!user && !!token && !isLoggingOut && isFocused,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 1,
    onError: (err: any) => {
      console.error('Error fetching all news:', err.message);
      Alert.alert('Error', 'Failed to load news.');
    },
  });

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      if (user && token && !isLoggingOut) {
        console.log('HomePage: Invalidating queries on focus');
        queryClient.invalidateQueries({ queryKey: ['breakingNews', user?.id, token], exact: true });
        queryClient.invalidateQueries({ queryKey: ['allNews', user?.id, token, currentCategoryId], exact: true });
      }
      return () => {
        setIsScreenFocused(false);
      };
    }, [user, token, isLoggingOut, queryClient, currentCategoryId])
  );

  const onCatChanged = async (categoryId: number) => {
    if (!user || !token || isLoggingOut) {
      console.log('HomePage: Skipping onCatChanged', { user: !!user, token: !!token, isLoggingOut });
      return;
    }
    console.log('HomePage: Category changed', { categoryId, isFetchingAllNews });
    setCurrentCategoryId(categoryId);
    queryClient.invalidateQueries({
      queryKey: ['allNews', user?.id, token, categoryId],
      exact: true,
    });
  };

  const onRefresh = useCallback(async () => {
    if (!user || !token || isLoggingOut) {
      console.log('HomePage: Skipping onRefresh', { user: !!user, token: !!token, isLoggingOut });
      return;
    }
    console.log('HomePage: Refreshing data and resetting slider');
    try {
      await AsyncStorage.removeItem('breakingNewsIndex');
      console.log('HomePage: Cleared breakingNewsIndex');
      setResetSlider(true); // Trigger slider reset
    } catch (error) {
      console.error('HomePage: Error clearing breakingNewsIndex', error);
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['breakingNews', user?.id, token], exact: true }),
      refetch(),
    ]);
    setResetSlider(false); // Reset the flag after refresh
  }, [user, token, isLoggingOut, queryClient, refetch]);

  useEffect(() => {
    if (!user || !token || isLoggingOut) {
      console.log('HomePage: Skipping initial setup', { user: !!user, token: !!token, isLoggingOut });
      return;
    }
    clearOldBirthdayFlags();
    checkBirthdayShown();
  }, [user, token, isLoggingOut]);

  const news = allNewsData?.pages.flatMap((page) => page.news) || [];

  console.log('HomePage: Render', { isLoadingBreaking, isLoadingAllNews, isFetchingAllNews, newsCount: news.length, hasNextPage, resetSlider });

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={[styles.container, { paddingTop: safeTop }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingBreaking || isLoadingAllNews}
            onRefresh={onRefresh}
          />
        }
        scrollEventThrottle={16}
      >
        <Header />
        {isLoadingBreaking ? (
          <Loading size={'large'} />
        ) : (
          <MemoizedBreakingNews newsList={breakingNews} isScreenFocused={isScreenFocused} resetSlider={resetSlider} />
        )}
        <Categories onCategoryChanged={onCatChanged} />
        {isFetchingAllNews && news.length === 0 ? (
          <Loading size={'large'} />
        ) : (
          <NewsList
            newsList={news}
            isFetchingMore={isFetchingAllNews}
            onEndReached={() => {
              if (hasNextPage && !isFetchingAllNews) {
                console.log('HomePage: Triggering fetchNextPage');
                fetchNextPage();
              }
            }}
          />
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={birthdayModalVisible}
        onRequestClose={() => setBirthdayModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Animatable.Image
              animation="bounceInUp"
              duration={2000}
              source={require('@/assets/images/baloon.jpg')}
              style={[styles.balloon, { left: 20, top: -50 }]}
            />
            <Animatable.Image
              animation="bounceInUp"
              delay={500}
              duration={2000}
              source={require('@/assets/images/baloon.jpg')}
              style={[styles.balloon, { right: 20, top: -70 }]}
            />
            <Animatable.Image
              animation="bounceInUp"
              delay={1000}
              duration={2000}
              source={require('@/assets/images/baloon.jpg')}
              style={[styles.balloon, { left: 50, top: -90 }]}
            />
            <Text style={styles.modalTitle}>
              Happy Birthday {user?.firstName} {user?.lastName}!
            </Text>
            <Text style={styles.modalSubtitle}>
              Wishing you a fantastic year ahead!
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setBirthdayModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const MemoizedBreakingNews = memo(BreakingNews, (prevProps, nextProps) => (
  prevProps.newsList === nextProps.newsList &&
  prevProps.isScreenFocused === nextProps.isScreenFocused &&
  prevProps.resetSlider === nextProps.resetSlider
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    margin: 20,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    position: 'relative',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.darkGrey,
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: Colors.gtcolor,
    padding: 10,
    borderRadius: 5,
    width: 100,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  balloon: {
    width: 50,
    height: 50,
    position: 'absolute',
  },
});