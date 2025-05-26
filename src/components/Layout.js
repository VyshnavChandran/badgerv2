import React, { useState, useCallback } from 'react';
import { AppBar, Toolbar, Typography, Box, Drawer, List, ListItem, ListItemIcon, ListItemText, InputBase, alpha, ListItemButton, IconButton, ThemeProvider, createTheme, Dialog, DialogTitle, DialogContent } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import GroupIcon from '@mui/icons-material/Group';
import SearchIcon from '@mui/icons-material/Search';
import ScienceIcon from '@mui/icons-material/Science';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { useLocation, useNavigate } from 'react-router-dom';
import PingPong from './PingPong';

const drawerWidth = 220;

const Layout = ({ children, search, setSearch }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [pingPongOpen, setPingPongOpen] = useState(false);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#232946',
      },
      background: {
        default: darkMode ? '#121212' : '#f4f6fa',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
  });

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const handlePingPongOpen = () => {
    setPingPongOpen(true);
  };

  const handlePingPongClose = () => {
    setPingPongOpen(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { 
              width: drawerWidth, 
              boxSizing: 'border-box', 
              bgcolor: 'primary.main',
              color: '#fff'
            },
          }}
        >
          <Toolbar />
          <List>
            <ListItem disablePadding>
              <ListItemButton 
                selected={location.pathname === '/'} 
                onClick={() => navigate('/')}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: alpha('#fff', 0.1),
                  },
                  '&:hover': {
                    bgcolor: alpha('#fff', 0.05),
                  },
                }}
              > 
                <ListItemIcon sx={{ color: '#fff' }}><StorageIcon /></ListItemIcon>
                <ListItemText primary="Bandwidth Tracker" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                selected={location.pathname === '/all-publishers'} 
                onClick={() => navigate('/all-publishers')}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: alpha('#fff', 0.1),
                  },
                  '&:hover': {
                    bgcolor: alpha('#fff', 0.05),
                  },
                }}
              >
                <ListItemIcon sx={{ color: '#fff' }}><GroupIcon /></ListItemIcon>
                <ListItemText primary="All Publishers" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                selected={location.pathname === '/sage'} 
                onClick={() => navigate('/sage')}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: alpha('#fff', 0.1),
                  },
                  '&:hover': {
                    bgcolor: alpha('#fff', 0.05),
                  },
                }}
              >
                <ListItemIcon sx={{ color: '#fff' }}><ScienceIcon /></ListItemIcon>
                <ListItemText primary="Sage" />
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>

        {/* Main content area */}
        <Box sx={{ flexGrow: 1 }}>
          {/* Header Bar */}
          <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'primary.main' }}>
            <Toolbar>
              <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 1 }}>
                Badger
              </Typography>
              {/* Ping Pong Button */}
              <IconButton 
                onClick={handlePingPongOpen} 
                color="inherit"
                sx={{ mr: 2 }}
              >
                <SportsEsportsIcon />
              </IconButton>
              {/* Dark Mode Toggle */}
              <IconButton 
                onClick={toggleDarkMode} 
                color="inherit"
                sx={{ mr: 2 }}
              >
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
              {/* Search Bar */}
              <Box sx={{ 
                position: 'relative', 
                borderRadius: 1, 
                bgcolor: alpha('#fff', 0.15), 
                '&:hover': { 
                  bgcolor: alpha('#fff', 0.25) 
                }, 
                ml: 2, 
                width: 300 
              }}>
                <Box sx={{ 
                  p: '0 12px', 
                  height: '100%', 
                  position: 'absolute', 
                  pointerEvents: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <SearchIcon sx={{ color: '#fff' }} />
                </Box>
                <InputBase
                  placeholder="Search publisher or website..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={{ color: '#fff', pl: 5, width: '100%' }}
                  inputProps={{ 'aria-label': 'search' }}
                />
              </Box>
            </Toolbar>
          </AppBar>
          <Toolbar />
          <Box sx={{ p: 3 }}>{children}</Box>
        </Box>

        {/* Ping Pong Modal */}
        <Dialog
          open={pingPongOpen}
          onClose={handlePingPongClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: '#fff' }}>
            Ping Pong Game
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <PingPong />
          </DialogContent>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default Layout; 