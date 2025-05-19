import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

type ShimmerProps = {
  width: number;
  height: number;
  borderRadius?: number;
};

const Shimmer = ({ width, height, borderRadius = 0 }: ShimmerProps) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + shimmer.value * 0.7,
  }));

  return (
    <View style={[styles.container, { width, height, borderRadius }]}>
      <Animated.View style={[styles.shimmer, animatedStyle]} />
    </View>
  );
};

export default Shimmer;

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGrey,
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
});