# Oracle to PostgreSQL Migration Tool

A comprehensive full-stack application for migrating data from Oracle databases to PostgreSQL databases with a modern web interface, real-time progress tracking, and advanced data type mapping.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Data Type Mappings](#data-type-mappings)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🎯 Overview

This tool provides a complete solution for migrating Oracle databases to PostgreSQL, featuring:

- **Visual Table Mapping**: Discover and map tables with an intuitive interface
- **Real-time Migration**: Monitor progress with live updates and detailed logs
- **Advanced Data Type Handling**: Automatic conversion of Oracle types to PostgreSQL equivalents
- **Flexible Configuration**: Customizable settings for performance, logging, and migration options
- **User Management**: Secure authentication with JWT and role-based access
- **Persistent Storage**: All project data stored in PostgreSQL

## ✨ Features

### Core Features

1. **Project Management**
   - Create, view, edit, and delete migration projects
   - Project status tracking (draft, configured, running, completed, error)
   - User-specific project isolation

2. **Connection Management**
   - Oracle source database connection configuration
   - PostgreSQL target database connection setup
   - Connection testing and validation
   - Support for custom schemas

3. **Table Discovery & Mapping**
   - Automatic table discovery from source database
   - Column-level mapping with data type conversion
   - Auto-mapping functionality for quick setup
   - Manual column mapping with length/precision editing
   - Filter conditions for source data selection
   - Drop/Truncate options before migration

4. **Data Type Conversion**
   - Automatic mapping of Oracle to PostgreSQL data types
   - Support for length, precision, and scale preservation
   - Special handling for LONG RAW, TIMESTAMP, and other complex types
   - Customizable type mapping rules

5. **Migration Execution**
   - Start, pause, and resume migrations
   - Real-time progress tracking
   - Batch processing with configurable batch size
   - Transaction management with auto-commit control
   - Detailed migration logs with database persistence
   - Error handling and recovery

6. **Settings Management**
   - Performance tuning (batch size, parallel jobs, commit interval)
   - SMTP configuration for notifications
   - Logging configuration (level, retention, file output)
   - Migration options (truncate, constraints, sequences, error handling)
   - Flexible key-value storage system for future expansion

7. **Dashboard & Monitoring**
   - Real-time statistics (total, mapped, migrated, pending tables)
   - Migration progress visualization
   - Connection status indicators
   - Auto-refresh on navigation

8. **Security**
   - JWT-based authentication
   - Password hashing with BCrypt
   - Role-based access control (admin/user)
   - User-specific data isolation
   - CORS configuration

## 🏗️ Architecture

### Project Structure

```
oracle-to-postgres-migration/
├── frontend/                    # Next.js React application
│   ├── app/                     # Next.js app router pages
│   │   ├── layout.tsx          # Root layout with Toaster
│   │   └── page.tsx            # Main application page
│   ├── components/              # React components
│   │   ├── dashboard.tsx       # Dashboard with statistics
│   │   ├── connection-form.tsx # Connection configuration
│   │   ├── table-mapping.tsx   # Table mapping interface
│   │   ├── migration-panel.tsx # Migration execution panel
│   │   ├── settings-dialog.tsx  # Settings management
│   │   ├── login-page.tsx      # Authentication UI
│   │   └── ui/                 # Reusable UI components
│   ├── lib/                    # Utilities and services
│   │   ├── api.ts              # API service with JWT
│   │   ├── auth-context.tsx    # Authentication context
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── toast.ts            # Toast notification utility
│   │   └── utils.ts            # Helper functions
│   ├── public/                 # Static assets
│   ├── Dockerfile              # Frontend Docker image
│   └── package.json           # Dependencies
│
├── backend/                    # Spring Boot REST API
│   ├── src/main/java/com/ora2pg/migration/
│   │   ├── controller/         # REST controllers
│   │   │   ├── AuthController.java
│   │   │   ├── ProjectController.java
│   │   │   ├── ConnectionController.java
│   │   │   ├── DatabaseController.java
│   │   │   ├── MigrationController.java
│   │   │   └── SettingsController.java
│   │   ├── service/           # Business logic
│   │   │   ├── AuthService.java
│   │   │   ├── ProjectService.java
│   │   │   ├── DatabaseService.java
│   │   │   ├── MigrationService.java
│   │   │   └── SettingsService.java
│   │   ├── entity/            # JPA entities
│   │   │   ├── User.java
│   │   │   ├── ProjectEntity.java
│   │   │   ├── TableMappingEntity.java
│   │   │   ├── ColumnMappingEntity.java
│   │   │   ├── ConnectionConfigEntity.java
│   │   │   ├── MigrationLogEntity.java
│   │   │   └── SettingEntity.java
│   │   ├── repository/         # JPA repositories
│   │   ├── model/             # DTOs and data models
│   │   ├── mapper/            # Entity-DTO mappers
│   │   ├── config/            # Configuration classes
│   │   ├── filter/            # JWT authentication filter
│   │   └── util/              # Utilities
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── application-docker.properties
│   ├── Dockerfile             # Backend Docker image
│   └── pom.xml                # Maven dependencies
│
├── docker-compose.yml         # Docker Compose configuration
├── .dockerignore              # Docker ignore patterns
└── README.md                  # This file
```

### System Architecture

```
┌─────────────────┐
│   Frontend       │
│   (Next.js)     │
│   Port: 3000    │
└────────┬────────┘
         │ HTTP/REST
         │ JWT Auth
         ▼
┌─────────────────┐
│   Backend API   │
│  (Spring Boot)  │
│   Port: 8080    │
└────────┬────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │   Oracle    │
│ (Metadata)  │  │  (Source)   │
│ Port: 5432  │  │  (External) │
└─────────────┘  └─────────────┘
         │
         ▼
┌─────────────┐
│ PostgreSQL  │
│  (Target)   │
│  (External) │
└─────────────┘
```

### Database Schema

#### Users Table
- `id` (UUID, Primary Key)
- `email` (Unique, Not Null)
- `password` (BCrypt hashed)
- `name`
- `role` (admin/user)
- `created_at`, `updated_at`

#### Projects Table
- `id` (UUID, Primary Key)
- `name`, `description`
- `status` (draft/configured/running/completed/error)
- `user_id` (Foreign Key to users)
- `created_at`, `updated_at`

#### Connection Configs Table
- `id` (UUID, Primary Key)
- `type` (oracle/postgresql)
- `host`, `port`, `database`, `schema`
- `username`, `password` (encrypted)
- `connection_type` (source/target)
- `project_id` (Foreign Key to projects)

#### Table Mappings Table
- `id` (UUID, Primary Key)
- `source_table`, `source_schema`
- `target_table`, `target_schema`
- `enabled` (Boolean)
- `status` (pending/mapped/migrated/error)
- `filter_condition` (TEXT, WHERE clause)
- `drop_before_insert` (Boolean)
- `truncate_before_insert` (Boolean)
- `project_id` (Foreign Key to projects)

#### Column Mappings Table
- `id` (UUID, Primary Key)
- `source_column`, `source_data_type`
- `source_data_length`, `source_data_precision`, `source_data_scale`
- `target_column`, `target_data_type`
- `target_data_length`, `target_data_precision`, `target_data_scale`
- `transformation`
- `nullable`, `is_primary_key`, `is_foreign_key`
- `table_mapping_id` (Foreign Key to table_mappings)

#### Migration Logs Table
- `id` (UUID, Primary Key)
- `project_id` (Foreign Key to projects)
- `timestamp`
- `level` (info/warning/error/success)
- `message`, `details` (TEXT)

#### Settings Table
- `id` (UUID, Primary Key)
- `param_key` (Unique with param_tab)
- `param_value` (TEXT)
- `param_tab` (performance/smtp/logging/migration)
- `param_type` (string/number/boolean/json)
- `description`

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16.0.3
- **UI Library**: React 19.2.0
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Notifications**: Sonner (toast notifications)
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: React hooks (useState, useEffect, Context API)
- **HTTP Client**: Fetch API with JWT token management

### Backend
- **Framework**: Spring Boot 3.2.0
- **Language**: Java 17
- **Build Tool**: Maven
- **Database**: PostgreSQL (for metadata storage)
- **ORM**: Spring Data JPA / Hibernate
- **Security**: Spring Security with JWT
- **Password Hashing**: BCrypt
- **Database Drivers**:
  - Oracle JDBC (ojdbc11)
  - PostgreSQL JDBC
- **Dependencies**:
  - Spring Web (REST APIs)
  - Spring Data JPA
  - Spring Security
  - Lombok
  - Jackson (JSON)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 12+
- **Reverse Proxy**: (Optional) Nginx for production

## 📦 Prerequisites

### For Development
- **Java**: JDK 17 or higher
- **Node.js**: 20.x or higher
- **Maven**: 3.6+ (for backend)
- **npm/pnpm**: Latest version (for frontend)
- **PostgreSQL**: 12+ (for metadata storage)
- **Oracle Database**: Access to source Oracle database
- **PostgreSQL Database**: Access to target PostgreSQL database

### For Docker Deployment
- **Docker**: 20.10 or higher
- **Docker Compose**: 2.0 or higher
- **RAM**: At least 4GB available
- **Ports**: 3000, 8080, 5432 available

## 🚀 Installation

### Option 1: Docker Compose (Recommended)

This is the easiest way to get started:

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd oracle-to-postgres-migration
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **Check service status**:
   ```bash
   docker-compose ps
   ```

4. **View logs** (optional):
   ```bash
   docker-compose logs -f
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/api
   - PostgreSQL: localhost:5432

### Option 2: Manual Installation

#### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Build the project**:
   ```bash
   mvn clean install
   ```

3. **Configure database**:
   - Edit `src/main/resources/application.properties`
   - Update PostgreSQL connection details:
     ```properties
     spring.datasource.url=jdbc:postgresql://localhost:5432/migrationdb
     spring.datasource.username=postgres
     spring.datasource.password=postgres
     ```

4. **Configure JWT secret**:
   ```properties
   jwt.secret=your-256-bit-secret-key-for-jwt-token-generation-minimum-32-characters-long
   jwt.expiration=86400000
   ```

5. **Run the application**:
   ```bash
   mvn spring-boot:run
   ```

   The API will be available at `http://localhost:8080/api`

#### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure API URL** (if backend is not on localhost:8080):
   - Create `.env.local`:
     ```env
     NEXT_PUBLIC_API_URL=http://localhost:8080/api
     ```

4. **Run the development server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

   The frontend will be available at `http://localhost:3000`

#### Database Setup

1. **Create PostgreSQL database**:
   ```sql
   CREATE DATABASE migrationdb;
   ```

2. **The application will automatically create tables** on first startup (using `spring.jpa.hibernate.ddl-auto=update`)

## ⚙️ Configuration

### Backend Configuration

Edit `backend/src/main/resources/application.properties`:

```properties
# Server Configuration
server.port=8080
server.servlet.context-path=/api

# PostgreSQL Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/migrationdb
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA Configuration
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false

# JWT Configuration
jwt.secret=your-256-bit-secret-key-for-jwt-token-generation-minimum-32-characters-long
jwt.expiration=86400000

# CORS Configuration
spring.web.cors.allowed-origins=http://localhost:3000
spring.web.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS
spring.web.cors.allowed-headers=*
spring.web.cors.allow-credentials=true

# Migration Defaults
migration.default.batch-size=1000
migration.default.parallel-jobs=4
migration.default.commit-interval=10000
```

### Frontend Configuration

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### Docker Configuration

Edit `docker-compose.yml` to customize:

- **JWT Secret**: Update `JWT_SECRET` environment variable
- **Database Password**: Update PostgreSQL password
- **Ports**: Change port mappings if needed
- **API URL**: Update `NEXT_PUBLIC_API_URL` for frontend

## 🚢 Deployment

### Docker Compose Deployment

1. **Production Configuration**:
   ```bash
   # Update docker-compose.yml with production settings
   # - Change default passwords
   # - Set strong JWT secret
   # - Configure environment variables
   ```

2. **Build and start**:
   ```bash
   docker-compose build
   docker-compose up -d
   ```

3. **Verify services**:
   ```bash
   docker-compose ps
   docker-compose logs
   ```

### Production Deployment Considerations

1. **Security**:
   - Use strong JWT secret (minimum 32 characters)
   - Change default database passwords
   - Enable HTTPS with reverse proxy (Nginx/Traefik)
   - Configure firewall rules
   - Use secrets management for sensitive data

2. **Database**:
   - Use external PostgreSQL instance
   - Set up regular backups
   - Configure connection pooling
   - Monitor performance

3. **Monitoring**:
   - Add health check endpoints
   - Set up logging aggregation
   - Monitor resource usage
   - Configure alerts

4. **Scaling**:
   - Use load balancer for multiple backend instances
   - Configure database connection pooling
   - Use Redis for session management (if needed)

### Manual Deployment

#### Backend

1. **Build JAR**:
   ```bash
   cd backend
   mvn clean package
   ```

2. **Run JAR**:
   ```bash
   java -jar target/migration-api-1.0.0.jar
   ```

#### Frontend

1. **Build for production**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

## 📖 Usage Guide

### Getting Started

1. **Access the application**: Navigate to http://localhost:3000

2. **Register/Login**:
   - Click "Sign up" to create a new account
   - Or login with existing credentials

3. **Create a Project**:
   - Click "New Project" in the sidebar
   - Enter project name and description
   - Click "Create"

4. **Configure Connections**:
   - Go to "Connections" tab
   - **Source (Oracle)**:
     - Enter Oracle database connection details
     - Click "Test Connection" to verify
     - Click "Save Source Connection"
   - **Target (PostgreSQL)**:
     - Enter PostgreSQL database connection details
     - Click "Test Connection" to verify
     - Click "Save Target Connection"

5. **Discover and Map Tables**:
   - Go to "Table Mapping" tab
   - Click "Discover Tables" to find all tables in source database
   - Review auto-mapped tables
   - Edit table/column mappings as needed:
     - Click edit icon to modify target table name
     - Expand table to edit column mappings
     - Adjust data types, lengths, precision as needed
   - Configure migration options:
     - **Filter Condition**: Add WHERE clause to filter source data
     - **Drop Before Insert**: Drop target table before migration
     - **Truncate Before Insert**: Clear target table data before migration

6. **Configure Settings** (Optional):
   - Click settings icon in sidebar
   - Adjust performance settings (batch size, parallel jobs)
   - Configure logging options
   - Set migration preferences

7. **Start Migration**:
   - Go to "Migration Execution" tab
   - Review migration summary
   - Click "Start Migration"
   - Monitor progress in real-time
   - View detailed logs

8. **Monitor Progress**:
   - View dashboard for overall statistics
   - Check migration panel for detailed progress
   - Review migration logs for any issues

### Advanced Features

#### Filter Conditions

Add WHERE clauses to filter source data during migration:

```sql
-- Example: Only migrate active records
status = 'ACTIVE'

-- Example: Migrate records from specific date
created_date > '2024-01-01' AND region = 'US'

-- Example: Migrate specific IDs
id IN (1, 2, 3, 4, 5)
```

#### Data Type Customization

When editing column mappings:
- **VARCHAR/CHAR**: Edit length parameter
- **NUMERIC**: Edit precision and scale
- **TIMESTAMP**: Edit precision if needed

#### Migration Options

- **Drop Before Insert**: Completely removes target table and recreates it
- **Truncate Before Insert**: Clears data but keeps table structure
- **Auto Commit**: Enable for immediate commits, disable for batch commits

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`
Login and receive JWT token.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "id": "uuid"
}
```

#### POST `/api/auth/register`
Register a new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "user"
}
```

### Project Endpoints (Protected)

#### GET `/api/projects`
Get all projects for the authenticated user.

**Headers**: `Authorization: Bearer <token>`

**Response**: Array of Project objects

#### GET `/api/projects/{id}`
Get project details by ID.

#### POST `/api/projects`
Create a new project.

**Request**:
```json
{
  "name": "Project Name",
  "description": "Project Description"
}
```

#### PUT `/api/projects/{id}`
Update project.

#### DELETE `/api/projects/{id}`
Delete project.

#### POST `/api/projects/{id}/connections/{type}`
Save connection configuration.

**Path Parameters**:
- `type`: `source` or `target`

**Request**:
```json
{
  "type": "oracle",
  "host": "localhost",
  "port": 1521,
  "database": "ORCL",
  "schema": "SCHEMA_NAME",
  "username": "username",
  "password": "password"
}
```

#### PUT `/api/projects/{id}/table-mappings`
Save table mappings.

**Request**: Array of TableMapping objects

### Connection Endpoints

#### POST `/api/connections/test`
Test database connection (public endpoint).

**Request**: ConnectionConfig object

**Response**:
```json
{
  "success": true,
  "message": "Connection successful"
}
```

### Database Endpoints (Protected)

#### POST `/api/database/discover-tables`
Discover tables from source database.

**Request**:
```json
{
  "connection": { /* ConnectionConfig */ },
  "schema": "SCHEMA_NAME"
}
```

**Response**: Array of TableInfo objects with columns

#### POST `/api/database/auto-map`
Auto-map source tables to target.

**Request**:
```json
{
  "sourceTables": [ /* TableInfo array */ ],
  "targetSchema": "public"
}
```

**Response**: Array of TableMapping objects

### Migration Endpoints (Protected)

#### POST `/api/migration/start/{projectId}`
Start migration for a project.

**Request** (optional):
```json
{
  "batchSize": 1000,
  "commitInterval": 10000,
  "parallelJobs": 4,
  "autoCommit": false
}
```

#### GET `/api/migration/progress/{projectId}`
Get migration progress.

**Response**:
```json
{
  "projectId": "uuid",
  "status": "running",
  "startTime": "2024-01-01T00:00:00",
  "totalTables": 10,
  "completedTables": 5,
  "totalRows": 100000,
  "migratedRows": 50000,
  "currentTable": "TABLE_NAME",
  "logs": [ /* MigrationLog array */ ]
}
```

#### POST `/api/migration/pause/{projectId}`
Pause running migration.

#### POST `/api/migration/resume/{projectId}`
Resume paused migration.

### Settings Endpoints (Protected)

#### GET `/api/settings`
Get application settings.

**Response**: AppSettings object

#### PUT `/api/settings`
Update application settings.

**Request**: AppSettings object

## 🔄 Data Type Mappings

The application automatically maps Oracle data types to PostgreSQL:

| Oracle Type | PostgreSQL Type | Notes |
|------------|----------------|-------|
| `NUMBER` | `NUMERIC` | Preserves precision and scale |
| `NUMBER(p)` | `NUMERIC(p)` | With precision |
| `NUMBER(p,s)` | `NUMERIC(p,s)` | With precision and scale |
| `VARCHAR2(n)` | `VARCHAR(n)` | Preserves length |
| `VARCHAR2` | `TEXT` | If no length specified |
| `NVARCHAR2(n)` | `VARCHAR(n)` | Unicode support |
| `CHAR(n)` | `CHAR(n)` | Preserves length |
| `NCHAR(n)` | `CHAR(n)` | Unicode support |
| `CLOB` | `TEXT` | Large text |
| `NCLOB` | `TEXT` | Unicode large text |
| `LONG` | `TEXT` | Legacy large text |
| `DATE` | `TIMESTAMP` | Date and time |
| `TIMESTAMP` | `TIMESTAMP` | With precision |
| `TIMESTAMP(n)` | `TIMESTAMP(n)` | Preserves precision |
| `BLOB` | `BYTEA` | Binary large object |
| `RAW(n)` | `BYTEA` | Variable binary |
| `LONG RAW` | `BYTEA` | Large binary (handles hex strings) |
| `BFILE` | `BYTEA` | External binary file |
| `BINARY_FLOAT` | `REAL` | 32-bit floating point |
| `BINARY_DOUBLE` | `DOUBLE PRECISION` | 64-bit floating point |
| `FLOAT` | `DOUBLE PRECISION` | Floating point |
| `INTEGER` | `INTEGER` | Integer |
| `SMALLINT` | `SMALLINT` | Small integer |
| `BOOLEAN` | `BOOLEAN` | Boolean |
| `ROWID` | `VARCHAR(18)` | Row identifier |
| `UROWID` | `VARCHAR(4000)` | Universal row identifier |
| `XMLTYPE` | `XML` | XML data |

### Special Handling

- **LONG RAW**: Automatically converts hex strings to binary data
- **TIMESTAMP**: Handles Oracle TIMESTAMP types with proper conversion
- **VARCHAR without length**: Maps to TEXT for PostgreSQL compatibility
- **NUMBER without precision**: Maps to NUMERIC without constraints

## 🐛 Troubleshooting

### Common Issues

#### Services Won't Start

1. **Check port availability**:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   netstat -ano | findstr :8080
   netstat -ano | findstr :5432
   
   # Linux/Mac
   lsof -i :3000
   lsof -i :8080
   lsof -i :5432
   ```

