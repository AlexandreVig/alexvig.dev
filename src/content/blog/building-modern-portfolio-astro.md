---
title: "Building a Modern Portfolio with Astro"
description: "Learn how to create a fast, modern portfolio website using Astro, Tailwind CSS, and View Transitions. This guide covers project setup, content management, and deployment."
pubDate: 2026-01-20
author: "Alex Vig"
heroImage: "/images/blog/astro-portfolio.jpg"
tags: ["Astro", "Web Development", "Tutorial"]
featured: true
draft: false
---

Building a portfolio website is one of the best ways to showcase your work and establish your online presence. In this post, I'll walk you through the process of creating a modern portfolio using Astro.

## Why Astro?

Astro is a modern static site generator that offers several compelling benefits:

- **Zero JavaScript by default** - Ships HTML with no JavaScript unless you need it
- **Island Architecture** - Hydrate only the components that need interactivity
- **Content Collections** - First-class support for Markdown and MDX
- **View Transitions** - Smooth page transitions built right in

## Getting Started

First, let's create a new Astro project:

```bash
npm create astro@latest my-portfolio
```

### Adding Tailwind CSS

Tailwind makes styling a breeze. Add it with the Astro CLI:

```bash
npx astro add tailwind
```

## Content Collections

One of Astro's best features is Content Collections. They provide:

1. **Type-safe frontmatter** - Validate your content at build time
2. **Easy querying** - Get all posts or filter by category
3. **MDX support** - Use components in your markdown

Here's an example schema:

```typescript
const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
  }),
});
```

## View Transitions

Adding smooth page transitions is as simple as importing the component:

```astro
---
import { ViewTransitions } from 'astro:transitions';
---

<head>
  <ViewTransitions />
</head>
```

## Conclusion

Astro provides an excellent foundation for building portfolio websites. Its focus on performance and developer experience makes it a joy to work with.

In the next post, we'll explore adding animations with Motion One to make our portfolio even more engaging.

Happy coding! 🚀
