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

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

The server will run on port 3000 by default, or use the `PORT` environment variable.

## Database

Uses SQLite database (`profiles.db`) which is created automatically on first run.

## Error Handling

- **400 Bad Request**: Missing or empty name
- **404 Not Found**: Profile not found
- **422 Unprocessable Entity**: Invalid data type
- **502 Bad Gateway**: External API returned invalid response
- **500 Internal Server Error**: Server/database errors

## CORS

CORS is enabled with `Access-Control-Allow-Origin: *` for grading script compatibility.