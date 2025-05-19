import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import axios from 'axios';
import { Colors } from '@/constants/Colors';
import { EXPO_API_URL } from '@env';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';

type CategoryType = {
  id: number;
  name: string;
  slug?: string;
};

type Props = {
  onCategoryChanged: (categoryId: number) => void;
};

const Categories = ({ onCategoryChanged }: Props) => {
  const {token} = useUser();
  const scrollRef = useRef<ScrollView>(null);
  const itemRef = useRef<TouchableOpacity[] | null[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Fetch categories using useQuery
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axios.get(`${EXPO_API_URL}/api/categories`,{
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        return [{ id: 0, name: 'All' }, ...response.data] as CategoryType[];
      }
      return [{ id: 0, name: 'All' }] as CategoryType[];
    },
    onError: (err: any) => {
      console.log('Error fetching categories:', err.message);
    },
  });

  const handleSelectCategory = (index: number, categoryId: number) => {
    setActiveIndex(index);
    onCategoryChanged(categoryId);
  };

  return (
    <View>
      <Text style={styles.title}>Trending Right Now</Text>
      {isLoading ? (
        <Text style={styles.loadingText}>Loading categories...</Text>
      ) : error ? (
        <Text style={styles.errorText}>Failed to load categories</Text>
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.itemsWrapper}
        >
          {categories.map((item, index) => (
            <TouchableOpacity
              ref={(el) => (itemRef.current[index] = el)}
              key={item.id}
              style={[styles.item, activeIndex === index && styles.itemActive]}
              onPress={() => handleSelectCategory(index, item.id)}
            >
              <Text style={[styles.itemText, activeIndex === index && styles.itemTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default Categories;

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: 10,
    marginLeft: 20,
  },
  itemsWrapper: {
    gap: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  item: {
    borderWidth: 1,
    borderColor: Colors.darkGrey,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  itemActive: {
    backgroundColor: Colors.tint,
    borderColor: Colors.tint,
  },
  itemText: {
    fontSize: 14,
    color: Colors.darkGrey,
  },
  itemTextActive: {
    fontWeight: '600',
    color: Colors.white,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.darkGrey,
    marginLeft: 20,
  },
  errorText: {
    fontSize: 14,
    color: Colors.tint,
    marginLeft: 20,
  },
});