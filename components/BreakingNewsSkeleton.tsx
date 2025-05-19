import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Shimmer from '@/components/Shimmer';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('screen');

const BreakingNewsSkeleton = () => {
  return (
    <View style={styles.container}>
      <Shimmer width={150} height={18} borderRadius={4} style={styles.title} />
      <View style={styles.slideWrapper}>
        <View style={styles.sliderItem}>
          <Shimmer width={width - 60} height={180} borderRadius={20} />
          <Shimmer
            width={width - 60}
            height={60}
            borderRadius={20}
            style={styles.textOverlay}
          />
        </View>
        <View style={styles.pagination}>
          {[...Array(3)].map((_, index) => (
            <Shimmer key={index} width={8} height={8} borderRadius={4} />
          ))}
        </View>
      </View>
    </View>
  );
};

export default BreakingNewsSkeleton;

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  title: {
    marginBottom: 10,
    marginLeft: 20,
  },
  slideWrapper: {
    justifyContent: 'center',
  },
  sliderItem: {
    width: width,
    alignItems: 'center',
  },
  textOverlay: {
    position: 'absolute',
    bottom: 0,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
});