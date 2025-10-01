// Comprehensive TypeScript interface test
export interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
  posts: Post[];
  profile: UserProfile;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author: User;
  published: boolean;
  createdAt: Date;
  tags: string[];
}

export interface UserProfile {
  id: string;
  bio: string;
  avatar: string;
  userId: string;
  user: User;
}

export type UserRole = 'admin' | 'user' | 'moderator';

export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  createdAt: Date;
  updatedAt?: Date;
}
