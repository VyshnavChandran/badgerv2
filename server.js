const express = require('express');
const cors = require('cors');
const axios = require('axios');
const yaml = require('js-yaml');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3001;

// Keep the process running
process.on('SIGINT', () => {
  console.log('Received SIGINT. Performing graceful shutdown...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Load secrets from secrets.yaml
const loadSecrets = () => {
  try {
    const fileContents = fs.readFileSync('secrets.yaml', 'utf8');
    const data = yaml.load(fileContents);
    return data.api_keys;
  } catch (e) {
    console.error('Error loading secrets:', e);
    process.exit(1); // Exit if secrets can't be loaded
  }
};

const secrets = loadSecrets();
const API_KEY = secrets.metabase;
const JWT_SECRET = secrets.jwt_secret;

// Load users from YAML file
const loadUsers = () => {
  try {
    const fileContents = fs.readFileSync('users.yaml', 'utf8');
    const data = yaml.load(fileContents);
    return data.users;
  } catch (e) {
    console.error('Error loading users:', e);
    return [];
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Login endpoint
app.post('/api/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { username, password } = req.body;
  const users = loadUsers(); // This will now reload the file on each login attempt
  
  console.log('Loaded users:', users.map(u => u.username)); // Log all usernames
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    console.log('Login successful for user:', username);
    res.json({ token });
  } else {
    console.log('Login failed for user:', username);
    console.log('Available users:', users.map(u => u.username));
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Protected API endpoints
app.get('/api/publishers', authenticateToken, async (req, res) => {
  try {
    const response = await axios.post('https://metabase.quinpress.com/api/dataset', {
      database: 7,
      type: "native",
      native: {
        query: "SELECT\"public\".\"publisher\".\"pid\" AS \"pid\",\"public\".\"publisher\".\"name\" AS \"name\",\"public\".\"publisher\".\"domain_url\" AS \"domain_url\",\"public\".\"publisher\".\"sketches_url\" AS \"sketches_url\",\"public\".\"publisher\".\"publishing_house_id\" AS \"publishing_house_id\",\"Publishing House\".\"id\" AS \"Publishing House__id\",\"Publishing House\".\"name\" AS \"Publishing House__name\"FROM\"public\".\"publisher\"LEFT JOIN \"public\".\"publishing_house\" AS \"Publishing House\" ON \"public\".\"publisher\".\"publishing_house_id\" = \"Publishing House\".\"id\""
      },
      parameters: []
    }, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching publishers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add authentication to other endpoints
app.get('/api/bandwidth/all', authenticateToken, async (req, res) => {
  try {
    const response = await axios.post('https://metabase.quinpress.com/api/card/232/query/json', {}, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching bandwidth data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bandwidth/:publisherName', authenticateToken, async (req, res) => {
  try {
    const response = await axios.post('https://metabase.quinpress.com/api/card/232/query/json', {}, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const publisherData = response.data.filter(item => 
      item['Publisher Name'] === req.params.publisherName
    );
    
    res.json(publisherData);
  } catch (error) {
    console.error('Error fetching publisher bandwidth:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sage-tokens', authenticateToken, async (req, res) => {
  try {
    const response = await axios.post('https://metabase.quinpress.com/api/card/233/query/json', {}, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Sage tokens:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 