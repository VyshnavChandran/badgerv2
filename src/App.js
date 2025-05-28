import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Bandwidth from './pages/Bandwidth';
import AllPublishers from './pages/AllPublishers';
import Sage from './pages/Sage';
import Login from './pages/Login';
import axios from 'axios';
import { Box, Typography, LinearProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Configure axios default base URL
axios.defaults.baseURL = 'http://localhost:3001';

// Add token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only remove token and reload if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

// Linear regression slope for y = a + bx
const getSlope = (yArr) => {
  const n = yArr.length;
  if (n < 2) return 0;
  const xArr = Array.from({ length: n }, (_, i) => i + 1);
  const xMean = xArr.reduce((a, b) => a + b, 0) / n;
  const yMean = yArr.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xArr[i] - xMean) * (yArr[i] - yMean);
    den += (xArr[i] - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
};

const LoadingScreen = ({ progress, status }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#232946',
        color: '#fff',
        zIndex: 9999,
      }}
    >
      <Box
        component="img"
        src="/badgerdance.gif"
        alt="Badger Dance"
        sx={{
          width: '200px',
          height: '200px',
          mb: 4,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
        Badger is vibing...
      </Typography>
      <Box sx={{ width: '300px', mb: 2 }}>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            height: 8, 
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.1)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#ff5722',
            }
          }} 
        />
      </Box>
      <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
        {Math.round(progress)}% Complete
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
        {status}
      </Typography>
    </Box>
  );
};

// Helper function to process bandwidth data
const processBandwidthData = (bandwidthData) => {
  const map = {};
  bandwidthData.forEach(item => {
    const name = item['Publisher Name'];
    if (!map[name]) map[name] = [];
    map[name].push(item);
  });
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, { data: v, loading: false }]));
};

