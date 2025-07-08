'use client';
import { useEffect, useState, ChangeEvent, ReactNode, useRef, MouseEvent, useMemo } from 'react';
import { AppBar, Box, Button, Card, CardContent, Chip, Container, List, ListItem, ListItemText, Toolbar, Typography, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, TextField, Popover, IconButton, Grid } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
function StatusChip({ status }: { status: string }) {
  const color = statusColors[status] || 'default';
  return <Chip label={status} color={color} size="small" />;
}

interface PreventativeControlsTableProps {
  controls: PreventativeControl[];
  onStatusClick: (event: MouseEvent<HTMLElement>, details: string) => void; // Callback to open popover
}

function PreventativeControlsTable({ controls, onStatusClick }: PreventativeControlsTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filters, setFilters] = useState({ name: '', status: '', controlType: '', details: '' });
  const [visibleFilter, setVisibleFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof PreventativeControl; direction: 'ascending' | 'descending' } | null>(null);

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

  const filteredControls = controls.filter(control => 
    control.name.toLowerCase().includes(filters.name.toLowerCase()) &&
    control.status.toLowerCase().includes(filters.status.toLowerCase()) &&
    control.controlType.toLowerCase().includes(filters.controlType.toLowerCase()) &&
    control.details.toLowerCase().includes(filters.details.toLowerCase())
  );

  const sortedControls = useMemo(() => {
    let sortableItems = [...filteredControls];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredControls, sortConfig]);

  const paginatedControls = sortedControls.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const requestSort = (key: keyof PreventativeControl) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof PreventativeControl) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpwardIcon fontSize="small" style={{ opacity: 0.3 }} />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
  };

  const renderHeaderCell = (key: keyof PreventativeControl, title: string) => (
    <TableCell>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{title}</Typography>
        )}
        <IconButton size="small" onClick={() => requestSort(key)}>{getSortIcon(key)}</IconButton>
        <IconButton size="small" onClick={() => setVisibleFilter(visibleFilter === key ? null : key)}><FilterListIcon fontSize="small" /></IconButton>
      </Box>
    </TableCell>
  );

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader aria-label="preventative controls table">
          <TableHead>
            <TableRow>
              {renderHeaderCell('name', 'Preventative Control')}
              {renderHeaderCell('controlType', 'Control Type')}
              {renderHeaderCell('status', 'Status')}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedControls.map((row) => (
              <TableRow hover role="checkbox" tabIndex={-1} key={row.name}>
                <TableCell component="th" scope="row">
                  {row.name}
                </TableCell>
                <TableCell>{row.controlType}</TableCell>
                <TableCell onClick={(event) => onStatusClick(event, row.details)} style={{ cursor: 'pointer' }}>
                  <Chip
                    label={row.status}
                    color={statusColors[row.status] || 'default'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredControls.length}
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
    <Accordion 
      sx={{ border: `1px solid ${incomplete ? '#f44336' : 'green'}`, '&:before': { display: 'none' } }} 
      expanded={expanded}
      onChange={onChange}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

function DetectiveControlsPlaceholder() {
  // Adding filter state for consistency, though not fully implemented for placeholder
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
  )
}

// --- Chart Component ---
const CHART_COLORS = { 'Enabled': '#4caf50', 'Disabled': '#f44336', 'Error': '#ff9800' };

interface ChartData {
  name: string;
  value: number;
}

function DashboardCharts({ controls }: { controls: PreventativeControl[] }) {
  const pieChartData: ChartData[] = useMemo(() => {
    const counts = controls.reduce((acc, control) => {
      acc[control.status] = (acc[control.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [controls]);

  const barChartData: ChartData[] = useMemo(() => {
    const counts = controls.reduce((acc, control) => {
      acc[control.controlType] = (acc[control.controlType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [controls]);

  if (pieChartData.length === 0) return null;

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom align="center">Controls Overview</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.name as keyof typeof CHART_COLORS] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom align="center">Controls by Type</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#64b5f6" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

// --- Main Page Component ---
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gcp-dashboard-backend-is66mkdbpa-uc.a.run.app';

export default function Home() {
  const [preventativeControls, setPreventativeControls] = useState<PreventativeControl[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('evol-dev-456410');
  const [projectId, setProjectId] = useState('evol-dev-456410');
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<HTMLElement | null>(null);
  const [popoverContent, setPopoverContent] = useState('');
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);

  const isPerimeterIncomplete = preventativeControls.some(c => c.status !== 'Enabled');

  const handlePanelChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleStatusClick = (event: MouseEvent<HTMLElement>, details: string) => {
    setPopoverAnchorEl(event.currentTarget);
    setPopoverContent(details);
  };

  const handlePopoverClose = () => {
    setPopoverAnchorEl(null);
  };

  const open = Boolean(popoverAnchorEl);
  const id = open ? 'details-popover' : undefined;

  const handleLoadClick = async () => {
    if (!inputValue) {
      setError('Project ID is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/refresh/${inputValue}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to load data.');
      }
      // Optionally, you can show a success message here
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewClick = async () => {
    if (!inputValue) {
      setError('Project ID is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/dashboard/${inputValue}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to view data. Please load it first.');
      }
      const data = await response.json();

      const formattedOrgPolicies: PreventativeControl[] = data.org_policies.map((p: OrgPolicy) => ({
        name: p.name,
        status: p.status,
        controlType: 'Org Policy',
        details: p.details, // Use the new detailed field from the backend
      }));

      const vpcScControl: PreventativeControl = {
        name: data.vpc_sc_status.name,
        status: data.vpc_sc_status.status,
        controlType: 'VPC SC',
        details: data.vpc_sc_status.details, // Use the details field from the backend
      };

      const allPerimeterControls = [...formattedOrgPolicies, vpcScControl];
      setPreventativeControls(allPerimeterControls);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);

    // We need a small delay to allow the UI to update and expand all sections
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(printRef.current!, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`gcp-security-controls-${inputValue}.pdf`);
      } catch (error) {
        console.error('Error exporting PDF:', error);
        setError('Failed to export PDF.');
      } finally {
        setIsExporting(false);
      }
    }, 500); // 500ms delay
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Private Isolated Controls
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label="Project ID"
              variant="outlined"
              size="small"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              sx={{
                input: { color: 'white' },
                label: { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'white' },
                  '&:hover fieldset': { borderColor: 'white' },
                },
              }}
            />
            <Button variant="contained" onClick={handleViewClick} disabled={loading || isExporting}>
              View
            </Button>
            <Button variant="contained" color="primary" onClick={handleLoadClick} disabled={loading || isExporting}>
              {loading ? 'Loading...' : 'Load'}
            </Button>
            <Button variant="contained" onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export to PDF'}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Container ref={printRef} maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && <Typography color="error">Failed to load data: {error}</Typography>}
        {loading && <Typography>Loading...</Typography>}
        {!loading && !error && preventativeControls.length > 0 && (
          <DashboardCharts controls={preventativeControls} />
        )}
        {!loading && !error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <AccordionSection 
              title="Perimeter Controls" 
              incomplete={isPerimeterIncomplete}
              expanded={expandedPanel === 'perimeter'}
              onChange={handlePanelChange('perimeter')}
            >
              <PreventativeControlsTable 
                controls={preventativeControls} 
                onStatusClick={handleStatusClick} 
              />
              <DetectiveControlsPlaceholder />
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