2. **Check Docker logs**:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   docker-compose logs postgres
   ```

#### Database Connection Errors

1. **Verify PostgreSQL is running**:
   ```bash
   docker-compose ps postgres
   ```

2. **Check connection details** in `application.properties`

3. **Verify database exists**:
   ```sql
   \l  -- List databases
   ```

#### Frontend Can't Connect to Backend

1. **Verify backend is running**:
   ```bash
   curl http://localhost:8080/api/auth/login
   ```

2. **Check CORS configuration** in `application.properties`

3. **Verify API URL** in frontend `.env.local`

#### JWT Authentication Errors

1. **Check JWT secret** is set and at least 32 characters

2. **Verify token** is included in requests:
   ```javascript
   // Check browser console for token
   localStorage.getItem('auth_token')
   ```

3. **Check token expiration** (default: 24 hours)

#### Migration Errors

1. **Check Oracle connection**:
   - Verify Oracle database is accessible
   - Check network connectivity
   - Verify credentials

2. **Check PostgreSQL connection**:
   - Verify target database exists
   - Check user permissions
   - Verify schema exists

3. **Review migration logs**:
   - Check migration panel for detailed errors
   - Review database logs
   - Check application logs

#### Data Type Conversion Issues

1. **Check column mappings**:
   - Verify data types are correctly mapped
   - Check length/precision settings
   - Review special type handling (LONG RAW, TIMESTAMP)

2. **Manual adjustment**:
   - Edit column mappings in Table Mapping view
   - Adjust data types as needed
   - Re-run migration

### Performance Issues

1. **Adjust batch size** in Settings:
   - Smaller batches for large rows
   - Larger batches for small rows

2. **Tune commit interval**:
   - More frequent commits for safety
   - Less frequent for performance

3. **Monitor database connections**:
   - Check connection pool settings
   - Monitor active connections

## 🤝 Contributing

### Development Setup

1. **Fork the repository**

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and test**:
   - Follow code style guidelines
   - Add tests for new features
   - Update documentation

4. **Commit changes**:
   ```bash
   git commit -m "Add: description of changes"
   ```

5. **Push and create Pull Request**

### Code Style

- **Backend**: Follow Java conventions, use Lombok for boilerplate
- **Frontend**: Follow TypeScript/React best practices, use functional components
- **Documentation**: Update README and code comments

## 📝 License

This project is part of the Oracle to PostgreSQL Migration Tool.

## 📞 Support

For issues or questions:
- Check this README
- Review application logs
- Check GitHub issues (if applicable)

---

**Built with ❤️ for seamless database migration**

