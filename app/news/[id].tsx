import React, { useCallback, useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { WebView } from 'react-native-webview';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import RNModal from 'react-native-modal';
import ImageViewer from 'react-native-image-zoom-viewer';
import Loading from '@/components/Loading';
import { Colors } from '@/constants/Colors';
import { useUser } from '@/context/UserContext';
import LikeCommentSection from '@/components/LikeCommentSection';
import moment from 'moment';
import { EXPO_API_URL } from '@env';
import LottieView from 'lottie-react-native';
import { useIsFocused } from '@react-navigation/native';
import { getSocket } from '@/services/socketService';

const { width, height } = Dimensions.get('window');

const NewsDetails = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user, token } = useUser();
  const isFocused = useIsFocused();
  const [webViewHeights, setWebViewHeights] = useState<{ [key: number]: number }>({});
  const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
  const [isDocumentModalVisible, setIsDocumentModalVisible] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isNotFound, setIsNotFound] = useState(false);

  // WebSocket event listeners
  useEffect(() => {
    if (!token || !isFocused) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewsDeleted = ({ id: deletedId }: { id: number }) => {
      if (parseInt(id) === deletedId) {
        console.log('Socket: News deleted', deletedId);
        setIsNotFound(true);
      }
    };

    const handleNewsPaused = ({ id: pausedId, isPaused }: { id: number; isPaused: boolean }) => {
      if (parseInt(id) === pausedId && isPaused) {
        console.log('Socket: News paused', pausedId);
        setIsNotFound(true);
      }
    };

    const handleNewsUpdated = ({ id: updatedId }: { id: number }) => {
      if (parseInt(id) === updatedId) {
        console.log('Socket: News updated', updatedId);
        queryClient.invalidateQueries({ queryKey: ['news', id] });
        queryClient.invalidateQueries({ queryKey: ['likes', id] });
      }
    };

    socket.on('news:deleted', handleNewsDeleted);
    socket.on('news:paused', handleNewsPaused);
    socket.on('news:updated', handleNewsUpdated);

    return () => {
      socket.off('news:deleted', handleNewsDeleted);
      socket.off('news:paused', handleNewsPaused);
      socket.off('news:updated', handleNewsUpdated);
    };
  }, [token, isFocused, id, queryClient]);

  // Fetch news details
  const { data: news, isLoading, error } = useQuery({
    queryKey: ['news', id],
    queryFn: async () => {
      const response = await axios.get(`${EXPO_API_URL}/api/news/news/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token && !!id,
    onError: (error: any) => {
      console.error('Error fetching news by ID:', error);
      if (error.response?.status === 404) {
        setIsNotFound(true);
      } else {
        Alert.alert('Error', 'Failed to load news details');
      }
    },
  });

  // Fetch likes
  const { data: likesData } = useQuery({
    queryKey: ['likes', id],
    queryFn: async () => {
      const response = await axios.get(`${EXPO_API_URL}/api/likes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!token && !!id && !!news && !isNotFound,
    onError: (error) => {
      console.error('Error fetching likes:', error);
    },
  });

  // Fetch bookmark status
  const { data: isBookmarked } = useQuery({
    queryKey: ['bookmark', id, user?.id],
    queryFn: async () => {
      const response = await axios.get(`${EXPO_API_URL}/api/bookmarks/${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.some((bookmark: { newsId: number }) => bookmark.newsId === Number(id));
    },
    enabled: !!user?.id && !!token && !!id && !!news && !isNotFound,
    onError: (error) => {
      console.error('Error checking bookmark status:', error);
    },
  });

  // Toggle like mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${EXPO_API_URL}/api/likes/${id}`,
        { userId: user?.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['likes', id], data);
    },
    onError: (error) => {
      console.error('Error toggling like:', error);
    },
  });

  // Save bookmark mutation
  const saveBookmarkMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${EXPO_API_URL}/api/bookmarks`,
        { newsId: Number(id) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['bookmarks', user?.id] });
      const previousBookmarks = queryClient.getQueryData(['bookmarks', user?.id]) || [];
      queryClient.setQueryData(['bookmarks', user?.id], [...previousBookmarks, news]);
      queryClient.setQueryData(['bookmark', id, user?.id], true);
      return { previousBookmarks };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData(['bookmarks', user?.id], context?.previousBookmarks);
      queryClient.setQueryData(['bookmark', id, user?.id], false);
      console.error('Failed to add bookmark:', error);
      Alert.alert('Error', 'Failed to save news');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
      Alert.alert('Success', 'News Bookmarked!');
    },
  });

  // Remove bookmark mutation
  const removeBookmarkMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`${EXPO_API_URL}/api/bookmarks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['bookmarks', user?.id] });
      const previousBookmarks = queryClient.getQueryData(['bookmarks', user?.id]) || [];
      const updatedBookmarks = previousBookmarks.filter((item: any) => item.id !== Number(id));
      queryClient.setQueryData(['bookmarks', user?.id], updatedBookmarks);
      queryClient.setQueryData(['bookmark', id, user?.id], false);
      return { previousBookmarks };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData(['bookmarks', user?.id], context?.previousBookmarks);
      queryClient.setQueryData(['bookmark', id, user?.id], true);
      console.error('Failed to remove bookmark:', error);
      Alert.alert('Error', 'Failed to unsave news');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
      Alert.alert('Success', 'Unbookmarked!');
    },
  });

  // Save image mutation
  const saveImageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission Denied: Please grant permission to save images to your gallery.');
      }
      const fileUri = `${FileSystem.cacheDirectory}news_image_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);
      await MediaLibrary.createAssetAsync(uri);
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      return true;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Image saved to gallery!');
    },
    onError: (error: any) => {
      console.error('Error saving image:', error);
      Alert.alert('Error', error.message || 'Failed to save image. Please try again.');
    },
  });

  // Save document mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async ({ docUrl, fileName }: { docUrl: string; fileName: string }) => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission Denied: Please grant permission to save documents.');
      }
      const extension = docUrl.split('.').pop()?.toLowerCase() || 'pdf';
      const validExtensions = ['pdf', 'doc', 'docx'];
      if (!validExtensions.includes(extension)) {
        throw new Error(`Unsupported file extension: ${extension}. Only PDF and Word documents are supported.`);
      }
      const mimeType = {
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }[extension];
      const baseFileName = fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileUri = `${FileSystem.cacheDirectory}${baseFileName}.${extension}`;
      console.log(`Downloading document: ${docUrl} to ${fileUri}`);
      const downloadResult = await FileSystem.downloadAsync(docUrl, fileUri, {
        headers: { Accept: mimeType },
      });
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri, { size: true });
      if (!fileInfo.exists || fileInfo.size === 0) {
        throw new Error('Downloaded file is missing or empty');
      }
      if (extension === 'pdf') {
        const fileContent = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Binary,
          length: 4,
        });
        const isValidPDF = fileContent.startsWith('%PDF');
        if (!isValidPDF) {
          throw new Error('Downloaded file is not a valid PDF');
        }
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType,
          dialogTitle: `Save or share ${extension.toUpperCase()}`,
        });
        return { shared: true, fileName: `${baseFileName}.${extension}` };
      } else {
        const fallbackUri = `${FileSystem.documentDirectory}${baseFileName}.${extension}`;
        await FileSystem.moveAsync({
          from: downloadResult.uri,
          to: fallbackUri,
        });
        return { shared: false, fileName: `${baseFileName}.${extension}` };
      }
    },
    onSuccess: (result) => {
      if (result.shared) {
        Alert.alert(
          'Document Shared',
          `Document "${result.fileName}" opened for sharing. Save it to Files or another app.`
        );
      } else {
        Alert.alert(
          'Saved to App Storage',
          `Document "${result.fileName}" saved to app storage. Check your Files app under On My iPhone/GCTU News App.`
        );
      }
    },
    onError: (error: any) => {
      console.error('Error saving document:', error);
      Alert.alert('Error', `Failed to save document: ${error.message}`);
    },
    onSettled: (_, __, ___, context) => {
      if (context?.fileUri) {
        FileSystem.deleteAsync(context.fileUri, { idempotent: true });
      }
    },
  });

  const viewDocument = async (docUrl: string) => {
    try {
      const fileName = docUrl.split('/').pop() || 'document';
      const extension = docUrl.split('.').pop()?.toLowerCase();
      const viewableTypes = ['pdf', 'doc', 'docx'];
      if (viewableTypes.includes(extension)) {
        const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(docUrl)}`;
        setSelectedDocumentUrl(viewerUrl);
        setIsDocumentModalVisible(true);
      } else {
        Alert.alert(
          'Unsupported File Type',
          'This document type is not viewable in the app. Would you like to download it instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Download',
              onPress: () => saveDocumentMutation.mutate({ docUrl, fileName }),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Failed to open document. Try downloading instead.');
    }
  };

  const viewImage = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageModalVisible(true);
  };

  const getFileIcon = (extension: string) => {
    switch (extension.toLowerCase()) {
      case 'pdf':
        return 'document-text';
      case 'doc':
      case 'docx':
        return 'document';
      default:
        return 'document-outline';
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    switch (item.type) {
      case 'header':
        return (
          <>
            <Text style={styles.title}>{news?.title}</Text>
            <View style={styles.newsInfoWrapper}>
              <Text style={styles.newsInfo}>{news?.publishedBy}</Text>
              <Text style={styles.newsInfo}>
                {news?.createdAt ? moment(news.createdAt).fromNow() : 'Unknown Date'}
              </Text>
            </View>
          </>
        );
      case 'section':
        const htmlContent = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-size: 14px;
                  color: #555;
                  letter-spacing: 0.8px;
                  line-height: 22px;
                  margin: 0;
                  padding: 0;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                }
                p { margin: 8px 0; }
                strong { font-weight: bold; }
                em { font-style: italic; }
                u { text-decoration: underline; }
                li { margin-left: 20px; }
                img { width: 100%; height: auto; borderRadius: 10px; display: block; }
              </style>
            </head>
            <body>
              ${item.text || '<p>No content available</p>'}
            </body>
          </html>
        `;
        return (
          <View style={styles.section}>
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              style={[styles.webView, { height: webViewHeights[index] || 100 }]}
              scalesPageToFit={false}
              scrollEnabled={false}
              automaticallyAdjustContentInsets={false}
              onMessage={(event) => {
                const height = parseInt(event.nativeEvent.data, 10);
                if (height && height > 0) {
                  setWebViewHeights((prev) => ({ ...prev, [index]: height }));
                }
              }}
              injectedJavaScript={`
                window.ReactNativeWebView.postMessage(
                  Math.max(
                    document.body.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.clientHeight,
                    document.documentElement.scrollHeight,
                    document.documentElement.offsetHeight
                  ).toString()
                );
                true;
              `}
              onError={(syntheticEvent) => {
                console.error('WebView error:', syntheticEvent.nativeEvent);
              }}
            />
            {item.imageIndices?.length > 0 && (
              <FlatList
                data={item.imageIndices}
                renderItem={({ item: idx }) =>
                  news?.images && news.images[idx] ? (
                    <TouchableOpacity
                      onPress={() => viewImage(idx)}
                      style={styles.imageWrapper}
                    >
                      <Image
                        source={{ uri: news.images[idx] }}
                        style={styles.newsImg}
                        onError={() => console.log(`Failed to load image ${news.images[idx]}`)}
                      />
                    </TouchableOpacity>
                  ) : null
                }
                keyExtractor={(idx) => `image-${idx}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageContainer}
                snapToInterval={width * 0.8 + 10}
                decelerationRate="fast"
              />
            )}
            {item.documentIndices?.length > 0 && news?.documents?.length > 0 && (
              <View style={styles.documentContainer}>
                {item.documentIndices.map((idx: number) =>
                  news?.documents && news.documents[idx] ? (
                    <View key={`doc-${idx}`} style={styles.documentItem}>
                      <Ionicons
                        name={getFileIcon(news.documents[idx].split('.').pop() || '')}
                        size={40}
                        color={Colors.primary}
                        style={styles.documentIcon}
                      />
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentName}>
                          {news.documents[idx].split('/').pop() || `Document ${idx + 1}`}
                        </Text>
                        <Text style={styles.documentType}>
                          {news.documents[idx].split('.').pop()?.toUpperCase() || 'FILE'}
                        </Text>
                      </View>
                      <View style={styles.documentActions}>
                        <TouchableOpacity
                          onPress={() => viewDocument(news.documents[idx])}
                          style={styles.documentActionButton}
                        >
                          <Ionicons name="eye-outline" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            saveDocumentMutation.mutate({
                              docUrl: news.documents[idx],
                              fileName: news.documents[idx].split('/').pop() || `doc_${idx + 1}`,
                            })
                          }
                          style={styles.documentActionButton}
                        >
                          <Ionicons name="download-outline" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text key={`doc-error-${idx}`} style={styles.documentError}>
                      Document at index {idx} not found
                    </Text>
                  )
                )}
              </View>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  const data = news?.content
    ? [
        { type: 'header' },
        ...Array.isArray(news.content)
          ? news.content.map((section: any) => ({ type: 'section', ...section }))
          : [{ type: 'section', text: news.content || 'No content', imageIndices: [], documentIndices: [] }],
      ]
    : [
        { type: 'header' },
        { type: 'section', text: 'No content available', imageIndices: [], documentIndices: [] },
      ];

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() =>
                isBookmarked
                  ? removeBookmarkMutation.mutate()
                  : saveBookmarkMutation.mutate()
              }
              style={{ flexDirection: 'row', alignItems: 'center' }}
              disabled={!news || !user || saveBookmarkMutation.isPending || removeBookmarkMutation.isPending || isNotFound}
            >
              <Ionicons
                name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isBookmarked ? 'red' : Colors.black}
              />
              <Text style={{ marginLeft: 8, fontSize: 14 }}>
                {isBookmarked ? 'Remove' : 'Bookmark'}
              </Text>
            </TouchableOpacity>
          ),
          title: '',
        }}
      />
      <View style={styles.container}>
        {isLoading ? (
          <Loading size="large" />
        ) : isNotFound ? (
          <View style={styles.notFoundContainer}>
            <LottieView
               source={require("@/assets/lottie/empty-bookmark.json")}
              autoPlay
              loop
              style={styles.lottie}
            />
            <Text style={styles.notFoundText}>News not found or unavailable</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={data}
              renderItem={renderItem}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.contentContainer}
              style={styles.flatList}
            />
            {news && user && (
              <LikeCommentSection
                newsId={Number(id)}
                userId={user.id}
                isModalVisible={isCommentsModalVisible}
                setIsModalVisible={setIsCommentsModalVisible}
                toggleLike={() => toggleLikeMutation.mutate()}
                likes={likesData?.likesCount || 0}
                isLiked={likesData?.isLiked || false}
              />
            )}
            <View style={styles.fixedFooter}>
              <TouchableOpacity
                onPress={() => toggleLikeMutation.mutate()}
                style={[styles.footerButton, styles.likeButton]}
                disabled={!user || toggleLikeMutation.isPending}
              >
                <Ionicons
                  name={likesData?.isLiked ? 'thumbs-up' : 'thumbs-down'}
                  size={24}
                  color={likesData?.isLiked ? Colors.tint : Colors.black}
                />
                <Text style={styles.footerButtonText}>{likesData?.likesCount || 0} Likes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsCommentsModalVisible(true)}
                style={[styles.footerButton, styles.commentsButton]}
                disabled={!user}
              >
                <Text style={styles.footerButtonText}>View Comments</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        <RNModal
          isVisible={isDocumentModalVisible}
          onBackdropPress={() => setIsDocumentModalVisible(false)}
          style={styles.modal}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setIsDocumentModalVisible(false)}
              >
                <Ionicons name="close-circle" size={32} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {selectedDocumentUrl?.split('/').pop()?.split('?')[0] || 'Document'}
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  if (selectedDocumentUrl) {
                    const originalUrl = selectedDocumentUrl.includes('docs.google.com')
                      ? decodeURIComponent(selectedDocumentUrl.split('url=')[1].split('&')[0])
                      : selectedDocumentUrl;
                    saveDocumentMutation.mutate({
                      docUrl: originalUrl,
                      fileName: originalUrl.split('/').pop() || 'document',
                    });
                  }
                }}
              >
                <Ionicons name="download" size={32} color={Colors.white} />
              </TouchableOpacity>
            </View>
            {selectedDocumentUrl && (
              <WebView
                source={{ uri: selectedDocumentUrl }}
                style={styles.modalWebView}
                scalesPageToFit={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                onError={(syntheticEvent) => {
                  const { nativeEvent } = syntheticEvent;
                  console.warn('Document WebView error:', nativeEvent);
                  Alert.alert(
                    'Error',
                    'Failed to load document. Would you like to download it instead?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Download',
                        onPress: () => {
                          if (selectedDocumentUrl) {
                            const originalUrl = selectedDocumentUrl.includes('docs.google.com')
                              ? decodeURIComponent(selectedDocumentUrl.split('url=')[1].split('&')[0])
                              : selectedDocumentUrl;
                            saveDocumentMutation.mutate({
                              docUrl: originalUrl,
                              fileName: originalUrl.split('/').pop() || 'document',
                            });
                          }
                        },
                      },
                    ]
                  );
                }}
              />
            )}
          </SafeAreaView>
        </RNModal>
        <RNModal
          isVisible={isImageModalVisible}
          onBackdropPress={() => setIsImageModalVisible(false)}
          style={styles.imageModal}
        >
          <SafeAreaView style={styles.imageModalContainer}>
            <View style={styles.imageModalHeader}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setIsImageModalVisible(false)}
              >
                <Ionicons name="close-circle" size={32} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.imageModalTitle}>
                Image {selectedImageIndex + 1} of {news?.images?.length || 1}
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  if (selectedImageIndex !== null && news?.images[selectedImageIndex]) {
                    saveImageMutation.mutate(news.images[selectedImageIndex]);
                  }
                }}
              >
                <Ionicons name="download" size={32} color={Colors.white} />
              </TouchableOpacity>
            </View>
            {news?.images && (
              <ImageViewer
                imageUrls={news.images.map((url: string) => ({ url }))}
                index={selectedImageIndex}
                onChange={(index?: number) => setSelectedImageIndex(index || 0)}
                enableSwipeDown={true}
                onSwipeDown={() => setIsImageModalVisible(false)}
                style={styles.imageViewer}
                backgroundColor="transparent"
                renderIndicator={() => null}
              />
            )}
          </SafeAreaView>
        </RNModal>
      </View>
    </>
  );
};

