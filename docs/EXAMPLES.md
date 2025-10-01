# Mocktail-CLI Examples

This guide provides comprehensive examples of using Mocktail-CLI with various schema types and advanced features.

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [Advanced Examples](#advanced-examples)
3. [Plugin Examples](#plugin-examples)
4. [Performance Examples](#performance-examples)
5. [Real-world Scenarios](#real-world-scenarios)

## Basic Examples

### Prisma Schema Example

**Schema** (`schema.prisma`):
```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  published Boolean  @default(false)
  author    User    @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
}
```

**Generate mock data**:
```bash
# Basic generation
mocktail-cli generate --schema ./schema.prisma --count 100

# With relations
mocktail-cli generate --schema ./schema.prisma --count 100 --relations --depth 2

# Specific models
mocktail-cli generate --schema ./schema.prisma --models User,Post --count 50,200
```

### GraphQL Schema Example

**Schema** (`schema.graphql`):
```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}
```

**Generate mock data**:
```bash
# Auto-detect GraphQL schema
mocktail-cli generate --schema ./schema.graphql --count 100

# With enhanced relation detection
mocktail-cli generate --schema ./schema.graphql --enable-advanced-relations --count 100
```

### JSON Schema Example

**Schema** (`schema.json`):
```json
{
  "type": "object",
  "properties": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "integer" },
        "name": { "type": "string" },
        "email": { "type": "string", "format": "email" }
      }
    }
  }
}
```

**Generate mock data**:
```bash
mocktail-cli generate --schema ./schema.json --type json-schema --count 100
```

## Advanced Examples

### E-commerce Schema with Enhanced Features

**Schema** (`ecommerce.prisma`):
```prisma
model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  firstName   String
  lastName    String
  orders      Order[]
  reviews     Review[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  description String
  price       Decimal  @db.Decimal(10, 2)
  category    Category @relation(fields: [categoryId], references: [id])
  categoryId  Int
  orders      OrderItem[]
  reviews     Review[]
  createdAt   DateTime @default(now())
}

model Category {
  id       Int       @id @default(autoincrement())
  name     String    @unique
  products Product[]
}

model Order {
  id        Int         @id @default(autoincrement())
  userId    Int
  user      User        @relation(fields: [userId], references: [id])
  items     OrderItem[]
  total     Decimal     @db.Decimal(10, 2)
  status    OrderStatus @default(PENDING)
  createdAt DateTime    @default(now())
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  order     Order   @relation(fields: [orderId], references: [id])
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Decimal @db.Decimal(10, 2)
}

model Review {
  id        Int     @id @default(autoincrement())
  userId    Int
  user      User    @relation(fields: [userId], references: [id])
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  rating    Int
  comment   String?
  createdAt DateTime @default(now())
}

enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}
```

**Configuration** (`mocktail-cli.config.js`):
```javascript
module.exports = {
  // Enhanced relation detection
  relationDetection: {
    enableAdvancedPatterns: true,
    enableSchemaAnnotations: true,
    confidenceThreshold: 0.8
  },
  
  // Performance optimization
  performance: {
    maxMemoryUsage: 2048,
    batchSize: 1000,
    enableMemoryMonitoring: true
  },
  
  // Model-specific configuration
  models: {
    User: {
      count: 1000,
      faker: {
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email'
      }
    },
    Product: {
      count: 500,
      faker: {
        name: 'commerce.productName',
        description: 'commerce.productDescription',
        price: () => Math.floor(Math.random() * 1000) + 10
      }
    },
    Order: {
      count: 2000,
      relations: {
        user: { connectBy: 'User' },
        items: { count: { min: 1, max: 5 } }
      }
    }
  }
};
```

**Generate with all enhancements**:
```bash
# Full e-commerce dataset with optimizations
mocktail-cli generate \
  --schema ./ecommerce.prisma \
  --count 1000,500,2000,100,5000 \
  --enable-advanced-relations \
  --performance-mode \
  --memory-limit 4096 \
  --batch-size 2000 \
  --relations \
  --depth 3 \
  --format json \
  --out ./ecommerce-data
```

### Social Media Schema with Plugins

**Schema** (`social.prisma`):
```prisma
model User {
  id          Int      @id @default(autoincrement())
  username    String   @unique
  email       String   @unique
  firstName   String
  lastName    String
  bio         String?
  avatar      String?
  posts       Post[]
  comments    Comment[]
  likes       Like[]
  follows     Follow[] @relation("UserFollows")
  followers   Follow[] @relation("UserFollowers")
  createdAt   DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  content   String
  imageUrl  String?
  authorId  Int
  author    User     @relation(fields: [authorId], references: [id])
  comments  Comment[]
  likes     Like[]
  createdAt DateTime @default(now())
}

model Comment {
  id      Int    @id @default(autoincrement())
  content String
  postId  Int
  post    Post   @relation(fields: [postId], references: [id])
  userId  Int
  user    User   @relation(fields: [userId], references: [id])
  likes   Like[]
}

model Like {
  id       Int    @id @default(autoincrement())
  postId   Int?
  post     Post?  @relation(fields: [postId], references: [id])
  commentId Int?
  comment  Comment? @relation(fields: [commentId], references: [id])
  userId   Int
  user     User   @relation(fields: [userId], references: [id])
}

model Follow {
  id          Int  @id @default(autoincrement())
  followerId  Int
  follower    User @relation("UserFollows", fields: [followerId], references: [id])
  followingId Int
  following   User @relation("UserFollowers", fields: [followingId], references: [id])
}
```

**Custom Plugin** (`plugins/social-generator.js`):
```javascript
module.exports = {
  name: 'social-generator',
  version: '1.0.0',
  description: 'Social media specific data generator',
  
  generators: [
    {
      name: 'usernameGenerator',
      fieldTypes: ['string'],
      generate: (field, context) => {
        if (field.name === 'username') {
          const adjectives = ['cool', 'awesome', 'epic', 'amazing', 'fantastic'];
          const nouns = ['user', 'person', 'guy', 'gal', 'human'];
          const numbers = Math.floor(Math.random() * 9999);
          const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
          const noun = nouns[Math.floor(Math.random() * nouns.length)];
          return `${adj}${noun}${numbers}`;
        }
        return null;
      },
      validate: (field) => field.name === 'username'
    },
    {
      name: 'bioGenerator',
      fieldTypes: ['string'],
      generate: (field, context) => {
        if (field.name === 'bio') {
          const bios = [
            'Just living my best life! 🌟',
            'Coffee enthusiast ☕',
            'Making the world a better place, one day at a time',
            'Adventure seeker 🏔️',
            'Tech lover 💻',
            'Artist at heart 🎨'
          ];
          return bios[Math.floor(Math.random() * bios.length)];
        }
        return null;
      },
      validate: (field) => field.name === 'bio'
    }
  ],
  
  hooks: {
    beforeGeneration: async (context) => {
      console.log('🌐 Social media generator activated!');
    }
  }
};
```

**Generate social media data**:
```bash
# Load custom plugin and generate
mocktail-cli generate \
  --schema ./social.prisma \
  --enable-plugins \
  --plugin-dir ./plugins \
  --enable-advanced-relations \
  --performance-mode \
  --count 5000,10000,25000,50000,10000 \
  --relations \
  --depth 4 \
  --format json \
  --out ./social-data
```

## Plugin Examples

### Custom Date Generator Plugin

**Plugin** (`plugins/date-generator.js`):
```javascript
module.exports = {
  name: 'date-generator',
  version: '1.0.0',
  description: 'Advanced date generation with context awareness',
  
  generators: [
    {
      name: 'contextualDate',
      fieldTypes: ['DateTime', 'Date', 'string'],
      generate: (field, context) => {
        const fieldName = field.name.toLowerCase();
        const now = new Date();
        
        if (fieldName.includes('birth')) {
          // Birth dates: 18-80 years ago
          const age = Math.floor(Math.random() * 62) + 18;
          const birthDate = new Date(now.getFullYear() - age, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
          return birthDate;
        }
        
        if (fieldName.includes('created') || fieldName.includes('joined')) {
          // Created dates: last 2 years
          const daysAgo = Math.floor(Math.random() * 730);
          const createdDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
          return createdDate;
        }
        
        if (fieldName.includes('expir') || fieldName.includes('valid')) {
          // Expiration dates: next 1-5 years
          const daysFromNow = Math.floor(Math.random() * 1825) + 365;
          const expDate = new Date(now.getTime() + (daysFromNow * 24 * 60 * 60 * 1000));
          return expDate;
        }
        
        // Default: random date in last year
        const daysAgo = Math.floor(Math.random() * 365);
        return new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      },
      validate: (field) => {
        const fieldName = field.name.toLowerCase();
        return fieldName.includes('date') || 
               fieldName.includes('time') || 
               fieldName.includes('created') ||
               fieldName.includes('updated') ||
               fieldName.includes('birth') ||
               fieldName.includes('expir');
      }
    }
  ]
};
```

### Custom Email Generator Plugin

**Plugin** (`plugins/email-generator.js`):
```javascript
module.exports = {
  name: 'email-generator',
  version: '1.0.0',
  description: 'Realistic email generation with domain patterns',
  
  generators: [
    {
      name: 'realisticEmail',
      fieldTypes: ['string'],
      generate: (field, context) => {
        if (field.name.toLowerCase().includes('email')) {
          const firstNames = ['john', 'jane', 'mike', 'sarah', 'david', 'lisa', 'chris', 'emma', 'alex', 'sam'];
          const lastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis', 'rodriguez', 'martinez'];
          const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'company.com', 'example.org'];
          
          const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
          const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
          const domain = domains[Math.floor(Math.random() * domains.length)];
          const randomNum = Math.floor(Math.random() * 999);
          
          const patterns = [
            `${firstName}.${lastName}@${domain}`,
            `${firstName}${lastName}@${domain}`,
            `${firstName}${randomNum}@${domain}`,
            `${firstName}.${lastName}${randomNum}@${domain}`
          ];
          
          return patterns[Math.floor(Math.random() * patterns.length)];
        }
        return null;
      },
      validate: (field) => field.name.toLowerCase().includes('email')
    }
  ]
};
```

### Custom Validator Plugin

**Plugin** (`plugins/data-validator.js`):
```javascript
module.exports = {
  name: 'data-validator',
  version: '1.0.0',
  description: 'Custom data validation rules',
  
  validators: [
    {
      name: 'emailValidator',
      description: 'Validates email format',
      validate: (data, schema) => {
        const errors = [];
        const warnings = [];
        
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.push('Invalid email format');
        }
        
        return {
          valid: errors.length === 0,
          errors,
          warnings
        };
      }
    },
    {
      name: 'requiredFieldValidator',
      description: 'Validates required fields',
      validate: (data, schema) => {
        const errors = [];
        const warnings = [];
        
        // Check for required fields based on schema
        if (schema.required) {
          for (const field of schema.required) {
            if (!data[field]) {
              errors.push(`Required field '${field}' is missing`);
            }
          }
        }
        
        return {
          valid: errors.length === 0,
          errors,
          warnings
        };
      }
    }
  ]
};
```

## Performance Examples

### Large Dataset Generation

**Generate 1 million records**:
```bash
# Optimized for large datasets
mocktail-cli generate \
  --schema ./large-schema.prisma \
  --count 1000000 \
  --performance-mode \
  --memory-limit 8192 \
  --batch-size 5000 \
  --enable-advanced-relations \
  --format sql \
  --out ./large-dataset
```

**Configuration for large datasets**:
```javascript
// mocktail-cli.config.js
module.exports = {
  performance: {
    maxMemoryUsage: 8192, // 8GB
    batchSize: 5000,
    enableMemoryMonitoring: true,
    enableProgressTracking: true,
    timeoutMs: 1800000, // 30 minutes
    enableCaching: false // Disable caching for very large datasets
  },
  
  models: {
    User: { count: 500000 },
    Post: { count: 2000000 },
    Comment: { count: 10000000 }
  }
};
```

### Memory-Optimized Generation

**Generate with memory constraints**:
```bash
# Limited memory environment
mocktail-cli generate \
  --schema ./schema.prisma \
  --count 100000 \
  --performance-mode \
  --memory-limit 1024 \
  --batch-size 1000 \
  --format csv \
  --out ./memory-optimized
```

### Batch Processing

**Process multiple schemas**:
```bash
# Process all schemas in directory
mocktail-cli generate \
  --batch \
  --performance-mode \
  --memory-limit 2048 \
  --batch-size 2000 \
  --enable-advanced-relations
```

## Real-world Scenarios

### E-commerce Platform

**Complete e-commerce schema with all features**:

```bash
# Generate full e-commerce dataset
mocktail-cli generate \
  --schema ./ecommerce.prisma \
  --enable-plugins \
  --plugin-dir ./plugins \
  --enable-advanced-relations \
  --performance-mode \
  --memory-limit 4096 \
  --batch-size 2000 \
  --count 10000,5000,50000,1000,25000 \
  --relations \
  --depth 4 \
  --format json \
  --out ./ecommerce-data \
  --seed \
  --seed-value 42
```

### Social Media Platform

**Social media with complex relations**:

```bash
# Generate social media dataset
mocktail-cli generate \
  --schema ./social.prisma \
  --enable-plugins \
  --plugin-dir ./plugins \
  --enable-advanced-relations \
  --relation-confidence 0.6 \
  --performance-mode \
  --count 100000,500000,1000000,2000000,500000 \
  --relations \
  --depth 5 \
  --format json \
  --out ./social-data
```

### Content Management System

**CMS with hierarchical content**:

```bash
# Generate CMS dataset
mocktail-cli generate \
  --schema ./cms.prisma \
  --enable-advanced-relations \
  --performance-mode \
  --count 1000,5000,10000,50000,100000 \
  --relations \
  --depth 6 \
  --format sql \
  --out ./cms-data
```

### Multi-tenant SaaS Application

**SaaS with tenant isolation**:

```bash
# Generate multi-tenant data
mocktail-cli generate \
  --schema ./saas.prisma \
  --enable-plugins \
  --plugin-dir ./plugins \
  --enable-advanced-relations \
  --performance-mode \
  --count 100,1000,10000,50000,100000 \
  --relations \
  --depth 4 \
  --format json \
  --out ./saas-data
```

## Troubleshooting Examples

### Memory Issues

```bash
# Reduce memory usage
mocktail-cli generate \
  --performance-mode \
  --memory-limit 512 \
  --batch-size 500 \
  --count 50000
```

### Relation Detection Issues

```bash
# Lower confidence threshold
mocktail-cli generate \
  --enable-advanced-relations \
  --relation-confidence 0.3 \
  --count 1000
```

### Plugin Loading Issues

```bash
# Debug plugin loading
mocktail-cli generate \
  --enable-plugins \
  --plugin-dir ./plugins \
  --verbose \
  --count 100
```

## Best Practices

### 1. Start Small
```bash
# Test with small dataset first
mocktail-cli generate --count 100 --enable-advanced-relations
```

### 2. Use Performance Mode for Large Datasets
```bash
# Always use performance mode for >10k records
mocktail-cli generate --count 100000 --performance-mode
```

### 3. Configure Memory Limits
```bash
# Set appropriate memory limits
mocktail-cli generate --memory-limit 2048 --batch-size 1000
```

### 4. Use Plugins for Custom Data
```bash
# Create custom plugins for specific needs
mocktail-cli generate --enable-plugins --plugin-dir ./custom-plugins
```

### 5. Monitor Performance
```bash
# Use performance mode to get detailed reports
mocktail-cli generate --performance-mode --count 100000
```

## Conclusion

These examples demonstrate the full power of Mocktail-CLI's enhanced features:

- **Enhanced relation detection** for complex schemas
- **Performance optimization** for large datasets
- **Plugin system** for custom data generation
- **Better error handling** for debugging
- **Improved UI/UX** for better user experience

Use these examples as starting points for your own projects and customize them based on your specific needs.
