// TypeScript interfaces example
export interface User {
  id: string;
  name: string;
  email: string;
  posts: Post[];
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: User;
  published: boolean;
  createdAt: Date;
}

export type UserRole = 'admin' | 'user' | 'moderator';

export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  createdAt: Date;
}
