// Comprehensive TypeScript interfaces for testing

export interface User {
  id: string;
  email: string;
  name?: string;
  age?: number;
  posts: Post[];
  profile?: UserProfile;
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  title: string;
  content?: string;
  published: boolean;
  authorId: string;
  author: User;
  comments: Comment[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  bio?: string;
  avatar?: string;
  userId: string;
  user: User;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  post: Post;
  author: User;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'admin' | 'user' | 'moderator';

export interface CreateUserInput {
  email: string;
  name?: string;
  age?: number;
}

export interface CreatePostInput {
  title: string;
  content?: string;
  published?: boolean;
  authorId: string;
  tags?: string[];
}

// Union types
export type Status = 'active' | 'inactive' | 'pending';

// Generic types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Complex nested types
export interface BlogPost extends Post {
  category: string;
  featured: boolean;
  metadata: {
    views: number;
    likes: number;
    shares: number;
  };
}
