# Healthcare Management System

A modern, secure, and scalable backend for managing healthcare operations, built with Node.js, Express, TypeScript, and Prisma.

## Table of Contents

- [Project Overview](#project-overview)
- [How to Run the Project](#how-to-run-the-project)
- [Documentation](#documentation)
  - [Architecture & File Structure](backend/docs/architecture.md)
  - [API Overview](backend/docs/api-overview.md)
  - [Roles & Features](backend/docs/roles-features.md)
  - [Database & Data Flow](backend/docs/database.md)
  - [Real-time Notifications](backend/docs/realtime-notifications.md)
  - [File Uploads](backend/docs/file-upload.md)
  - [Security](backend/docs/security.md)
  - [Contributing](backend/docs/contributing.md)

---

## Project Overview

The Healthcare Management System backend provides a robust foundation for medical appointment scheduling, patient records, billing, staff management, and doctor-patient interactions. It supports three main user roles: **Admin**, **Doctor**, and **Patient**. Each role has a tailored set of features and secure access.

## How to Run the Project

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your DB credentials and secrets
   ```
4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```
5. (Optional) Seed the database:
   ```bash
   npx prisma db seed
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```

---

For detailed documentation, see the [docs folder](backend/docs/).
