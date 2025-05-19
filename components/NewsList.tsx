import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { NewsDataType } from '@/types';
import { Colors } from '@/constants/Colors';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import Loading from './Loading';

type Props = {
  newsList: Array<NewsDataType>;
  isFetchingMore: boolean;
  onEndReached: () => void;
};

const NewsList = ({ newsList, isFetchingMore, onEndReached }: Props) => {
  return (
    <FlatList
      data={newsList}
      renderItem={({ item, index }) => (
        <Link href={`/news/${item.id}`} asChild key={`news_${item.id}_${index}`}>
          <TouchableOpacity>
            <MemoizedNewsItem item={item} />
          </TouchableOpacity>
        </Link>
      )}
      keyExtractor={(item, index) => `news_${item.id}_${index}`}
      contentContainerStyle={styles.container}
      ListFooterComponent={isFetchingMore ? <Loading size="small" /> : null}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      scrollEnabled={false} // Disable scrolling to let parent ScrollView handle it
    />
  );
};

export const NewsItem = ({ item }: { item: NewsDataType }) => {
  const imageUrl = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
  const categoryName = item.Category?.name || 'Uncategorized'; // Fallback for undefined Category

  return (
    <View style={styles.itemContainer}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.itemImg}
          cachePolicy="memory-disk"
          contentFit="cover"
          placeholder={{ blurhash: 'L8H;~V00M{00~U-:IU%L009F_Ns,' }}
        />
      ) : (
        <View style={[styles.itemImg, styles.placeholderImage]} />
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemCategory}>{categoryName}</Text>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.itemSourceInfo}>
          <Text style={styles.itemSourceName}>{item.publishedBy || 'Unknown'}</Text>
        </View>
      </View>
    </View>
  );
};

const arePropsEqual = (prevProps: { item: NewsDataType }, nextProps: { item: NewsDataType }) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.item.images === nextProps.item.images &&
    prevProps.item.Category?.name === nextProps.item.Category?.name &&
    prevProps.item.publishedBy === nextProps.item.publishedBy
  );
};

export default React.memo(NewsList, (prevProps, nextProps) => (
  prevProps.newsList === nextProps.newsList &&
  prevProps.isFetchingMore === nextProps.isFetchingMore &&
  prevProps.onEndReached === nextProps.onEndReached
));
export const MemoizedNewsItem = React.memo(NewsItem, arePropsEqual);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flex: 1,
    gap: 10,
    height: 100,
  },
  itemImg: {
    width: 90,
    height: 100,
    borderRadius: 20,
  },
  placeholderImage: {
    backgroundColor: Colors.lightGrey,
  },
  itemInfo: {
    flex: 1,
    gap: 10,
    justifyContent: 'space-between',
  },
  itemCategory: {
    fontSize: 12,
    color: Colors.darkGrey,
    textTransform: 'capitalize',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.black,
  },
  itemSourceInfo: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  itemSourceName: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.darkGrey,
  },
});