export default NewsDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flatList: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.black,
    marginVertical: 10,
    letterSpacing: 0.6,
  },
  newsInfoWrapper: {
    marginBottom: 20,
  },
  newsInfo: {
    fontSize: 12,
    color: Colors.darkGrey,
  },
  section: {
    marginBottom: 20,
  },
  webView: {
    width: width - 40,
    backgroundColor: 'transparent',
  },
  imageContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  imageWrapper: {
    position: 'relative',
  },
  newsImg: {
    width: width * 0.8,
    height: 200,
    marginRight: 10,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  documentContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.lightGrey,
    borderRadius: 8,
    marginBottom: 10,
  },
  documentIcon: {
    marginRight: 10,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.black,
  },
  documentType: {
    fontSize: 12,
    color: Colors.darkGrey,
  },
  documentActions: {
    flexDirection: 'row',
  },
  documentActionButton: {
    padding: 8,
    marginLeft: 10,
  },
  documentError: {
    fontSize: 14,
    color: Colors.tint,
    marginVertical: 5,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGrey,
    elevation: 5,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  likeButton: {
    backgroundColor: Colors.lightGrey,
  },
  commentsButton: {
    backgroundColor: Colors.primary,
  },
  footerButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.black,
  },
  modal: {
    margin: 0,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  modalWebView: {
    flex: 1,
  },
  imageModal: {
    margin: 0,
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  imageModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  modalButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  imageViewer: {
    flex: 1,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lottie: {
    width: 200,
    height: 200,
  },
  notFoundText: {
    marginTop: 20,
    fontSize: 16,
    color: Colors.darkGrey,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});