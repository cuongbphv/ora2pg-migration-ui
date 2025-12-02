# Oracle to PostgreSQL Migration Tool - Project Summary

## Overview

This project is a full-stack application for migrating data from Oracle databases to PostgreSQL databases. It consists of a Next.js React frontend and a Spring Boot backend API.

## Project Structure

```
oracle-to-postgres-migration/
├── frontend/          # Next.js React application
│   ├── app/          # Next.js app router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities, types, and API service
│   └── public/       # Static assets
│
└── backend/          # Spring Boot REST API
    ├── src/
    │   ├── main/
    │   │   ├── java/com/ora2pg/migration/
    │   │   │   ├── controller/    # REST controllers
    │   │   │   ├── service/        # Business logic
    │   │   │   ├── model/          # DTOs and data models
    │   │   │   ├── util/           # Utilities
    │   │   │   ├── config/         # Configuration classes
    │   │   │   └── exception/      # Exception handlers
    │   │   └── resources/
    │   │       └── application.properties
    │   └── test/
    └── pom.xml
```

## Frontend (React/Next.js)

### Technology Stack
- **Framework**: Next.js 16.0.3
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: React hooks (useState, useEffect)

### Key Features
1. **Project Management**
   - Create, view, and manage migration projects
   - Project status tracking (draft, configured, running, completed, error)

2. **Connection Configuration**
   - Oracle source database connection setup
   - PostgreSQL target database connection setup
   - Connection testing

3. **Table Mapping**
   - Discover tables from source database
   - Map source tables to target tables
   - Column mapping with data type conversion
   - Auto-mapping functionality

4. **Data Type Rules**
   - View Oracle to PostgreSQL data type mappings
   - Custom mapping rules

5. **Migration Execution**
   - Start/pause/resume migrations
   - Real-time progress tracking
   - Migration logs
   - Progress statistics

6. **Settings**
   - Performance settings (batch size, parallel jobs)
   - SMTP configuration
   - Logging configuration
   - Migration options

### Current Status
- ✅ UI components implemented
- ✅ Mock data and state management
- ⚠️ API integration pending (API service created but not connected)

## Backend (Spring Boot)

### Technology Stack
- **Framework**: Spring Boot 3.2.0
- **Java Version**: 17
- **Build Tool**: Maven
- **Database Drivers**: 
  - Oracle JDBC (ojdbc11)
  - PostgreSQL JDBC
- **Dependencies**: 
  - Spring Web (REST APIs)
  - Spring Data JPA
  - Lombok
  - Jackson (JSON)

### API Endpoints

#### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/{id}` - Get project details
- `POST /api/projects` - Create new project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `POST /api/projects/{id}/connections/{type}` - Save connection config
- `PUT /api/projects/{id}/table-mappings` - Save table mappings

#### Connections
- `POST /api/connections/test` - Test database connection

#### Database Operations
- `POST /api/database/discover-tables` - Discover tables from database
- `POST /api/database/auto-map` - Auto-map source tables to target

#### Migration
- `POST /api/migration/start/{projectId}` - Start migration
- `GET /api/migration/progress/{projectId}` - Get migration progress
- `POST /api/migration/pause/{projectId}` - Pause migration
- `POST /api/migration/resume/{projectId}` - Resume migration

#### Settings
- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update settings

### Key Components

1. **DatabaseConnectionManager**
   - Manages database connections
   - Connection pooling
   - Connection testing

2. **DatabaseService**
   - Table discovery
   - Column discovery
   - Auto-mapping logic
   - Data type conversion

3. **MigrationService**
   - Migration execution
   - Progress tracking
   - Batch processing
   - Error handling

4. **ProjectService**
   - Project CRUD operations
   - In-memory storage (can be replaced with database)

### Data Type Mappings

The backend automatically maps Oracle data types to PostgreSQL:
- `NUMBER` → `NUMERIC`
- `VARCHAR2` → `VARCHAR`
- `CLOB` → `TEXT`
- `DATE` → `TIMESTAMP`
- `BLOB` → `BYTEA`
- `BINARY_FLOAT` → `REAL`
- `BINARY_DOUBLE` → `DOUBLE PRECISION`
- And many more...

## Getting Started

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Build the project:
   ```bash
   mvn clean install
   ```

3. Run the application:
   ```bash
   mvn spring-boot:run
   ```

The API will be available at `http://localhost:8080/api`

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

The frontend will be available at `http://localhost:3000`

## Integration Steps

To connect the frontend to the backend:

1. **Update API Base URL** (if needed):
   - Edit `frontend/lib/api.ts`
   - Set `API_BASE_URL` or use environment variable `NEXT_PUBLIC_API_URL`

2. **Replace Mock Data**:
   - Update components to use `apiService` from `frontend/lib/api.ts`
   - Replace mock data calls with actual API calls

3. **Example Integration** (in a component):
   ```typescript
   import { apiService } from '@/lib/api';
   
   const handleTestConnection = async () => {
     const result = await apiService.testConnection(connectionConfig);
     if (result.data) {
       // Handle success
     } else {
       // Handle error
     }
   };
   ```

## Configuration

### Backend Configuration
Edit `backend/src/main/resources/application.properties`:
- Server port
- CORS settings
- Database connection (if using persistent storage)
- Migration defaults

### Frontend Configuration
Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

## Features Implemented

### ✅ Completed
- Frontend UI components
- Backend REST API structure
- Database connection management
- Table discovery
- Column mapping
- Data type conversion
- Migration execution framework
- Progress tracking

### ⚠️ Pending
- Frontend-backend integration
- Persistent storage for projects (currently in-memory)
- Error handling improvements
- Authentication/authorization
- Advanced migration features (constraints, indexes, sequences)
- Data validation
- Rollback functionality

## Notes

- The backend currently uses in-memory storage for projects. For production, consider using a persistent database.
- Database connections are pooled for performance.
- Migration runs in background threads to avoid blocking.
- CORS is configured to allow frontend-backend communication.

## Next Steps

1. Integrate frontend with backend API
2. Add persistent storage for projects
3. Implement authentication
4. Add data validation
5. Enhance error handling
6. Add migration rollback capability
7. Implement advanced features (constraints, indexes, sequences)

