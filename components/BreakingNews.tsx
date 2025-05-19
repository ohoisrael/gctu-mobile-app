import {
  FlatList,
  StyleSheet,
  Text,
  View,
  ViewToken,
  useWindowDimensions,
} from 'react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NewsDataType } from '@/types';
import SliderItem from '@/components/SliderItem';
import { Colors } from '@/constants/Colors';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import Pagination from '@/components/Pagination';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  newsList: Array<NewsDataType>;
  isScreenFocused: boolean;
  resetSlider: boolean;
};

const BreakingNews = ({ newsList, isScreenFocused, resetSlider }: Props) => {
  const [paginationIndex, setPaginationIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const ref = useAnimatedRef<Animated.FlatList<any>>();
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const interval = useRef<NodeJS.Timeout>();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const offset = useSharedValue(0);

  // Reset slider when resetSlider prop is true
  useEffect(() => {
    if (resetSlider) {
      console.log('BreakingNews: Resetting slider due to resetSlider prop');
      setPaginationIndex(0);
      offset.value = 0;
      scrollTo(ref, 0, 0, false);
    }
  }, [resetSlider, ref]);

  // Load saved index or reset on app restart
  useEffect(() => {
    const loadIndex = async () => {
      try {
        const appRestarted = await AsyncStorage.getItem('appRestarted');
        if (appRestarted === 'true') {
          console.log('BreakingNews: App restarted, resetting slider to index 0');
          setPaginationIndex(0);
          offset.value = 0;
          await AsyncStorage.removeItem('breakingNewsIndex');
          await AsyncStorage.removeItem('appRestarted');
        } else {
          const savedIndex = await AsyncStorage.getItem('breakingNewsIndex');
          if (savedIndex !== null) {
            const index = parseInt(savedIndex, 10);
            console.log('BreakingNews: Loaded saved index', index);
            setPaginationIndex(index);
            offset.value = index * width;
          }
        }
      } catch (error) {
        console.error('BreakingNews: Error loading index from AsyncStorage', error);
      }
    };
    loadIndex();
  }, [width]);

  // Save paginationIndex to AsyncStorage
  useEffect(() => {
    const saveIndex = async () => {
      try {
        await AsyncStorage.setItem('breakingNewsIndex', paginationIndex.toString());
        console.log('BreakingNews: Saved index', paginationIndex);
      } catch (error) {
        console.error('BreakingNews: Error saving index to AsyncStorage', error);
      }
    };
    saveIndex();
  }, [paginationIndex]);

  // Initialize scroll position
  useEffect(() => {
    if (newsList.length > 0) {
      scrollTo(ref, paginationIndex * width, 0, false);
    }
  }, [paginationIndex, newsList.length, ref, width]);

  console.log('BreakingNews: Rendered', { newsCount: newsList.length, isScreenFocused, isFocused, paginationIndex, resetSlider });

  const onScrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
    onMomentumEnd: (e) => {
      offset.value = e.contentOffset.x;
    },
  });

  useEffect(() => {
    if (isFocused && isScreenFocused && isAutoPlay && newsList.length > 0) {
      interval.current = setInterval(() => {
        const nextOffset = offset.value + width;
        const maxOffset = width * newsList.length;
        offset.value = nextOffset >= maxOffset ? 0 : nextOffset;
      }, 5000);
    } else {
      clearInterval(interval.current);
    }
    return () => {
      clearInterval(interval.current);
    };
  }, [isAutoPlay, offset, width, newsList.length, isFocused, isScreenFocused]);

  useEffect(() => {
    if (!isFocused || !isScreenFocused) {
      setIsAutoPlay(false);
    } else {
      setIsAutoPlay(true);
    }
  }, [isFocused, isScreenFocused]);

  useDerivedValue(() => {
    scrollTo(ref, offset.value, 0, true);
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (
        viewableItems[0]?.index !== undefined &&
        viewableItems[0]?.index !== null
      ) {
        setPaginationIndex(viewableItems[0].index % newsList.length);
      }
    },
    [newsList.length]
  );

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
    waitForInteraction: false,
  };

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]);

  const renderItem = useCallback(
    ({ item, index }: { item: NewsDataType; index: number }) => (
      <SliderItem slideItem={item} index={index} scrollX={scrollX} />
    ),
    [scrollX]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Breaking News</Text>
      <View style={styles.slideWrapper}>
        <Animated.FlatList
          ref={ref}
          data={newsList}
          keyExtractor={(_, index) => `list_item${index}`}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          onScroll={onScrollHandler}
          scrollEventThrottle={16}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
          onScrollBeginDrag={() => setIsAutoPlay(false)}
          onScrollEndDrag={() => setIsAutoPlay(true)}
        />
        <Pagination
          items={newsList}
          scrollX={scrollX}
          paginationIndex={paginationIndex}
        />
      </View>
    </View>
  );
};

export default BreakingNews;

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 10,
    marginLeft: 20,
  },
  slideWrapper: {
    justifyContent: 'center',
  },
});