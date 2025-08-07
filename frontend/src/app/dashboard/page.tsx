'use client';
import { useEffect, useState, ChangeEvent, ReactNode, useRef, MouseEvent, useMemo, useContext, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppBar, Box, Button, Card, CardContent, Chip, Container, List, ListItem, ListItemText, Toolbar, Typography, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, TextField, Popover, IconButton, Grid, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '@mui/material/styles';
import { ColorModeContext } from '../ColorModeContext';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';

// --- Data Structures ---
interface PreventativeControl {
  name: string;
  status: string;
  controlType: string;
  details: string;
}

interface OrgPolicy {
  name: string;
  status: string;
  details: string;
}

// --- Status Color Mapping ---
const statusColors: { [key: string]: 'success' | 'error' | 'warning' | 'default' } = {
  Enabled: 'success',
  Disabled: 'error',
  Placeholder: 'default',
};

// --- Reusable Components ---
function StatusChip({ status, displayMode = 'normal' }: { status: string; displayMode?: 'normal' | 'lowercase' }) {
  const color = statusColors[status] || 'default';
  const label = displayMode === 'lowercase' ? status.toLowerCase() : status;
  return <Chip label={label} color={color} size="small" />;
}

interface PerimeterControlsTableProps {
  controls: Control[];
  onStatusClick: (event: React.MouseEvent<HTMLElement>, details: string) => void;
}

function PerimeterControlsTable({ controls, onStatusClick }: PerimeterControlsTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filters, setFilters] = useState<{[key: string]: string}>({ name: '', status: '', controlType: '' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Control; direction: 'asc' | 'desc' } | null>(null);
  const [visibleFilter, setVisibleFilter] = useState<string | null>(null);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredControls = controls.filter(control => {
    const name = control.name || '';
    const status = control.status || '';
    const controlType = control.controlType || '';
    return (
      name.toLowerCase().includes(filters.name.toLowerCase()) &&
      status.toLowerCase().includes(filters.status.toLowerCase()) &&
      controlType.toLowerCase().includes(filters.controlType.toLowerCase())
    );
  });

  const sortedControls = useMemo(() => {
    let sortableItems = [...filteredControls];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredControls, sortConfig]);

  const requestSort = (key: keyof Control) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Control) => {
    if (!sortConfig || sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
  };

  const renderHeaderCell = (key: keyof Control, title: string) => (
    <TableCell>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {visibleFilter === key ? (
          <TextField
            name={key}
            label={`Filter by ${title}`}
            value={filters[key]}
            onChange={handleFilterChange}
            variant="standard"
            fullWidth
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <Typography variant="subtitle2" onClick={() => requestSort(key)} sx={{ cursor: 'pointer', flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              {title}
              {getSortIcon(key) || <ArrowUpwardIcon fontSize="small" sx={{ opacity: 0.3 }} />}
            </Typography>
            <IconButton onClick={() => setVisibleFilter(visibleFilter === key ? null : key)} size="small">
              <FilterListIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Box>
    </TableCell>
  );

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ p: 2 }}>
        Perimeter Controls
      </Typography>
      <TableContainer>
        <Table stickyHeader aria-label="perimeter controls table">
          <TableHead>
            <TableRow>
              {renderHeaderCell('name', 'Control Name')}
              {renderHeaderCell('controlType', 'Control Type')}
              {renderHeaderCell('status', 'Status')}
            </TableRow>
          </TableHead>
          <TableBody>
            {(rowsPerPage > 0
              ? sortedControls.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              : sortedControls
            ).map((control, index) => (
              <TableRow hover role="checkbox" tabIndex={-1} key={index}>
                <TableCell>{control.name}</TableCell>
                <TableCell>{control.controlType}</TableCell>
                <TableCell>
                  <Button onClick={(e) => onStatusClick(e, control.details)} sx={{ textTransform: 'none' }}>
                    <StatusChip status={control.status} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
        component="div"
        count={sortedControls.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}

interface AccordionSectionProps {
  title: string;
  children: ReactNode;
  incomplete: boolean;
  expanded: boolean;
  onChange: () => void;
}

function AccordionSection({ title, children, incomplete, expanded, onChange }: AccordionSectionProps) {
  return (
    <Accordion expanded={expanded} onChange={onChange} sx={{ border: 1, borderColor: 'divider' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h5">{title}</Typography>
        {incomplete && <Chip label="Incomplete" color="warning" size="small" sx={{ ml: 2 }} />}
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

function DetectiveControlsPlaceholder() {
  const [filters, setFilters] = useState({ name: '' });
  const [visibleFilter, setVisibleFilter] = useState<string | null>(null);

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ p: 2 }}>
        Detective Controls (Placeholder)
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
               <TableCell onClick={() => setVisibleFilter(visibleFilter === 'name' ? null : 'name')} sx={{ cursor: 'pointer' }}>
                {visibleFilter === 'name' ? (
                  <TextField
                    name="name"
                    label="Filter by name"
                    value={filters.name}
                    onChange={handleFilterChange}
                    variant="standard"
                    fullWidth
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  'Control Name'
                )}
              </TableCell>
              <TableCell align="right">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Placeholder Detective Control 1</TableCell>
              <TableCell align="right"><StatusChip status="Enabled" /></TableCell>
            </TableRow>
             <TableRow>
              <TableCell>Placeholder Detective Control 2</TableCell>
              <TableCell align="right"><StatusChip status="Disabled" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

// --- Main Page Component ---
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gcp-dashboard-backend-is66mkdbpa-uc.a.run.app';

import React, { Suspense } from 'react';

const DashboardPage = () => (
  <Suspense fallback={<div>Loading dashboard...</div>}>
    <Home />
  </Suspense>
);

export default DashboardPage;

function Home() {
  const searchParams = useSearchParams();
  const [allControls, setAllControls] = useState<Control[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<HTMLElement | null>(null);
  const [popoverContent, setPopoverContent] = useState<string>('');
  const [expandedPanel, setExpandedPanel] = useState<string | false>('perimeter');
  const [isExporting, setIsExporting] = useState(false);

  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const pageRef = useRef(null);
  const projectId = searchParams.get('project_id');

  const fetchData = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    setAllControls(null);
    try {
      console.log(`Fetching data for project: ${projectId}`);
      const response = await fetch(`${BACKEND_URL}/api/dashboard/${projectId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("1. Raw data from backend:", data);

      if (data.error) {
        throw new Error(data.detail || 'An error occurred on the backend.');
      }

      const controls: Control[] = [];

      // Preventative: Org Policies
      (data.org_policies || []).forEach((p: any) => {
        controls.push({
          name: p.name,
          status: p.status,
          controlType: 'Org Policy',
          details: p.details,
        });
      });

      // Preventative: VPC SC
      if (data.vpc_sc && data.vpc_sc[0]) {
        controls.push({
          name: data.vpc_sc[0].name,
          status: data.vpc_sc[0].status,
          controlType: 'VPC Service Control',
          details: data.vpc_sc[0].details,
        });
      }

      // Detective: SHA Modules and Custom Modules
      (data.sha_modules || []).forEach((m: any) => {
        controls.push({
          name: m.name,
          status: m.status,
          controlType: 'SHA Module',
          details: m.details,
        });
      });

      // Preventative: Firewall Rules
      (data.firewall || []).forEach((f: any) => {
        controls.push({
          name: f.name,
          status: f.status,
          controlType: 'Firewall Rule',
          details: f.details,
        });
      });

      // Detective: SCC Services
      (data.scc_services || []).forEach((s: any) => {
        controls.push({
          name: s.name,
          status: s.status,
          controlType: 'SCC Service',
          details: s.details,
        });
      });

      setAllControls(controls);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchData(projectId);
    }
    else {
      setLoading(false);
      setError("No project_id found in URL. Please add '?project_id=your-project-id' to the URL.");
    }
  }, [projectId, fetchData]);

  useEffect(() => {
    if (allControls && allControls.length > 0 && !summary && !summaryLoading && !summaryError) {
      const timer = setTimeout(() => {
        handleGenerateSummary();
      }, 0); // Run as a macrotask
      return () => clearTimeout(timer);
    }
  }, [allControls, summary, summaryLoading, summaryError]);

  const perimeterControls = useMemo(() => {
    if (!allControls) return [];
    const perimeterTypes = ['org policy', 'vpc service control', 'firewall rule'];
    return allControls.filter(c => c.controlType && perimeterTypes.includes(c.controlType.toLowerCase()));
  }, [allControls]);

  const detectiveControls = useMemo(() => {
    if (!allControls) return [];
    const detectiveTypes = ['sha module', 'scc service'];
    return allControls.filter(c => c.controlType && detectiveTypes.includes(c.controlType.toLowerCase()));
  }, [allControls]);

  const handleRefresh = () => {
    if (projectId) {
      fetchData(projectId);
    }
  };

  const handleGenerateSummary = async () => {
    if (!projectId || !allControls) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectId, data: allControls }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      const data = await response.json();
      setSummary(data.summary);
    } catch (e: any) {
      setSummaryError(e.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleStatusClick = (event: React.MouseEvent<HTMLElement>, details: string) => {
    setPopoverAnchorEl(event.currentTarget);
    setPopoverContent(details);
  };

  const handlePopoverClose = () => {
    setPopoverAnchorEl(null);
  };

  const handlePanelChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleExportPDF = async () => {
    if (!pageRef.current) return;
    setIsExporting(true);
    const originalExpandedState = expandedPanel;
    setExpandedPanel('perimeter'); // Expand all panels for export
    // You might need to expand all panels you want to capture

    setTimeout(async () => {
      try {
        const canvas = await html2canvas(pageRef.current!, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`gcp-security-controls-${projectId}.pdf`);
      } catch (error) {
        console.error('Error exporting PDF:', error);
        setError('Failed to export PDF.');
      } finally {
        setIsExporting(false);
        setExpandedPanel(originalExpandedState); // Restore original state
      }
    }, 500); // Delay to allow UI to re-render
  };

  const open = Boolean(popoverAnchorEl);
  const id = open ? 'details-popover' : undefined;
  const isPerimeterIncomplete = perimeterControls.some(c => c.status !== 'Enabled');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
            GCP Controls Dashboard
            {projectId && ` - ${projectId}`}
          </Typography>
          <IconButton onClick={handleRefresh} disabled={loading || isExporting} color="inherit">
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={handleExportPDF} disabled={isExporting} color="inherit">
            <PictureAsPdfIcon />
          </IconButton>
          <IconButton onClick={colorMode.toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }} ref={pageRef}>
        {loading && <Typography>Loading...</Typography>}
        {error && <Typography color="error">{error}</Typography>}

        {!loading && !error && allControls && (
          <>
            {summaryError && <Typography color="error">{summaryError}</Typography>}
            {summary && !summaryLoading && !summaryError && (
              <Accordion sx={{ mt: 2,  border: 1, borderColor: 'divider' }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="panel1a-content"
                  id="panel1a-header"
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <img src="/ai-logo.gif" alt="AI Logo" style={{ width: '28px', height: '28px' }} />
                    <Typography variant="h6">AI Summary</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <ReactMarkdown
                    components={{
                      h1: ({node, children, ...props}) => <Typography variant="h4" component="h1" gutterBottom>{children}</Typography>,
                      h2: ({node, children, ...props}) => <Typography variant="h5" component="h2" gutterBottom>{children}</Typography>,
                      h3: ({node, children, ...props}) => <Typography variant="h6" component="h3" gutterBottom>{children}</Typography>,
                      p: ({node, children, ...props}) => <Typography variant="body1" component="p" paragraph>{children}</Typography>,
                      li: ({node, children, ...props}) => <ListItem sx={{ display: 'list-item', ml: 4 }}><Typography variant="body1" component="span">{children}</Typography></ListItem>,
                    }}
                  >
                    {summary}
                  </ReactMarkdown>
                </AccordionDetails>
              </Accordion>
            )}

            <Box sx={{
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2, 
              ...(theme.palette.mode === 'dark' && { 
                backgroundColor: theme.palette.background.paper, 
                padding: 2, 
                borderRadius: 1 
              })
            }}>
              <AccordionSection 
                title="Perimeter Controls" 
                incomplete={false}
                expanded={expandedPanel === 'perimeter'}
                onChange={handlePanelChange('perimeter')}
              >
                <PerimeterControlsTable controls={perimeterControls} onStatusClick={handleStatusClick} />
              </AccordionSection>
              <AccordionSection 
                title="Detective Controls" 
                incomplete={false} /* Placeholder logic */
                expanded={expandedPanel === 'detective'}
                onChange={handlePanelChange('detective')}
              >
                <PerimeterControlsTable controls={detectiveControls} onStatusClick={handleStatusClick} />
              </AccordionSection>
              <AccordionSection 
                title="Identity Controls" 
                incomplete={false} /* Placeholder logic */
                expanded={expandedPanel === 'identity'}
                onChange={handlePanelChange('identity')}
              >
                <DetectiveControlsPlaceholder />
              </AccordionSection>
              <AccordionSection 
                title="Data Controls" 
                incomplete={false} /* Placeholder logic */
                expanded={expandedPanel === 'data'}
                onChange={handlePanelChange('data')}
              >
                <DetectiveControlsPlaceholder />
              </AccordionSection>
            </Box>
          </>
        )}
        <Popover
          id={id}
          open={open}
          anchorEl={popoverAnchorEl}
          onClose={handlePopoverClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
        >
          <Box sx={{ p: 2, maxWidth: '400px' }}>
            <Typography variant="h6" gutterBottom>Control Details</Typography>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {popoverContent}
            </pre>
          </Box>
        </Popover>
      </Container>
    </Box>
  );
}