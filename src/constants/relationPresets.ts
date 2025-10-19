import type { RelationPresets } from '../types';

/**
 * Advanced relation presets for different application types
 * These presets define how many related records should be generated
 */
export const relationPresets: RelationPresets = {
  // Blog/Content Management
  blog: {
    User: {
      posts: { count: { min: 1, max: 5 } },
      comments: { count: { min: 0, max: 10 } }
    },
    Post: {
      comments: { count: { min: 0, max: 15 } },
      categories: { count: { min: 1, max: 3 } }
    }
  },
  
  // E-commerce
  ecommerce: {
    User: {
      orders: { count: { min: 0, max: 8 } },
      reviews: { count: { min: 0, max: 5 } }
    },
    Product: {
      reviews: { count: { min: 0, max: 20 } },
      categories: { count: { min: 1, max: 2 } }
    }
  },
  
  // Social Network
  social: {
    User: {
      posts: { count: { min: 0, max: 10 } },
      followers: { count: { min: 0, max: 50 } },
      following: { count: { min: 0, max: 50 } }
    }
  }
};
