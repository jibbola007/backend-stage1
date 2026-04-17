# Backend Stage 1

A Node.js API server that creates user profiles by fetching data from external APIs and storing them in a SQLite database.

## Features

- **Profile Creation**: Accepts a name and fetches gender, age, and nationality data from three external APIs
- **Data Classification**: Applies age group classification and selects the most probable country
- **Duplicate Handling**: Prevents duplicate profiles for the same name
- **CRUD Operations**: Full CRUD operations for profiles
- **Filtering**: Query profiles by gender, country, or age group
- **Error Handling**: Comprehensive error handling for invalid inputs and API failures

## APIs Used

- [Genderize.io](https://api.genderize.io) - Gender prediction
- [Agify.io](https://api.agify.io) - Age prediction
- [Nationalize.io](https://api.nationalize.io) - Nationality prediction

## Endpoints

### POST /api/profiles
Create a new profile or return existing one if name already exists.

**Request Body:**
```json
{
  "name": "ella"
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 46,
    "age_group": "adult",
    "country_id": "DRC",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

### GET /api/profiles/{id}
Retrieve a single profile by ID.

### GET /api/profiles
Retrieve all profiles with optional filtering.

**Query Parameters:**
- `gender` (case-insensitive)
- `country_id` (case-insensitive)
- `age_group` (case-insensitive)

Example: `/api/profiles?gender=male&country_id=NG`

### DELETE /api/profiles/{id}
Delete a profile by ID. Returns 204 No Content on success.

## Database Setup

This application uses PostgreSQL for data persistence. For deployment on Vercel, we recommend using Neon (free tier available).

### Setting up Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string from the dashboard
4. In Vercel dashboard, go to your project settings
5. Add environment variable: `DATABASE_URL` with your Neon connection string

The application will automatically create the required tables on startup.

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variable for database:
   ```bash
   export DATABASE_URL="your-postgresql-connection-string"
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Deployment on Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`
4. Set up Neon database as described above
5. In Vercel dashboard, add `DATABASE_URL` environment variable
6. Redeploy if needed: `vercel --prod`

The application will be available at the provided Vercel URL.

## Error Handling

- **400 Bad Request**: Missing or empty name
- **404 Not Found**: Profile not found
- **422 Unprocessable Entity**: Invalid data type
- **502 Bad Gateway**: External API returned invalid response
- **500 Internal Server Error**: Server/database errors

## CORS

CORS is enabled with `Access-Control-Allow-Origin: *` for grading script compatibility.