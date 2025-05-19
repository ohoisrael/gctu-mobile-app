import React from 'react';
import { View, StyleSheet } from 'react-native';
import Shimmer from '@/components/Shimmer';
import { Colors } from '@/constants/Colors';

const HeaderSkeleton = () => {
  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <Shimmer width={50} height={50} borderRadius={25} />
        <View style={{ gap: 3 }}>
          <Shimmer width={80} height={12} borderRadius={4} />
          <Shimmer width={120} height={14} borderRadius={4} />
        </View>
      </View>
    </View>
  );
};

export default HeaderSkeleton;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});