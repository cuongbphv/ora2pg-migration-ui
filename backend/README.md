# Oracle to PostgreSQL Migration API

Spring Boot REST API for migrating data from Oracle to PostgreSQL databases.

## Features

- **Connection Management**: Test and manage Oracle and PostgreSQL database connections
- **Table Discovery**: Automatically discover tables and columns from source database
- **Table Mapping**: Map source tables to target tables with column mappings
- **Data Type Mapping**: Automatic mapping of Oracle data types to PostgreSQL equivalents
- **Migration Execution**: Execute data migration with progress tracking
- **Real-time Progress**: Monitor migration progress with detailed logs

## Prerequisites

- Java 17 or higher
- Maven 3.6 or higher
- Oracle Database (source)
- PostgreSQL Database (target)

## Setup

1. **Clone the repository** (if not already done)

2. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

3. **Build the project**:
   ```bash
   mvn clean install
   ```

4. **Run the application**:
   ```bash
   mvn spring-boot:run
   ```

The API will be available at `http://localhost:8080/api`

## API Endpoints

### Projects

- `GET /api/projects` - Get all projects
- `GET /api/projects/{id}` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `POST /api/projects/{id}/connections/{type}` - Save connection (type: source/target)
- `PUT /api/projects/{id}/table-mappings` - Save table mappings

### Connections

- `POST /api/connections/test` - Test database connection

### Database

- `POST /api/database/discover-tables` - Discover tables from database
- `POST /api/database/auto-map` - Auto-map source tables to target

### Migration

- `POST /api/migration/start/{projectId}` - Start migration
- `GET /api/migration/progress/{projectId}` - Get migration progress
- `POST /api/migration/pause/{projectId}` - Pause migration
- `POST /api/migration/resume/{projectId}` - Resume migration

### Settings

- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update application settings

## Configuration

Edit `src/main/resources/application.properties` to configure:

- Server port (default: 8080)
- CORS settings
- Logging levels
- Migration defaults (batch size, parallel jobs, etc.)

## Data Type Mappings

The API automatically maps Oracle data types to PostgreSQL:

- `NUMBER` → `NUMERIC`
- `VARCHAR2` → `VARCHAR`
- `CLOB` → `TEXT`
- `DATE` → `TIMESTAMP`
- `BLOB` → `BYTEA`
- And many more...

## Architecture

- **Controllers**: REST API endpoints
- **Services**: Business logic for database operations and migration
- **Models**: Data transfer objects (DTOs)
- **Utils**: Database connection management

## Development

### Building

```bash
mvn clean package
```

### Running Tests

```bash
mvn test
```

## Notes

- The application uses in-memory storage for projects (H2 database)
- For production, consider using a persistent database (PostgreSQL, MySQL, etc.)
- Database connections are pooled and reused for performance
- Migration runs in background threads to avoid blocking

## License

This project is part of the Oracle to PostgreSQL Migration Tool.

