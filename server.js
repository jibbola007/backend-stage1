const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const { v7: uuidv7 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/profiles',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Enable CORS for all origins
app.use(cors({
  origin: '*'
}));

app.use(express.json());

// Create profiles table
async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      gender TEXT,
      gender_probability REAL,
      sample_size INTEGER,
      age INTEGER,
      age_group TEXT,
      country_id TEXT,
      country_probability REAL,
      created_at TIMESTAMP WITH TIME ZONE
    )
  `;
  try {
    await pool.query(query);
    console.log('Profiles table ready.');
  } catch (err) {
    console.error('Error creating table:', err.message);
  }
}

createTable();

// Helper function to classify age group
function getAgeGroup(age) {
  if (age >= 0 && age <= 12) return 'child';
  if (age >= 13 && age <= 19) return 'teenager';
  if (age >= 20 && age <= 59) return 'adult';
  if (age >= 60) return 'senior';
  return null;
}

// Helper function to get country with highest probability
function getTopCountry(countries) {
  if (!countries || countries.length === 0) return null;
  return countries.reduce((max, country) => country.probability > max.probability ? country : max);
}

// API endpoints

// POST /api/profiles
app.post('/api/profiles', async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ status: 'error', message: 'Missing or empty name' });
  }

  const trimmedName = name.trim().toLowerCase();

  try {
    // Check if profile already exists
    const existing = await pool.query('SELECT * FROM profiles WHERE name = $1', [trimmedName]);
    
    if (existing.rows.length > 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Profile already exists',
        data: {
          id: existing.rows[0].id,
          name: existing.rows[0].name,
          gender: existing.rows[0].gender,
          gender_probability: existing.rows[0].gender_probability,
          sample_size: existing.rows[0].sample_size,
          age: existing.rows[0].age,
          age_group: existing.rows[0].age_group,
          country_id: existing.rows[0].country_id,
          country_probability: existing.rows[0].country_probability,
          created_at: existing.rows[0].created_at.toISOString()
        }
      });
    }

    // Fetch data from APIs
    const [genderizeRes, agifyRes, nationalizeRes] = await Promise.all([
      axios.get(`https://api.genderize.io?name=${encodeURIComponent(trimmedName)}`),
      axios.get(`https://api.agify.io?name=${encodeURIComponent(trimmedName)}`),
      axios.get(`https://api.nationalize.io?name=${encodeURIComponent(trimmedName)}`)
    ]);

    const genderize = genderizeRes.data;
    const agify = agifyRes.data;
    const nationalize = nationalizeRes.data;

    // Validate responses
    if (!genderize.gender || genderize.count === 0) {
      return res.status(502).json({ status: 'error', message: 'Genderize returned an invalid response' });
    }
    if (agify.age === null) {
      return res.status(502).json({ status: 'error', message: 'Agify returned an invalid response' });
    }
    if (!nationalize.country || nationalize.country.length === 0) {
      return res.status(502).json({ status: 'error', message: 'Nationalize returned an invalid response' });
    }

    // Classify data
    const ageGroup = getAgeGroup(agify.age);
    const topCountry = getTopCountry(nationalize.country);

    // Create profile
    const id = uuidv7();
    const createdAt = new Date();

    const query = `
      INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    const values = [
      id,
      trimmedName,
      genderize.gender,
      genderize.probability,
      genderize.count,
      agify.age,
      ageGroup,
      topCountry.country_id,
      topCountry.probability,
      createdAt
    ];

    await pool.query(query, values);

    res.status(201).json({
      status: 'success',
      data: {
        id,
        name: trimmedName,
        gender: genderize.gender,
        gender_probability: genderize.probability,
        sample_size: genderize.count,
        age: agify.age,
        age_group: ageGroup,
        country_id: topCountry.country_id,
        country_probability: topCountry.probability,
        created_at: createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      return res.status(502).json({ status: 'error', message: 'External API failure' });
    }
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// GET /api/profiles/:id
app.get('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Profile not found' });
    }

    const row = result.rows[0];
    res.json({
      status: 'success',
      data: {
        id: row.id,
        name: row.name,
        gender: row.gender,
        gender_probability: row.gender_probability,
        sample_size: row.sample_size,
        age: row.age,
        age_group: row.age_group,
        country_id: row.country_id,
        country_probability: row.country_probability,
        created_at: row.created_at.toISOString()
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// GET /api/profiles
app.get('/api/profiles', async (req, res) => {
  const { gender, country_id, age_group } = req.query;

  try {
    let query = 'SELECT id, name, gender, age, age_group, country_id FROM profiles';
    const params = [];
    const conditions = [];

    if (gender) {
      conditions.push('LOWER(gender) = LOWER($' + (params.length + 1) + ')');
      params.push(gender);
    }

    if (country_id) {
      conditions.push('LOWER(country_id) = LOWER($' + (params.length + 1) + ')');
      params.push(country_id);
    }

    if (age_group) {
      conditions.push('LOWER(age_group) = LOWER($' + (params.length + 1) + ')');
      params.push(age_group);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// DELETE /api/profiles/:id
app.delete('/api/profiles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM profiles WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ status: 'error', message: 'Profile not found' });
    }

    res.status(204).send();
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Database error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