// Helper function to format data for graphs
const formatGB = (num) => num ? +(num / 1000000000).toFixed(2) : 0;
const formatYearMonth = (yearMonth) => {
  const [year, month] = yearMonth.split('-');
  return new Date(`${year}-${month}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

// Pre-process graph data
const preprocessGraphData = (publishingHouses, bandwidthData) => {
  const processedData = new Map();
  const getYearMonth = (dateString) => dateString.slice(0, 7);

  // Group data by publisher
  const publisherDataMap = new Map();
  for (const item of bandwidthData) {
    const publisherName = item['Publisher Name'];
    if (!publisherDataMap.has(publisherName)) {
      publisherDataMap.set(publisherName, new Map());
    }
    const monthMap = publisherDataMap.get(publisherName);
    const ym = getYearMonth(item['Date: Month']);
    monthMap.set(ym, item);
  }

  // Process each publisher's data
  for (const [publisherName, monthMap] of publisherDataMap) {
    const allData = Array.from(monthMap.entries())
      .map(([ym, item]) => ({ ...item, _yearMonth: ym }))
      .sort((a, b) => b._yearMonth.localeCompare(a._yearMonth))
      .slice(0, 6)
      .reverse();

    const chartData = allData.map(row => {
      const host = row['Sum of Host Bandwidth'] || 0;
      const image = row['Sum of Image Bandwidth'] || 0;
      const gumlet = row['Sum of Gum Let Bandwidth'] || 0;
      const fastly = row['Sum of Fast Ly Host Bandwidth'] || 0;
      const total = host + image + gumlet + fastly;
      return {
        month: formatYearMonth(row._yearMonth),
        Host: formatGB(host),
        Image: formatGB(image),
        Gumlet: formatGB(gumlet),
        Fastly: formatGB(fastly),
        Total: formatGB(total),
        totalRaw: total,
      };
    });

    processedData.set(publisherName, {
      chartData,
      slope: getSlope(chartData.map(d => d.totalRaw))
    });
  }

  return processedData;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [publishingHouses, setPublishingHouses] = useState({});
  const [bandwidthData, setBandwidthData] = useState([]);
  const [bandwidthDataMap, setBandwidthDataMap] = useState({});
  const [processedGraphData, setProcessedGraphData] = useState(new Map());
  const [sageTokensData, setSageTokensData] = useState([]);
  const [loading, setLoading] = useState({ publishers: true, bandwidth: true, sage: true });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const navigate = useNavigate();

  // Fetch publishers
  const fetchPublishers = useCallback(async () => {
    try {
      setLoadingStatus('Fetching publishers...');
      const response = await axios.get('/api/publishers');
      if (response.data && response.data.data && Array.isArray(response.data.data.rows) && Array.isArray(response.data.data.cols)) {
        const cols = response.data.data.cols.map(col => col.name);
        const rows = response.data.data.rows;
        const publisherArray = rows.map(row =>
          Object.fromEntries(row.map((val, idx) => [cols[idx], val]))
        );
        
        console.log('Total publishers fetched:', publisherArray.length);
        
        const groupedPublishers = publisherArray.reduce((acc, publisher) => {
          const houseName = publisher['Publishing House__name'] || 'Uncategorized';
          if (!acc[houseName]) {
            acc[houseName] = [];
          }
          acc[houseName].push(publisher);
          return acc;
        }, {});
        
        console.log('Publishing houses:', Object.keys(groupedPublishers).length);
        Object.entries(groupedPublishers).forEach(([house, publishers]) => {
          console.log(`${house}: ${publishers.length} publishers`);
        });
        
        return groupedPublishers;
      }
      return {};
    } catch (error) {
      console.error('Error fetching publishers:', error);
      throw error;
    }
  }, []);

  // Fetch all bandwidth data once
  const fetchBandwidthData = useCallback(async (publishingHouses) => {
    try {
      setLoadingStatus('Fetching bandwidth data...');
      const response = await axios.get('/api/bandwidth/all');
      
      console.log('Total bandwidth records:', response.data.length);
      
      // Process bandwidth data
      const processedMap = processBandwidthData(response.data);
      
      // Pre-process graph data
      const graphData = preprocessGraphData(publishingHouses, response.data);
      
      console.log('Publishers with graph data:', graphData.size);
      
      // Ensure all publishers have graph data
      const allPublishers = Object.values(publishingHouses).flat();
      const missingPublishers = allPublishers.filter(publisher => !graphData.has(publisher.name));
      if (missingPublishers.length > 0) {
        console.log('Missing graph data for publishers:', missingPublishers.map(p => p.name));
      }

      return {
        bandwidthData: response.data,
        processedMap,
        graphData
      };
    } catch (error) {
      console.error('Error fetching bandwidth data:', error);
      throw error;
    }
  }, []);

  // Fetch all Sage tokens data once
  const fetchSageTokensData = useCallback(async () => {
    setLoading(l => ({ ...l, sage: true }));
    try {
      const response = await axios.get('/api/sage-tokens');
      setSageTokensData(response.data);
    } catch (error) {
      setSageTokensData([]);
    } finally {
      setLoading(l => ({ ...l, sage: false }));
    }
  }, []);

  // Check if user is already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    } else {
      setLoading({ publishers: false, bandwidth: false, sage: false });
      setIsFullyLoaded(true);
    }
  }, []);

  // Handle successful login
  const handleLogin = useCallback((success) => {
    if (success) {
      // Reset loading states before starting data fetch
      setLoading({ publishers: true, bandwidth: true, sage: true });
      setLoadingProgress(0);
      setLoadingStatus('Starting up...');
      setIsFullyLoaded(false);
      setIsAuthenticated(true);
      navigate('/bandwidth', { replace: true });
    }
  }, [navigate]);

  // Initialize app data when authenticated
  useEffect(() => {
    const initializeApp = async () => {
      if (!isAuthenticated) return;

      try {
        // First fetch all publishers
        const publishers = await fetchPublishers();
        setPublishingHouses(publishers);
        setLoadingProgress(30);
        setLoadingStatus('Publishers loaded, fetching bandwidth data...');
        
        // Then fetch and process all bandwidth data
        const { bandwidthData, processedMap, graphData } = await fetchBandwidthData(publishers);
        
        // Update all states at once
        setBandwidthData(bandwidthData);
        setBandwidthDataMap(processedMap);
        setProcessedGraphData(graphData);
        setLoadingProgress(60);
        setLoadingStatus('Fetching Sage tokens data...');
        
        // Fetch Sage tokens data
        await fetchSageTokensData();
        
        setLoadingProgress(100);
        setLoadingStatus('Finalizing...');
        
        // Small delay to ensure all state updates are processed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Only show the app when everything is ready
        setLoading({ publishers: false, bandwidth: false, sage: false });
        setIsFullyLoaded(true);
      } catch (error) {
        console.error('Error initializing app:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          navigate('/login', { replace: true });
        }
        setLoadingStatus('Error initializing app. Please refresh the page.');
      }
    };
    
    initializeApp();
  }, [isAuthenticated, navigate, fetchPublishers, fetchBandwidthData, fetchSageTokensData]);

  // For Bandwidth page: refresh per publisher
  const refreshBandwidthForPublisher = async (publisherName) => {
    setBandwidthDataMap(prev => ({
      ...prev,
      [publisherName]: { ...(prev[publisherName] || {}), loading: true }
    }));
    try {
      const response = await axios.get(`/api/bandwidth/${publisherName}`);
      const filtered = response.data;
      setBandwidthDataMap(prev => ({
        ...prev,
        [publisherName]: { data: filtered, loading: false }
      }));
    } catch (error) {
      setBandwidthDataMap(prev => ({
        ...prev,
        [publisherName]: { ...(prev[publisherName] || {}), loading: false, error: true }
      }));
      console.error('Error refreshing bandwidth data:', error);
    }
  };

  return (
    <>
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : !isFullyLoaded ? (
        <LoadingScreen progress={loadingProgress} status={loadingStatus} />
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/bandwidth" replace />} />
          <Route 
            path="/bandwidth" 
            element={
              <Bandwidth 
                publishingHouses={publishingHouses}
                bandwidthDataMap={bandwidthDataMap}
                fetchBandwidthData={refreshBandwidthForPublisher}
                loading={loading}
                bandwidthData={bandwidthData}
              />
            } 
          />
          <Route 
            path="/sage" 
            element={
              <Sage 
                publishingHouses={publishingHouses}
                sageTokensData={sageTokensData}
                loading={loading}
              />
            } 
          />
          <Route 
            path="/all-publishers" 
            element={
              <AllPublishers 
                publishingHouses={publishingHouses}
                bandwidthData={bandwidthData}
                processedGraphData={processedGraphData}
                loading={loading}
              />
            } 
          />
        </Routes>
      )}
    </>
  );
}

// Wrap App with BrowserRouter in the export
export default function AppWithRouter() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
} 