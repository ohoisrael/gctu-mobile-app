import { FlatList, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import React, { useEffect } from 'react';
import { Link, Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import Loading from '@/components/Loading';
import { NewsItem } from '@/components/NewsList';
import { useUser } from '@/context/UserContext';
import { EXPO_API_URL } from '@env';
import LottieView from 'lottie-react-native';
import { getSocket } from '@/services/socketService';

type Props = {};

const Page = (props: Props) => {
  const isFocused = useIsFocused();
  const { user, token } = useUser();
  const queryClient = useQueryClient();

  // WebSocket event listeners
  useEffect(() => {
    if (!token || !isFocused) return;
    const socket = getSocket();
    if (!socket) return;

    socket.on('news:deleted', ({ id: deletedId }) => {
      console.log('Socket: News deleted', deletedId);
      queryClient.setQueryData(['bookmarks', user?.id], (oldData: any[] | undefined) => {
        if (!oldData) return [];
        const updatedData = oldData.filter((news) => news.id !== deletedId);
        console.log('Updated bookmarks cache (deleted):', updatedData);
        return updatedData;
      });
      // No immediate invalidate for deletion to ensure UI update
    });

    socket.on('news:paused', ({ id: pausedId, isPaused }) => {
      console.log('Socket: News paused', { pausedId, isPaused });
      if (isPaused) {
        queryClient.setQueryData(['bookmarks', user?.id], (oldData: any[] | undefined) => {
          if (!oldData) return [];
          const updatedData = oldData.filter((news) => news.id !== pausedId);
          console.log('Updated bookmarks cache (paused):', updatedData);
          return updatedData;
        });
      }
      // Delay invalidate for resume to refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id], exact: true });
      }, 100);
    });

    socket.on('news:updated', ({ id: updatedId, ...updatedData }) => {
      console.log('Socket: News updated', { updatedId, updatedData });
      queryClient.setQueryData(['bookmarks', user?.id], (oldData: any[] | undefined) => {
        if (!oldData) return [];
        const updatedData = oldData.map((news) => (news.id === updatedId ? { ...news, ...updatedData } : news));
        console.log('Updated bookmarks cache (updated):', updatedData);
        return updatedData;
      });
      // Delay invalidate to ensure UI updates and refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id], exact: true });
      }, 200);
    });

    return () => {
      socket.off('news:deleted');
      socket.off('news:paused');
      socket.off('news:updated');
    };
  }, [token, isFocused, queryClient, user?.id]);

  // Invalidate cache on focus
  useFocusEffect(
    React.useCallback(() => {
      if (user && token) {
        console.log('saved.tsx: Invalidating bookmarks cache on focus');
        queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id], exact: true });
      }
    }, [user, token, queryClient])
  );

  // Fetch bookmarked news using React Query
  const { data: bookmarkNews = [], isLoading } = useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user?.id || !token) {
        console.log('saved.tsx: Skipping fetch bookmarks', { userId: user?.id, token: !!token });
        return [];
      }

      // Fetch bookmarks with associated news
      const bookmarkResponse = await axios.get(`${EXPO_API_URL}/api/bookmarks/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const bookmarks = bookmarkResponse.data;
      if (bookmarks.length === 0) {
        console.log('saved.tsx: No bookmarks found');
        return [];
      }

      // Map and filter unique, valid news items
      const seenIds = new Set();
      const newsItems = bookmarks
        .filter((bookmark: any) => {
          if (
            !bookmark.News ||
            bookmark.News.isPaused ||
            !bookmark.News.Category ||
            !bookmark.News.Category.name ||
            !bookmark.News.id ||
            !bookmark.News.title ||
            seenIds.has(bookmark.News.id)
          ) {
            if (seenIds.has(bookmark.News.id)) {
              console.warn(`Duplicate news ID found: ${bookmark.News.id}`);
            }
            return false;
          }
          seenIds.add(bookmark.News.id);
          return true;
        })
        .map((bookmark: any) => ({
          ...bookmark.News,
          bookmarkCreatedAt: bookmark.createdAt,
        }));

      console.log('Fetched bookmarks:', newsItems);
      return newsItems;
    },
    enabled: !!user?.id && !!token && isFocused,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 1,
    onError: (error) => {
      console.error('Error fetching bookmarks:', error);
    },
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: true }} />
      <View style={styles.container}>
        {isLoading ? (
          <Loading size="large" />
        ) : bookmarkNews.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LottieView
              source={require('@/assets/lottie/empty-bookmark.json')}
              autoPlay
              loop
              style={styles.lottie}
            />
            <Text style={styles.emptyText}>No bookmarks yet!</Text>
          </View>
        ) : (
          <FlatList
            data={bookmarkNews}
            keyExtractor={(item, index) => `${item.id}_${item.bookmarkCreatedAt}_${index}`}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Link href={`/news/${item.id}`} asChild>
                <TouchableOpacity>
                  <NewsItem item={item} />
                </TouchableOpacity>
              </Link>
            )}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={7}
          />
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 200,
    height: 200,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
});

export default Page;