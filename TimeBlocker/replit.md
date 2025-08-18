# TimeBlock

## Overview

TimeBlock is a progressive time-blocking application built with React and TypeScript that follows the "Dump First, Organize Later" philosophy. The application provides a hierarchical calendar interface where users can navigate from Month → Day → Hour views through direct clicking, combined with a persistent Notes Drawer for capturing thoughts and tasks. The system emphasizes intuitive drag-and-drop scheduling and features a glassmorphism UI design with purple gradient accents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack**: The application uses React 18 with TypeScript, built on Vite for fast development and optimized production builds. The UI is constructed with shadcn/ui components built on Radix UI primitives, providing accessibility and consistent design patterns.

**State Management**: TanStack Query handles server state management and caching, while local component state manages UI interactions. The query client is configured with infinite stale time and disabled refetching to optimize performance.

**Routing**: Uses Wouter for lightweight client-side routing with three main routes: landing page (/), main application (/app), and 404 handling.

**Styling System**: Tailwind CSS provides utility-first styling with a custom design system featuring purple gradients and glassmorphism effects. CSS custom properties define the color palette (dark-violet to soft-cyan) and glass effect variables.

### Backend Architecture

**Server Framework**: Express.js serves as the REST API backend with TypeScript, handling CRUD operations for users, notes, and tasks.

**Data Layer**: Currently implements in-memory storage via the MemStorage class for development. The system is designed to support PostgreSQL through Drizzle ORM, with migration scripts configured but database persistence not yet implemented.

**API Design**: RESTful endpoints follow resource-based patterns (/api/notes, /api/tasks) with proper HTTP methods and status codes. Mock authentication middleware provides demo user context.

### Component Architecture

**View Hierarchy**: Three main calendar views (MonthView, DayView, HourView) form a progressive disclosure pattern. Each view handles its own date calculations and task filtering while sharing common drag-and-drop functionality.

**Notes Management**: The NotesDrawer component implements three states (collapsed/partial/full) with dynamic resizing and persistent positioning. It serves as the primary input interface for the "dump first" workflow.

**Interaction Patterns**: Custom drag-and-drop hooks (useDragDrop) provide consistent behavior across all calendar views. The system highlights valid drop zones and provides visual feedback during drag operations.

### Schema and Data Models

**Database Schema**: Drizzle ORM defines three main tables (users, notes, tasks) with UUID primary keys and proper relationships. Tasks can optionally link to notes and include time-specific fields (date, startTime, duration).

**Type Safety**: Zod schemas provide runtime validation and TypeScript integration. Insert schemas exclude server-generated fields (id, userId, createdAt) while maintaining type safety.

### UI/UX Design System

**Visual Identity**: Glassmorphism design with white background, purple gradient overlays, and semi-transparent components using backdrop-blur effects. The design emphasizes clarity and focus.

**Typography**: Inter font family with defined scale (H1: 32-40px, H2: 24px, Body: 16px) and consistent weight hierarchy.

**Interactive Feedback**: Animations powered by Framer Motion provide smooth transitions between views and states. Toast notifications and loading states ensure users understand system responses.

## External Dependencies

**UI Component Library**: Radix UI primitives provide accessible, unstyled components that are wrapped by shadcn/ui for consistent styling.

**Database Integration**: Neon Database serverless PostgreSQL is configured through environment variables, with Drizzle ORM handling schema management and migrations.

**Authentication**: Mock authentication system is implemented for development. Google OAuth integration is planned but not yet implemented.

**Development Tools**: Vite provides hot module replacement and build optimization. ESBuild handles server bundling for production deployments.

**Styling and Design**: Tailwind CSS for utility-first styling, with additional glassmorphism effects and custom color variables. Lucide React provides consistent iconography.

**State and Data**: TanStack Query manages server state with caching and background updates. React Hook Form with Hookform Resolvers handles form validation and submission.