import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import { Link, Stack, router, useLocalSearchParams } from "expo-router";
import { NewsDataType } from "@/types";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import Loading from "@/components/Loading";
import { NewsItem } from "@/components/NewsList";
import { EXPO_API_URL } from "@env";

type Props = {};

const Page = (props: Props) => {
  const { query = "", category = "" } = useLocalSearchParams<{
    query: string;
    category: string;
  }>();

  const [news, setNews] = useState<NewsDataType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setNews([]);
    setPage(1);
    setHasMore(true);
    getNews(1);
  }, [category, query]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${EXPO_API_URL}/api/categories`);
      setCategories(response.data.news);
    } catch (err) {
      console.log("Error fetching categories:", err.message);
    }
  };

  const getNews = async (pageNum: number) => {
    if (!hasMore) return;
    try {
      setIsLoading(true);
      const categoryId = categories.find((cat) => cat.name === category)?.id || 0;
      const response = await axios.get(`${EXPO_API_URL}/api/news/user`, {
        params: {
          query,
          categoryId,
          limit: 10,
          offset: (pageNum - 1) * 10,
        },
      });

      if (response && response.data) {
        setNews((prev) => [...prev, ...response.data.news]);
        setHasMore(response.data.hasMore);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.log("Error Message: ", err.message);
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage((prev) => prev + 1);
      getNews(page + 1);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} />
            </TouchableOpacity>
          ),
          title: "Search",
        }}
      />
      <View style={styles.container}>
        {isLoading && news.length === 0 ? (
          <Loading size={"large"} />
        ) : (
          <FlatList
            data={news}
            keyExtractor={(_, index) => `list_items${index}`}
            showsVerticalScrollIndicator={false}
            renderItem={({ index, item }) => (
              <Link href={`/news/${item.id}`} asChild key={index}>
                <TouchableOpacity>
                  <NewsItem item={item} />
                </TouchableOpacity>
              </Link>
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoading && news.length > 0 ? <Loading size={"small"} /> : null
            }
          />
        )}
      </View>
    </>
  );
};

export default Page;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 20,
    marginVertical: 20,
  },
});