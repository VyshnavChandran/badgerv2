const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const API_KEY = 'mb_SPFKd4C8hEOVo51H7P9rwVS1kkOQ5mQDWji88YqxzHo=';

// API endpoint to get publishers and publishing houses
app.get('/api/publishers', async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get all bandwidth data
app.get('/api/bandwidth/all', async (req, res) => {
  try {
    const response = await axios.post('https://metabase.quinpress.com/api/card/232/query/json', {}, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get bandwidth data for a specific publisher
app.get('/api/bandwidth/:publisherName', async (req, res) => {
  try {
    const response = await axios.post('https://metabase.quinpress.com/api/card/232/query/json', {}, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    // Filter data for the specific publisher
    const publisherData = response.data.filter(item => 
      item['Publisher Name'] === req.params.publisherName
    );
    
    res.json(publisherData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get Sage tokens data
app.get('/api/sage-tokens', async (req, res) => {
  try {
    const response = await axios.post('https://metabase.quinpress.com/api/card/233/query/json', {}, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 