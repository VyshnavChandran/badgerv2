import React, { useState } from 'react';
import { Card, CardContent, Tabs, Tab, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

const formatNumber = (num) => {
  const value = Number(num);
  return isNaN(value) ? 0 : value.toLocaleString();
};

// Helper to format YYYY-MM as 'Month Year'
const formatYearMonth = (yearMonth) => {
  const [year, month] = yearMonth.split('-');
  return new Date(`${year}-${month}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const SageCard = ({ publishingHouse, publishers, months }) => {
  const publisherNames = Object.keys(publishers);
  const [selectedPublisher, setSelectedPublisher] = useState(0);
  const publisher = publisherNames[selectedPublisher];
  const publisherData = publishers[publisher];

  // Prepare chart data with validation
  const chartData = months.map(month => {
    const translation = Number(publisherData.translationTokens[month] || 0);
    const generation = Number(publisherData.generationTokens[month] || 0);
    const total = Number(publisherData.months[month] || 0);
    return {
      month: formatYearMonth(month),
      'Translation Tokens': isNaN(translation) ? 0 : translation,
      'Generation Tokens': isNaN(generation) ? 0 : generation,
      'Total Tokens': isNaN(total) ? 0 : total
    };
  });

  return (
    <Card sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mb: 4, boxSizing: 'border-box' }}>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom>
          {publishingHouse}
        </Typography>
        <Tabs value={selectedPublisher} onChange={(_, v) => setSelectedPublisher(v)}>
          {publisherNames.map((name, idx) => (
            <Tab key={name} label={name} />
          ))}
        </Tabs>
        <Box sx={{ width: '100%', height: 200, my: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={10} />
              <YAxis fontSize={10} width={70} />
              <Tooltip formatter={v => `${formatNumber(v)} tokens`} />
              <Legend verticalAlign="top" height={20} iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="Translation Tokens" stroke="#1976d2" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="Generation Tokens" stroke="#2e7d32" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="Total Tokens" stroke="#ed6c02" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell align="right">Translation Tokens</TableCell>
                <TableCell align="right">Generation Tokens</TableCell>
                <TableCell align="right">Total Tokens</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {months.map(month => (
                <TableRow key={month}>
                  <TableCell>{formatYearMonth(month)}</TableCell>
                  <TableCell align="right">{formatNumber(publisherData.translationTokens[month] || 0)}</TableCell>
                  <TableCell align="right">{formatNumber(publisherData.generationTokens[month] || 0)}</TableCell>
                  <TableCell align="right">{formatNumber(publisherData.months[month] || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default SageCard; 