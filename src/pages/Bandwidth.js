import React, { useState, useRef, useCallback, useMemo } from 'react';
import BandwidthCard from '../components/BandwidthCard';
import CompanyBandwidthBar from '../components/CompanyBandwidthBar';
import Layout from '../components/Layout';
import { 
  Box, 
  CircularProgress, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Divider
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { VariableSizeList as List } from 'react-window';

const DEFAULT_CARD_HEIGHT = 700;
const EXPANDED_CARD_HEIGHT = 1100; // Set expanded height to 1100

const BANDWIDTH_TYPES = {
  'Host': 'Sum of Host Bandwidth',
  'Image': 'Sum of Image Bandwidth',
  'Gumlet': 'Sum of Gum Let Bandwidth',
  'Fastly': 'Sum of Fast Ly Host Bandwidth',
  'Sketches': 'Sum of Sketches Requests',
  'IO API': 'Sum of IO API Requests',
  'HA Proxy': 'Sum of HA Proxy Requests'
};

const Bandwidth = ({ 
  publishingHouses = {}, 
  bandwidthDataMap = {}, 
  fetchBandwidthData = () => {}, 
  loading = { publishers: true, bandwidth: true }, 
  bandwidthData = [] 
}) => {
  const [search, setSearch] = useState('');
  // Track expanded state for each houseName
  const [expandedMap, setExpandedMap] = useState({});
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState({});
  const [selectedTypes, setSelectedTypes] = useState({});
  const listRef = useRef();

  // Get unique months from bandwidth data
  const availableMonths = useMemo(() => {
    if (!Array.isArray(bandwidthData)) return [];
    const months = new Set();
    bandwidthData.forEach(item => {
      const month = item['Date: Month']?.slice(0, 7);
      if (month) months.add(month);
    });
    return Array.from(months).sort();
  }, [bandwidthData]);

  // Initialize selections
  React.useEffect(() => {
    if (availableMonths.length > 0) {
      const initialMonthSelection = {};
      availableMonths.forEach(month => {
        initialMonthSelection[month] = true;
      });
      setSelectedMonths(initialMonthSelection);

      const initialTypeSelection = {};
      Object.keys(BANDWIDTH_TYPES).forEach(type => {
        initialTypeSelection[type] = true;
      });
      setSelectedTypes(initialTypeSelection);
    }
  }, [availableMonths]);

  const handleExportDialogOpen = () => {
    setExportDialogOpen(true);
  };

  const handleExportDialogClose = () => {
    setExportDialogOpen(false);
  };

  const handleMonthToggle = (month) => {
    setSelectedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  const handleTypeToggle = (type) => {
    setSelectedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleSelectAllMonths = () => {
    const allSelected = Object.values(selectedMonths).every(v => v);
    const newSelection = {};
    availableMonths.forEach(month => {
      newSelection[month] = !allSelected;
    });
    setSelectedMonths(newSelection);
  };

  const handleSelectAllTypes = () => {
    const allSelected = Object.values(selectedTypes).every(v => v);
    const newSelection = {};
    Object.keys(BANDWIDTH_TYPES).forEach(type => {
      newSelection[type] = !allSelected;
    });
    setSelectedTypes(newSelection);
  };

  // Function to export data to Excel
  const exportToExcel = () => {
    const monthsToExport = availableMonths.filter(month => selectedMonths[month]);
    const typesToExport = Object.keys(BANDWIDTH_TYPES).filter(type => selectedTypes[type]);
    
    if (monthsToExport.length === 0) {
      alert('Please select at least one month to export');
      return;
    }

    if (typesToExport.length === 0) {
      alert('Please select at least one bandwidth type to export');
      return;
    }

    // Prepare data for export
    const exportData = [];
    
    Object.entries(publishingHouses).forEach(([houseName, publishers]) => {
      publishers.forEach(publisher => {
        const publisherData = bandwidthData.filter(item => 
          item['Publisher Name'] === publisher.name &&
          monthsToExport.includes(item['Date: Month']?.slice(0, 7))
        );

        // Add a row for each month
        monthsToExport.forEach(month => {
          const monthData = publisherData.find(item => item['Date: Month']?.slice(0, 7) === month);
          const row = {
            'Publishing House': houseName,
            'Publisher Name': publisher.name,
            'Domain': publisher.domain_url,
            'Month': new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          };

          // Add selected bandwidth types
          typesToExport.forEach(type => {
            const value = monthData ? Number(monthData[BANDWIDTH_TYPES[type]]) || 0 : 0;
            row[type] = (value / 1000000000).toFixed(2); // Convert to GB using base-10
          });

          // Add total if multiple types are selected
          if (typesToExport.length > 1) {
            const total = typesToExport.reduce((sum, type) => {
              const value = monthData ? Number(monthData[BANDWIDTH_TYPES[type]]) || 0 : 0;
              return sum + value;
            }, 0);
            row['Total'] = (total / 1000000000).toFixed(2);
          }

          exportData.push(row);
        });

        // Add a summary row with totals
        const totals = {};
        typesToExport.forEach(type => {
          totals[type] = publisherData.reduce((sum, item) => 
            sum + (Number(item[BANDWIDTH_TYPES[type]]) || 0), 0);
        });

        const summaryRow = {
          'Publishing House': houseName,
          'Publisher Name': publisher.name,
          'Domain': publisher.domain_url,
          'Month': 'TOTAL'
        };

        typesToExport.forEach(type => {
          summaryRow[type] = (totals[type] / 1000000000).toFixed(2);
        });

        if (typesToExport.length > 1) {
          const total = typesToExport.reduce((sum, type) => sum + totals[type], 0);
          summaryRow['Total'] = (total / 1000000000).toFixed(2);
        }

        exportData.push(summaryRow);
        exportData.push({}); // Empty row for readability
      });
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Publishing House
      { wch: 30 }, // Publisher Name
      { wch: 30 }, // Domain
      { wch: 15 }, // Month
    ];
    typesToExport.forEach(() => colWidths.push({ wch: 15 })); // Bandwidth type columns
    if (typesToExport.length > 1) colWidths.push({ wch: 15 }); // Total column
    ws['!cols'] = colWidths;

    // Create workbook and add the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bandwidth Data');

    // Generate Excel file
    XLSX.writeFile(wb, 'bandwidth_export.xlsx');
    handleExportDialogClose();
  };

  // Filter logic
  const filteredHouses = Object.entries(publishingHouses).reduce((acc, [houseName, publishers]) => {
    const filteredPublishers = publishers.filter(pub => {
      const searchLower = search.toLowerCase();
      return (
        pub.name?.toLowerCase().includes(searchLower) ||
        pub.domain_url?.toLowerCase().includes(searchLower)
      );
    });
    if (filteredPublishers.length > 0) {
      acc[houseName] = filteredPublishers;
    }
    return acc;
  }, {});

  const houseEntries = Object.entries(filteredHouses);

  // Handler to toggle expanded state for a card
  const handleExpandToggle = useCallback((houseName, index) => {
    setExpandedMap(prev => {
      const newMap = { ...prev, [houseName]: !prev[houseName] };
      // After state update, reset the size for this index
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.resetAfterIndex(index);
        }
      }, 0);
      return newMap;
    });
  }, []);

  // Function to get the height for each card
  const getItemSize = index => {
    const [houseName] = houseEntries[index];
    return expandedMap[houseName] ? EXPANDED_CARD_HEIGHT : DEFAULT_CARD_HEIGHT;
  };

  return (
    <Layout search={search} setSearch={setSearch}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, px: 2 }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExportDialogOpen}
          disabled={loading.publishers || loading.bandwidth}
          sx={{
            backgroundColor: '#ff5722',
            '&:hover': {
              backgroundColor: '#e64a19',
            },
          }}
        >
          Export to Excel
        </Button>
      </Box>

      <Dialog 
        open={exportDialogOpen} 
        onClose={handleExportDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Export Options</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Months</Typography>
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Object.values(selectedMonths).every(v => v)}
                  indeterminate={
                    Object.values(selectedMonths).some(v => v) && 
                    !Object.values(selectedMonths).every(v => v)
                  }
                  onChange={handleSelectAllMonths}
                />
              }
              label="Select All Months"
            />
          </Box>
          <FormGroup>
            {availableMonths.map(month => (
              <FormControlLabel
                key={month}
                control={
                  <Checkbox
                    checked={selectedMonths[month] || false}
                    onChange={() => handleMonthToggle(month)}
                  />
                }
                label={new Date(month + '-01').toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              />
            ))}
          </FormGroup>

          <Divider sx={{ my: 3 }} />

          <Typography variant="subtitle1" sx={{ mb: 1 }}>Bandwidth Types</Typography>
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Object.values(selectedTypes).every(v => v)}
                  indeterminate={
                    Object.values(selectedTypes).some(v => v) && 
                    !Object.values(selectedTypes).every(v => v)
                  }
                  onChange={handleSelectAllTypes}
                />
              }
              label="Select All Types"
            />
          </Box>
          <FormGroup>
            {Object.keys(BANDWIDTH_TYPES).map(type => (
              <FormControlLabel
                key={type}
                control={
                  <Checkbox
                    checked={selectedTypes[type] || false}
                    onChange={() => handleTypeToggle(type)}
                  />
                }
                label={type}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExportDialogClose}>Cancel</Button>
          <Button 
            onClick={exportToExcel}
            variant="contained"
            sx={{
              backgroundColor: '#ff5722',
              '&:hover': {
                backgroundColor: '#e64a19',
              },
            }}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>

      <CompanyBandwidthBar bandwidthData={bandwidthData} />
      {loading.publishers || loading.bandwidth ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      ) : houseEntries.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>
          No publishers found.
        </div>
      ) : (
        <List
          ref={listRef}
          height={window.innerHeight - 200}
          itemCount={houseEntries.length}
          itemSize={getItemSize}
          width={"100%"}
          style={{ maxWidth: 1200, margin: '0 auto' }}
        >
          {({ index, style }) => {
            const [houseName, publishers] = houseEntries[index];
            return (
              <div style={style}>
                <BandwidthCard
                  key={houseName}
                  publishingHouse={houseName}
                  publishers={publishers}
                  bandwidthDataMap={bandwidthDataMap}
                  fetchBandwidthData={fetchBandwidthData}
                  expanded={!!expandedMap[houseName]}
                  onExpandToggle={() => handleExpandToggle(houseName, index)}
                />
              </div>
            );
          }}
        </List>
      )}
    </Layout>
  );
};

export default Bandwidth; 