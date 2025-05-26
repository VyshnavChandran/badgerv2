import React, { useState, useMemo, useCallback } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, Typography, Box, Grid, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const AllPublishers = ({ publishingHouses, bandwidthData, processedGraphData, loading }) => {
  const [search, setSearch] = useState('');
  const [trendFilter, setTrendFilter] = useState('all');

  // Memoize the filtered results
  const publisherGraphs = useMemo(() => {
    // Flatten and deduplicate publishers based on pid
    const allPublishers = Object.values(publishingHouses)
      .flat()
      .reduce((acc, publisher) => {
        if (!acc.some(p => p.pid === publisher.pid)) {
          acc.push(publisher);
        }
        return acc;
      }, []);

    let graphs = allPublishers.map(publisher => {
      const data = processedGraphData.get(publisher.name);
      return data ? { publisher, ...data } : null;
    }).filter(Boolean);

    if (search) {
      const searchLower = search.toLowerCase();
      graphs = graphs.filter(({ publisher }) => (
        publisher.name?.toLowerCase().includes(searchLower) ||
        publisher.domain_url?.toLowerCase().includes(searchLower)
      ));
    }

    if (trendFilter !== 'all') {
      graphs = graphs.filter(({ slope }) => {
        // Convert slope to percentage change per month
        const percentageChange = slope * 100;
        if (trendFilter === 'gainers') {
          return percentageChange > 5; // More than 5% growth per month
        } else {
          return percentageChange < -5; // More than 5% decline per month
        }
      });
    }

    return graphs;
  }, [publishingHouses, processedGraphData, search, trendFilter]);

  // Memoize the chart component
  const ChartComponent = useMemo(() => ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" fontSize={12} />
        <YAxis fontSize={12} width={60} />
        <Tooltip formatter={v => `${v} GB`} />
        <Line type="monotone" dataKey="Total" stroke="#ff5722" dot={false} strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  ), []);

  const handleTrendFilterChange = useCallback((_, v) => {
    setTrendFilter(v === null ? 'all' : v);
  }, []);

  return (
    <Layout search={search} setSearch={setSearch}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ToggleButtonGroup
          value={trendFilter || 'all'}
          exclusive
          onChange={handleTrendFilterChange}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="gainers">Gainers</ToggleButton>
          <ToggleButton value="losers">Losers</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {loading.publishers || loading.bandwidth ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Box sx={{ width: '100%', mt: 2 }}>
          <Grid container spacing={2}>
            {publisherGraphs.map(({ publisher, chartData }, index) => (
              <Grid item xs={12} sm={6} md={3} key={publisher.pid}>
                <Card sx={{ minWidth: 0, width: '100%', mb: 2, boxSizing: 'border-box', p: 0 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
                      {publisher.name}
                    </Typography>
                    <Box sx={{ width: '100%', height: 200 }}>
                      <ChartComponent data={chartData} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Layout>
  );
};

export default AllPublishers; 