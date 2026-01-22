---
title: "Getting Started with Motion One Animations"
description: "Add delightful animations to your web projects with Motion One. Learn the fundamentals of the animation library that powers smooth, performant web animations."
pubDate: 2026-01-10
author: "Alex Vig"
heroImage: "/images/blog/motion-one.jpg"
tags: ["JavaScript", "Animation", "Tutorial"]
featured: false
draft: false
---

Animations can transform a good website into a great one. Motion One is a modern animation library that makes adding animations simple and performant.

## Why Motion One?

Motion One offers several advantages:

- **Tiny bundle size** - Under 3KB gzipped
- **Hardware accelerated** - Smooth 60fps animations
- **Simple API** - Easy to learn and use
- **Spring physics** - Natural-feeling motion

## Basic Animation

Here's how to animate an element:

```javascript
import { animate } from "motion";

animate(".box", { transform: "translateX(100px)" }, { duration: 0.5 });
```

## Animating Multiple Properties

You can animate multiple properties at once:

```javascript
animate(
  ".hero-title",
  {
    opacity: [0, 1],
    y: [20, 0],
  },
  {
    duration: 0.6,
    easing: "ease-out",
  },
);
```

## Staggered Animations

Create beautiful staggered effects:

```javascript
import { animate, stagger } from "motion";

animate(".card", { opacity: [0, 1], y: [20, 0] }, { delay: stagger(0.1) });
```

## Best Practices

1. **Animate transform and opacity** - These are GPU-accelerated
2. **Use appropriate easing** - `ease-out` for entrances, `ease-in` for exits
3. **Keep it subtle** - Animation should enhance, not distract
4. **Respect motion preferences** - Honor `prefers-reduced-motion`

## Conclusion

Motion One makes it easy to add polished animations to your projects. Start simple and build up complexity as you get comfortable with the API.

Happy animating! ✨
