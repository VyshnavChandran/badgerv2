import React, { useState } from 'react';
import SageCard from '../components/SageCard';
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
  Checkbox
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';

const Sage = ({ publishingHouses, sageTokensData, loading }) => {
  const [search, setSearch] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState({});

  // Group by publishing house and publisher, then by month, using publishingHouses
  const grouped = React.useMemo(() => {
    const houseMap = {};
    
    // Find the latest date from the API data
    const latestDate = sageTokensData.reduce((latest, row) => {
      const date = row['Date']?.slice(0, 7);
      return date && (!latest || date > latest) ? date : latest;
    }, null);
    
    // Log the latest date for debugging
    console.log('Latest date from API:', latestDate);
    
    // Parse the latest date
    const [year, month] = latestDate.split('-').map(Number);
    console.log('Parsed year and month:', { year, month });
    
    const months = [];
    // Start from the latest month and go back 5 months
    for (let i = 0; i < 6; i++) {
      // Calculate the month and year for each iteration
      let currentMonth = month - i;
      let currentYear = year;
      
      // Handle month rollover
      if (currentMonth <= 0) {
        currentMonth += 12;
        currentYear -= 1;
      }
      
      // Format the month with leading zero if needed
      const monthStr = currentMonth.toString().padStart(2, '0');
      const dateStr = `${currentYear}-${monthStr}`;
      months.unshift(dateStr);
    }

    // Log the calculated months
    console.log('Calculated months:', months);

    // Build a map of publisher id to house and publisher info
    const pidToHouse = {};
    Object.entries(publishingHouses).forEach(([houseName, publishers]) => {
      publishers.forEach(pub => {
        pidToHouse[pub.pid] = { houseName, publisher: pub.name, domain: pub.domain_url };
      });
    });

    // Group Sage data by house and publisher
    for (const row of sageTokensData) {
      const pid = row['Publisher → Pid'] || row['Publisher ID'];
      const info = pidToHouse[pid];
      if (!info) {
        console.log('No publisher info found for pid:', pid);
        continue;
      }
      const { houseName, publisher, domain } = info;
      const date = row['Date']?.slice(0, 7);
      if (!date) {
        console.log('Invalid date in row:', row);
        continue;
      }

      // Debug log for date comparison
      console.log(`Processing date ${date} for ${publisher}:`, {
        isInMonths: months.includes(date),
        months,
        date
      });

      // Log when we skip a month
      if (!months.includes(date)) {
        console.log('Skipping month:', date, 'for publisher:', publisher);
        continue;
      }
      
      if (!houseMap[houseName]) houseMap[houseName] = {};
      if (!houseMap[houseName][publisher]) {
        houseMap[houseName][publisher] = { 
          domain, 
          months: {},
          translationTokens: {},
          generationTokens: {}
        };
      }
      
      // Initialize month data if not exists
      if (!houseMap[houseName][publisher].months[date]) {
        houseMap[houseName][publisher].months[date] = 0;
        houseMap[houseName][publisher].translationTokens[date] = 0;
        houseMap[houseName][publisher].generationTokens[date] = 0;
      }
      
      const tokens = Number(row['Sage Tokens']);
      if (isNaN(tokens)) {
        console.log('Invalid token value in row:', row);
        continue;
      }

      // Categorize tokens by type
      const serviceSlug = row['Service Slug']?.toLowerCase();
      if (serviceSlug === 'google_translation' || serviceSlug === 'azure_translation') {
        houseMap[houseName][publisher].translationTokens[date] += tokens;
      } else {
        houseMap[houseName][publisher].generationTokens[date] += tokens;
      }
      
      // Update total tokens
      houseMap[houseName][publisher].months[date] += tokens;
    }

    // Log processed data
    console.log('Processed house map:', houseMap);
    return { houseMap, months };
  }, [sageTokensData, publishingHouses]);

  // Initialize selected months when grouped data is available
  React.useEffect(() => {
    if (grouped.months) {
      const initialSelection = {};
      grouped.months.forEach(month => {
        initialSelection[month] = true;
      });
      setSelectedMonths(initialSelection);
    }
  }, [grouped.months]);

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

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedMonths).every(v => v);
    const newSelection = {};
    grouped.months.forEach(month => {
      newSelection[month] = !allSelected;
    });
    setSelectedMonths(newSelection);
  };

  // Function to export data to Excel
  const exportToExcel = () => {
    // Get selected months
    const monthsToExport = grouped.months.filter(month => selectedMonths[month]);
    
    if (monthsToExport.length === 0) {
      alert('Please select at least one month to export');
      return;
    }

    // Prepare data for export
    const exportData = [];
    
    Object.entries(grouped.houseMap).forEach(([houseName, publishers]) => {
      Object.entries(publishers).forEach(([publisherName, data]) => {
        // Add a row for each selected month
        monthsToExport.forEach(month => {
          const translationTokens = data.translationTokens[month] || 0;
          const generationTokens = data.generationTokens[month] || 0;
          const totalTokens = translationTokens + generationTokens;
          
          exportData.push({
            'Publishing House': houseName,
            'Publisher Name': publisherName,
            'Domain': data.domain,
            'Month': month,
            'Translation Tokens': translationTokens,
            'Generation Tokens': generationTokens,
            'Total Tokens': totalTokens
          });
        });

        // Add a summary row with totals for selected months
        const totalTranslationTokens = monthsToExport.reduce((sum, month) => 
          sum + (data.translationTokens[month] || 0), 0);
        const totalGenerationTokens = monthsToExport.reduce((sum, month) => 
          sum + (data.generationTokens[month] || 0), 0);
        const totalTokens = totalTranslationTokens + totalGenerationTokens;
        
        exportData.push({
          'Publishing House': houseName,
          'Publisher Name': publisherName,
          'Domain': data.domain,
          'Month': 'TOTAL',
          'Translation Tokens': totalTranslationTokens,
          'Generation Tokens': totalGenerationTokens,
          'Total Tokens': totalTokens
        });

        // Add an empty row for better readability
        exportData.push({});
      });
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Publishing House
      { wch: 30 }, // Publisher Name
      { wch: 30 }, // Domain
      { wch: 10 }, // Month
      { wch: 15 }, // Translation Tokens
      { wch: 15 }, // Generation Tokens
      { wch: 15 }  // Total Tokens
    ];
    ws['!cols'] = colWidths;

    // Create workbook and add the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sage Tokens Data');

    // Generate Excel file
    XLSX.writeFile(wb, 'sage_tokens_export.xlsx');
    handleExportDialogClose();
  };

  // Filter publishing houses and publishers based on search
  const filteredData = React.useMemo(() => {
    if (!search) return grouped.houseMap;

    const searchLower = search.toLowerCase();
    const filtered = {};

    Object.entries(grouped.houseMap).forEach(([houseName, publishers]) => {
      // Check if publishing house name matches
      if (houseName.toLowerCase().includes(searchLower)) {
        filtered[houseName] = publishers;
        return;
      }

      // Filter publishers within the house
      const filteredPublishers = {};
      Object.entries(publishers).forEach(([publisherName, data]) => {
        if (publisherName.toLowerCase().includes(searchLower)) {
          filteredPublishers[publisherName] = data;
        }
      });

      // Only include the house if it has matching publishers
      if (Object.keys(filteredPublishers).length > 0) {
        filtered[houseName] = filteredPublishers;
      }
    });

    return filtered;
  }, [grouped.houseMap, search]);

  return (
    <Layout search={search} setSearch={setSearch}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, px: 2 }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExportDialogOpen}
          disabled={loading.sage}
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
        <DialogTitle>Select Months to Export</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Object.values(selectedMonths).every(v => v)}
                  indeterminate={
                    Object.values(selectedMonths).some(v => v) && 
                    !Object.values(selectedMonths).every(v => v)
                  }
                  onChange={handleSelectAll}
                />
              }
              label="Select All Months"
            />
          </Box>
          <FormGroup>
            {grouped.months?.map(month => (
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

      {loading.sage ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        Object.entries(filteredData).map(([houseName, publishers]) => (
          <SageCard
            key={houseName}
            publishingHouse={houseName}
            publishers={publishers}
            months={grouped.months}
          />
        ))
      )}
    </Layout>
  );
};

export default Sage; 