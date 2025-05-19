import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateToNewsPage(newsId: string) {
  if (navigationRef.isReady()) {
    navigationRef.navigate('news/[id]', { id: newsId });
  }
}
