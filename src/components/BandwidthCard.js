import React, { useState, useEffect } from 'react';
import { Card, CardContent, Tabs, Tab, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

const BandwidthCard = ({ publishingHouse, publishers, bandwidthDataMap, fetchBandwidthData, expanded, onExpandToggle, isModal = false }) => {
  const [selectedPublisher, setSelectedPublisher] = useState(0);
  const [localBandwidthData, setLocalBandwidthData] = useState([]);
  const [loading, setLoading] = useState(false);

  const publisherName = publishers[selectedPublisher]?.name;

  useEffect(() => {
    if (publisherName && !bandwidthDataMap[publisherName] && !isModal) {
      fetchBandwidthData(publisherName);
    }
    // eslint-disable-next-line
  }, [publisherName]);

  useEffect(() => {
    if (isModal && publisherName) {
      setLoading(true);
      axios.get(`/api/bandwidth/${publisherName}`)
        .then(response => {
          setLocalBandwidthData(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching bandwidth data:', error);
          setLoading(false);
        });
    }
  }, [isModal, publisherName]);

  const handlePublisherChange = (event, newValue) => {
    setSelectedPublisher(newValue);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  // Helper to extract YYYY-MM from date string
  const getYearMonth = (dateString) => dateString.slice(0, 7);

  // Helper to format YYYY-MM as 'Month Year'
  const formatYearMonth = (yearMonth) => {
    const [year, month] = yearMonth.split('-');
    return new Date(`${year}-${month}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // Helper to convert bytes to GB and format
  const formatGB = (num) => num ? +(num / 1000000000).toFixed(2) : 0;

  // Metrics to show
  const alwaysMetrics = [
    { key: 'Host', label: 'Host Bandwidth', color: '#1976d2', isGB: true },
    { key: 'Image', label: 'Image Bandwidth', color: '#388e3c', isGB: true },
    { key: 'Total', label: 'Total Bandwidth (GB)', color: '#ff5722', isGB: true },
  ];
  const moreMetrics = [
    { key: 'Gumlet', label: 'Gumlet Bandwidth', color: '#fbc02d', isGB: true },
    { key: 'Sketches', label: 'Sketches Requests', color: '#d32f2f', isGB: false },
    { key: 'IOAPI', label: 'IO API Requests', color: '#7b1fa2', isGB: false },
    { key: 'HAProxy', label: 'HA Proxy Requests', color: '#0288d1', isGB: false },
    { key: 'Fastly', label: 'Fastly Host Bandwidth', color: '#c2185b', isGB: true },
  ];
  const metrics = expanded ? [...alwaysMetrics, ...moreMetrics] : alwaysMetrics;

  // Custom tooltip formatter for chart
  const tooltipFormatter = (value, name, props) => {
    const metric = metrics.find(m => m.key === name);
    if (metric?.isGB) return formatGB(value);
    return formatNumber(value);
  };

  // Group by unique YYYY-MM
  const getPublisherData = () => {
    const data = isModal ? localBandwidthData : (bandwidthDataMap[publisherName]?.data || []);
    const monthMap = {};
    data.forEach(item => {
      if (item['Publisher Name'] === publisherName) {
        const ym = getYearMonth(item['Date: Month']);
        monthMap[ym] = item;
      }
    });
    const allData = Object.entries(monthMap)
      .map(([ym, item]) => ({ ...item, _yearMonth: ym }))
      .sort((a, b) => b._yearMonth.localeCompare(a._yearMonth));
    const result = (expanded ? allData.slice(0, 12) : allData.slice(0, 6)).reverse();
    return result;
  };

  const chartData = getPublisherData().map(row => {
    const host = row['Sum of Host Bandwidth'] || 0;
    const image = row['Sum of Image Bandwidth'] || 0;
    const gumlet = row['Sum of Gum Let Bandwidth'] || 0;
    const fastly = row['Sum of Fast Ly Host Bandwidth'] || 0;
    const total = host + image + gumlet + fastly;
    return {
      month: formatYearMonth(row._yearMonth),
      Host: host,
      Image: image,
      Gumlet: gumlet,
      Sketches: row['Sum of Sketches Request'],
      IOAPI: row['Sum of Quin Type Io Api Request'],
      HAProxy: row['Sum of Frontend Ha Proxy Request'],
      Fastly: fastly,
      Total: total,
    };
  });

  const handleRefresh = () => {
    if (isModal) {
      setLoading(true);
      axios.get(`/api/bandwidth/${publisherName}`)
        .then(response => {
          setLocalBandwidthData(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching bandwidth data:', error);
          setLoading(false);
        });
    } else {
      fetchBandwidthData(publisherName);
    }
  };

  const compactNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num;
  };

  return (
    <Card sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mb: 4, boxSizing: 'border-box', borderBottom: '2px solid #000' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5" component="div" gutterBottom>
            {publishingHouse}
          </Typography>
          <Box>
            <IconButton size="small" onClick={handleRefresh} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
            {!isModal && (
              <IconButton size="small" onClick={onExpandToggle}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            )}
          </Box>
        </Box>
        <Tabs value={selectedPublisher} onChange={handlePublisherChange}>
          {publishers.map((publisher, index) => (
            <Tab key={publisher.pid} label={publisher.name} />
          ))}
        </Tabs>
        <Box sx={{ width: '100%', height: 300, mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} width={60} />
              <Tooltip formatter={tooltipFormatter} />
              <Legend verticalAlign="top" height={20} />
              {metrics.map(metric => (
                <Line
                  key={metric.key}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                {metrics.map(metric => (
                  <TableCell key={metric.key} align="right">
                    {metric.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {chartData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.month}</TableCell>
                  {metrics.map(metric => (
                    <TableCell key={metric.key} align="right">
                      {metric.isGB ? formatGB(row[metric.key]) : formatNumber(row[metric.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default BandwidthCard; 