
export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  category: string;
  imageUrl: string;
}

export enum Page {
  BLOG = 'blog',
  ARTICLE = 'article'
}
