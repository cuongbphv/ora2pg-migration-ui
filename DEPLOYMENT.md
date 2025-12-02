# Deployment Guide

This guide explains how to deploy the Oracle to PostgreSQL Migration Tool using Docker.

## Prerequisites

- Docker 20.10 or higher
- Docker Compose 2.0 or higher
- At least 4GB of available RAM
- Ports 3000, 8080, and 5432 available

## Quick Start

1. **Clone the repository** (if not already done)

2. **Navigate to the project root**:
   ```bash
   cd oracle-to-postgres-migration
   ```

3. **Start all services**:
   ```bash
   docker-compose up -d
   ```

4. **Check service status**:
   ```bash
   docker-compose ps
   ```

5. **View logs**:
   ```bash
   docker-compose logs -f
   ```

## Services

The application consists of three services:

### 1. PostgreSQL Database
- **Port**: 5432
- **Database**: migrationdb
- **Username**: postgres
- **Password**: postgres
- **Purpose**: Stores user accounts and project metadata

### 2. Backend API (Spring Boot)
- **Port**: 8080
- **Base URL**: http://localhost:8080/api
- **Purpose**: REST API for migration operations

### 3. Frontend (Next.js)
- **Port**: 3000
- **URL**: http://localhost:3000
- **Purpose**: Web interface for the migration tool

## Configuration

### Environment Variables

#### Backend
Edit `docker-compose.yml` to customize:
- `JWT_SECRET`: Secret key for JWT token generation (minimum 32 characters)
- Database connection settings

#### Frontend
Edit `docker-compose.yml` to customize:
- `NEXT_PUBLIC_API_URL`: Backend API URL

### Database Configuration

The PostgreSQL database is automatically initialized on first startup. To reset:
```bash
docker-compose down -v
docker-compose up -d
```

## Building Images

To rebuild images after code changes:

```bash
docker-compose build
docker-compose up -d
```

## Stopping Services

```bash
docker-compose down
```

To also remove volumes (database data):
```bash
docker-compose down -v
```

## Accessing the Application

1. Open your browser and navigate to: http://localhost:3000

2. **Register a new account**:
   - Click "Sign up"
   - Enter your email, name, and password
   - Click "Create Account"

3. **Or login** if you already have an account

4. **Create a migration project**:
   - Click "New Project" in the sidebar
   - Enter project name and description
   - Configure source (Oracle) and target (PostgreSQL) connections
   - Map tables and start migration

## Troubleshooting

### Services won't start

1. Check if ports are already in use:
   ```bash
   # Check port 3000
   lsof -i :3000
   # Check port 8080
   lsof -i :8080
   # Check port 5432
   lsof -i :5432
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs backend
   docker-compose logs frontend
   docker-compose logs postgres
   ```

### Database connection errors

1. Ensure PostgreSQL container is healthy:
   ```bash
   docker-compose ps postgres
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

### Frontend can't connect to backend

1. Verify backend is running:
   ```bash
   curl http://localhost:8080/api/auth/login
   ```

2. Check CORS configuration in `backend/src/main/resources/application-docker.properties`

### JWT authentication errors

1. Ensure `JWT_SECRET` is set in `docker-compose.yml`
2. Secret must be at least 32 characters long

## Production Deployment

For production deployment, consider:

1. **Change default passwords**:
   - Update PostgreSQL password in `docker-compose.yml`
   - Use environment variables or secrets management

2. **Use HTTPS**:
   - Add reverse proxy (nginx/traefik)
   - Configure SSL certificates

3. **Database persistence**:
   - Use named volumes or external database
   - Set up regular backups

4. **Security**:
   - Use strong JWT secret
   - Enable rate limiting
   - Configure firewall rules
   - Use secrets management for sensitive data

5. **Monitoring**:
   - Add health check endpoints
   - Set up logging aggregation
   - Monitor resource usage

## Manual Deployment (Without Docker)

### Backend

1. **Prerequisites**:
   - Java 17+
   - Maven 3.6+
   - PostgreSQL 12+

2. **Build**:
   ```bash
   cd backend
   mvn clean package
   ```

3. **Configure**:
   - Edit `src/main/resources/application.properties`
   - Set database connection details
   - Configure JWT secret

4. **Run**:
   ```bash
   java -jar target/migration-api-1.0.0.jar
   ```

### Frontend

1. **Prerequisites**:
   - Node.js 20+
   - npm or pnpm

2. **Build**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

3. **Run**:
   ```bash
   npm start
   ```

## Support

For issues or questions, please check:
- Project README files
- Application logs
- GitHub issues (if applicable)

