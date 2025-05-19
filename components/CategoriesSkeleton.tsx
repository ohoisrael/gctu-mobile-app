import React from 'react';
import { View, StyleSheet } from 'react-native';
import Shimmer from '@/components/Shimmer';
import { Colors } from '@/constants/Colors';

const CategoriesSkeleton = () => {
  return (
    <View style={styles.container}>
      <Shimmer width={150} height={18} borderRadius={4} style={styles.title} />
      <View style={styles.itemsWrapper}>
        {[...Array(5)].map((_, index) => (
          <Shimmer key={index} width={80} height={40} borderRadius={10} />
        ))}
      </View>
    </View>
  );
};

export default CategoriesSkeleton;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 10,
  },
  title: {
    marginBottom: 10,
    marginLeft: 20,
  },
  itemsWrapper: {
    flexDirection: 'row',
    gap: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
});