import { StyleSheet, View } from "react-native";
import React from "react";
import { NewsDataType } from "@/types";
import Animated, { SharedValue } from "react-native-reanimated";
import { Colors } from "@/constants/Colors";

type Props = {
  items: NewsDataType[];
  paginationIndex: number;
  scrollX: SharedValue<number>;
};

const Pagination = ({ items, paginationIndex }: Props) => {
  return (
    <View style={styles.container}>
      {items.map((_, index) => (
        <Animated.View
          style={[
            styles.dot,
            {
              backgroundColor:
                paginationIndex === index ? Colors.tint : Colors.darkGrey,
            },
          ]}
          key={index}
        />
      ))}
    </View>
  );
};

// Memoize Pagination with custom prop comparison
const arePropsEqual = (prevProps: Props, nextProps: Props) => {
  return (
    prevProps.items.length === nextProps.items.length &&
    prevProps.paginationIndex === nextProps.paginationIndex &&
    prevProps.scrollX.value === nextProps.scrollX.value
  );
};

export default React.memo(Pagination, arePropsEqual);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    backgroundColor: "#333",
    height: 8,
    width: 8,
    marginHorizontal: 2,
    borderRadius: 8,
  },
});