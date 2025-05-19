import React from 'react';
import { View, StyleSheet } from 'react-native';
import Shimmer from '@/components/Shimmer';
import { Colors } from '@/constants/Colors';

const NewsListSkeleton = () => {
  return (
    <View style={styles.container}>
      {[...Array(3)].map((_, index) => (
        <View key={index} style={styles.newsItem}>
          <Shimmer width={100} height={100} borderRadius={10} />
          <View style={styles.content}>
            <Shimmer width={160} height={16} borderRadius={4} />
            <Shimmer width={200} height={40} borderRadius={4} />
            <Shimmer width={120} height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
};

export default NewsListSkeleton;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  newsItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  content: {
    flex: 1,
    gap: 5,
  },
});