import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import axios from "axios";
import SearchBar from "@/components/SearchBar";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import Moment from "moment";
import LottieView from "lottie-react-native";
import { EXPO_API_URL } from "@env";
import { useUser } from "@/context/UserContext";
import { useQuery } from "@tanstack/react-query";

// Responsive size calculation
const { width } = Dimensions.get("window");
const lottieSize = Math.min(width * 0.25, 100); // 25% of screen width, capped at 100px

interface NewsItem {
  id: number;
  title: string;
  createdAt: string;
  images: string[];
}

interface NewsResponse {
  news: NewsItem[];
}

const fetchSearchResults = async (
  query: string,
  token: string | null
): Promise<NewsResponse> => {
  const response = await axios.get(`${EXPO_API_URL}/api/news/user`, {
    params: { query },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
};

const RenderNewsItem = React.memo(({ item }: { item: NewsItem }) => {
  return (
    <Link href={`/news/${item.id}`} asChild>
      <TouchableOpacity style={styles.newsItem}>
        <Image
          source={{
            uri: item.images[0] || "https://via.placeholder.com/80",
          }}
          style={styles.newsImage}
        />
        <View style={styles.newsInfo}>
          <Text style={styles.newsTitle}>{item.title}</Text>
          <Text style={styles.newsDate}>
            {Moment(item.createdAt).format("MMMM DD, hh:mm a")}
          </Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
});

const Page = () => {
  const { top: safeTop } = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const { token } = useUser();

  const { data, isLoading, error } = useQuery<NewsResponse, Error>({
    queryKey: ["searchNews", searchQuery, token],
    queryFn: () => fetchSearchResults(searchQuery, token),
    enabled: !!searchQuery,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const renderContent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <LottieView
            source={require("@/assets/lottie/loading.json")}
            autoPlay
            loop
            style={styles.lottieLoading}
          />
        </View>
      );
    }

    if (error) {
      return (
        <Text style={styles.errorText}>
          Error: {error.message || "Failed to fetch news"}
        </Text>
      );
    }

    if (searchQuery && data?.news.length === 0) {
      return <Text style={styles.noResultsText}>No results found.</Text>;
    }

    if (!searchQuery) {
      return (
        <View style={styles.animationContainer}>
          <LottieView
            source={require("@/assets/lottie/studentanimation.json")}
            autoPlay
            loop
            style={styles.lottieIcon}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={data?.news}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <RenderNewsItem item={item} />}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={7}
      />
    );
  }, [isLoading, error, searchQuery, data]);

  return (
    <View style={[styles.container, { paddingTop: safeTop + 20 }]}>
      <SearchBar setSearchQuery={setSearchQuery} withHorizontalPadding />
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  listContainer: {
    marginTop: 20,
  },
  newsItem: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
  },
  newsImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  newsInfo: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.black,
  },
  newsDate: {
    fontSize: 12,
    color: Colors.darkGrey,
  },
  animationContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lottieIcon: {
    width: 350,
    height: 350,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  lottieLoading: {
    width: lottieSize,
    height: lottieSize,
  },
  errorText: {
    fontSize: 16,
    color: Colors.tint,
    textAlign: "center",
    marginTop: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: Colors.darkGrey,
    textAlign: "center",
    marginTop: 20,
  },
});

export default Page;