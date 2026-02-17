---
title: "CodeSnippet - Code Sharing Platform"
description: "A beautiful code sharing platform with syntax highlighting, collaboration features, and instant sharing. Think GitHub Gists meets design."
pubDate: 2025-11-15
heroImage: "/images/projects/codesnippet.webp"
heroColor: ["#fd9a00", "#fff"]
technologies: ["Next.js", "Prisma", "PostgreSQL", "Monaco Editor", "Vercel"]
liveUrl: "https://codesnippet.example.com"
repoUrl: "https://github.com/alexvig/codesnippet"
featured: true
order: 2
---

CodeSnippet makes sharing code beautiful and effortless. Created for developers who want more than just plain text sharing.

## Motivation

Sharing code snippets shouldn't require creating a repository or dealing with ugly formatting. I wanted to create something that felt as polished as the code itself.

## Features

### Beautiful Syntax Highlighting

Support for 100+ programming languages with themes that developers love.

### Monaco Editor

The same editor that powers VS Code, right in your browser. Full IntelliSense support for popular languages.

### Instant Sharing

Generate a shareable link in one click. No account required for basic usage.

### Version History

Track changes to your snippets over time. Compare versions and restore previous states.

## Architecture

The application is built with:

- **Next.js** for server-side rendering and API routes
- **Prisma** for type-safe database access
- **Monaco Editor** for the code editing experience
- **Shiki** for server-side syntax highlighting

## Performance

Optimized for speed:

- Edge caching for popular snippets
- Lazy loading of editor components
- Optimized bundle with code splitting
