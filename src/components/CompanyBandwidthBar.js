import React, { useState, useMemo } from 'react';
import { Card, CardContent, Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const formatTB = (num) => num ? +(num / 1000000000000).toFixed(2) : 0;

const CompanyBandwidthBar = ({ bandwidthData }) => {
  const [expanded, setExpanded] = useState(false);

  // Aggregate all bandwidth types per month across all publishers
  const monthTotals = useMemo(() => {
    const monthMap = {};
    bandwidthData.forEach(item => {
      const ym = item['Date: Month'].slice(0, 7);
      const host = item['Sum of Host Bandwidth'] || 0;
      const image = item['Sum of Image Bandwidth'] || 0;
      const gumlet = item['Sum of Gum Let Bandwidth'] || 0;
      const fastly = item['Sum of Fast Ly Host Bandwidth'] || 0;
      if (!monthMap[ym]) monthMap[ym] = { host: 0, image: 0, gumlet: 0, fastly: 0 };
      monthMap[ym].host += host;
      monthMap[ym].image += image;
      monthMap[ym].gumlet += gumlet;
      monthMap[ym].fastly += fastly;
    });
    // Convert to sorted array of { month, hostTB, imageTB, gumletTB, fastlyTB, totalTB }
    return Object.entries(monthMap)
      .map(([ym, vals]) => {
        const hostTB = formatTB(vals.host);
        const imageTB = formatTB(vals.image);
        const gumletTB = formatTB(vals.gumlet);
        const fastlyTB = formatTB(vals.fastly);
        const totalTB = +(hostTB + imageTB + gumletTB + fastlyTB).toFixed(2);
        return { month: ym, hostTB, imageTB, gumletTB, fastlyTB, totalTB };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [bandwidthData]);

  const visibleMonths = expanded ? monthTotals : monthTotals.slice(-6);

  return (
    <Card sx={{ width: '100%', maxWidth: 1200, mx: 'auto', mt: 6, mb: 4, boxSizing: 'border-box' }}>
      <CardContent>
        <Typography variant="h5" component="div" gutterBottom sx={{ fontWeight: 600 }}>
          Company Total Bandwidth (All Publishers)
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button onClick={() => setExpanded(e => !e)} size="small" endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
            {expanded ? 'Show Less' : 'Show More'}
          </Button>
        </Box>
        <TableContainer sx={{ mt: 2, width: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell align="right">Host Bandwidth (TB)</TableCell>
                <TableCell align="right">Image Bandwidth (TB)</TableCell>
                <TableCell align="right">Gumlet Bandwidth (TB)</TableCell>
                <TableCell align="right">Fastly Bandwidth (TB)</TableCell>
                <TableCell align="right">Total Bandwidth (TB)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleMonths.map(row => (
                <TableRow key={row.month}>
                  <TableCell>{row.month}</TableCell>
                  <TableCell align="right">{row.hostTB}</TableCell>
                  <TableCell align="right">{row.imageTB}</TableCell>
                  <TableCell align="right">{row.gumletTB}</TableCell>
                  <TableCell align="right">{row.fastlyTB}</TableCell>
                  <TableCell align="right">{row.totalTB}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default CompanyBandwidthBar; 