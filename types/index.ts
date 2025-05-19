export interface NewsDataType {
    article_id: string;
    id: number;
    title: string;
    content: string;
    images: string[]; 
    categoryId: number;
    targetRole: string;
    faculty: string;
    publishedBy: string;
    createdAt: string;
    updatedAt: string;
    Category: {
      name: string;
    };
  }
  