'use client';
import { useEffect, useState, ChangeEvent, ReactNode, useRef, MouseEvent, useMemo, useContext, useCallback } from 'react';
import { AppBar, Box, Button, Card, CardContent, Chip, Container, List, ListItem, ListItemText, Toolbar, Typography, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, TextField, Popover, IconButton, Grid, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '@mui/material/styles';
import { ColorModeContext } from './ColorModeContext';
import { LineChart } from '@mui/x-charts/LineChart';
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

interface PerimeterPreventativeControlsTableProps {
  controls: PreventativeControl[];
  onStatusClick: (event: MouseEvent<HTMLElement>, details: string) => void; // Callback to open popover
}

function PerimeterDetectiveControlsTable({ controls, onStatusClick }: PerimeterPreventativeControlsTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filters, setFilters] = useState({ name: '', status: '', controlType: '', details: '' });
  const [sortConfig, setSortConfig] = useState<{ key: keyof PreventativeControl; direction: 'asc' | 'desc' } | null>(null);
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

  const paginatedControls = sortedControls.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const requestSort = (key: keyof PreventativeControl) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof PreventativeControl) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpwardIcon fontSize="small" style={{ opacity: 0.3 }} />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
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
    <Paper sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ p: 2 }}>Detective Controls</Typography>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {renderHeaderCell('name', 'Control Name')}
              {renderHeaderCell('controlType', 'Control Type')}
              {renderHeaderCell('status', 'Status')}
            </TableRow>

          </TableHead>
          <TableBody>
            {paginatedControls.map((control, index) => (
              <TableRow key={index}>
                <TableCell>{control.name}</TableCell>
                <TableCell>{control.controlType}</TableCell>
                <TableCell onClick={(event) => onStatusClick(event, control.details)} style={{ cursor: 'pointer' }}>
                  <Chip
                    label={control.status}
                    color={statusColors[control.status] || 'default'}
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

function PerimeterPreventativeControlsTable({ controls, onStatusClick }: PerimeterPreventativeControlsTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filters, setFilters] = useState({ name: '', status: '', controlType: '', details: '' });
  const [visibleFilter, setVisibleFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof PreventativeControl; direction: 'asc' | 'desc' } | null>(null);

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

  const paginatedControls = sortedControls.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const requestSort = (key: keyof PreventativeControl) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof PreventativeControl) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpwardIcon fontSize="small" style={{ opacity: 0.3 }} />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />;
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
    <Paper sx={{ width: '100%', overflow: 'hidden', mt: 2 }}>

      <Typography variant="h6" sx={{ p: 2 }}>Preventative Controls</Typography>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="preventative controls table">
          <TableHead>
            <TableRow>
              {renderHeaderCell('name', 'Control Name')}
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
      sx={{ border: incomplete ? '2px solid red' : '2px solid green', '&:before': { display: 'none' } }} 
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

const RADIAN = Math.PI / 180;

function DashboardCharts({ preventativeControls, detectiveControls }: { preventativeControls: PreventativeControl[], detectiveControls: PreventativeControl[] }) {
  const generateChartData = (controls: PreventativeControl[]) => {
    return Object.entries(
      controls.reduce((acc, control) => {
        if (!acc[control.controlType]) {
          acc[control.controlType] = { Enabled: 0, Disabled: 0 };
        }
        if (control.status === 'Enabled') {
          acc[control.controlType].Enabled += 1;
        } else if (control.status === 'Disabled') {
          acc[control.controlType].Disabled += 1;
        }
        return acc;
      }, {} as Record<string, { Enabled: number; Disabled: number }>)
    ).map(([controlType, values]) => ({ controlType, ...values }));
  };

  const preventativeData = generateChartData(preventativeControls);
  const detectiveData = generateChartData(detectiveControls);

  const renderChart = (title: string, data: any[]) => {
    if (data.length === 0) return null;
    return (
      <Grid item xs={12} md={6}>
        <Typography variant="h6" align="center" gutterBottom>{title}</Typography>
        <LineChart
          dataset={data}
          xAxis={[{ scaleType: 'band', dataKey: 'controlType' }]}
          series={[
            { dataKey: 'Enabled', label: 'Enabled', color: '#4caf50' },
            { dataKey: 'Disabled', label: 'Disabled', color: '#f44336' },
          ]}
          width={500}
          height={300}
        />
      </Grid>
    );
  };

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Grid container spacing={4}>
          {renderChart('Preventative Controls', preventativeData)}
          {renderChart('Detective Controls', detectiveData)}
        </Grid>
      </CardContent>
    </Card>
  );
}

// --- Main Page Component ---
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gcp-dashboard-backend-is66mkdbpa-uc.a.run.app';

export default function Home() {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const [preventativeControls, setPreventativeControls] = useState<PreventativeControl[]>([]);
  const [detectiveControls, setDetectiveControls] = useState<PreventativeControl[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<{ project_id: string; display_name: string; }[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<HTMLElement | null>(null);
  const [popoverContent, setPopoverContent] = useState('');
  const [expandedPanel, setExpandedPanel] = useState<string | false>('perimeter');

  const isPerimeterIncomplete = preventativeControls.some(c => c.status !== 'Enabled');

  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [aiSummaryEnabled, setAiSummaryEnabled] = useState(false);

  const handlePanelChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  useEffect(() => {
    const fetchSummary = async (dataForSummary: any) => {
      setSummaryLoading(true);
      setSummaryError('');
      setSummary('');
      try {
        const response = await fetch(`${BACKEND_URL}/api/summarize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataForSummary),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to fetch summary');
        }
        const data = await response.json();
        setSummary(data.summary);
      } catch (error: any) {
        setSummaryError(error.message);
      } finally {
        setSummaryLoading(false);
      }
    };

    if (preventativeControls.length > 0 || detectiveControls.length > 0) {
      const dataForSummary = {
        preventative_controls: preventativeControls,
        detective_controls: detectiveControls,
      };
      fetchSummary(dataForSummary);
    }
  }, [preventativeControls, detectiveControls]);

  const handleStatusClick = (event: MouseEvent<HTMLElement>, details: string) => {
    setPopoverAnchorEl(event.currentTarget);
    setPopoverContent(details);
  };

  const handlePopoverClose = () => {
    setPopoverAnchorEl(null);
  };

  const open = Boolean(popoverAnchorEl);
  const id = open ? 'details-popover' : undefined;

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to load projects');
      }
      const data = await response.json();
      setProjects(data);
      setProjectsError(null);
    } catch (error: any) {
      setProjectsError(error.message);
      setProjects([]);
    }
    setProjectsLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/config`);
        if (!response.ok) {
          console.error('Failed to fetch config');
          return;
        }
        const config = await response.json();
        if (config.dashboard_gcp_project_id) {
          setProjectId(config.dashboard_gcp_project_id);
        }
        if (config.ai_summary_enabled !== undefined) {
          setAiSummaryEnabled(config.ai_summary_enabled);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
      }
    };
    fetchConfig();
  }, []);

  const handleRefreshClick = async () => {
    if (!projectId) {
      setError('Project ID is required to refresh data.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/refresh/${projectId}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to refresh data.');
      }
      // Optionally, you can show a success message here or refetch the dashboard data
      await handleFetchData(); // Refetch data to show the latest
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchData = async () => {
    if (!projectId) {
      setError('Please select a project ID.');
      return;
    }

    // Also refresh the project list from the cache
    fetchProjects();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/dashboard/${projectId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to view data. Please load it first.');
      }
      const data = await response.json();

      // Check for backend-specific error response
      if (data.error) {
        throw new Error(data.detail || 'An error occurred on the backend.');
      }

      const preventativeControls: PreventativeControl[] = [];
      const detectiveControls: PreventativeControl[] = [];

      // Preventative: Org Policies
      (data.org_policies || []).forEach((p: OrgPolicy) => {
        preventativeControls.push({
          name: p.name,
          status: p.status,
          controlType: 'Org Policy',
          details: p.details,
        });
      });

      // Preventative: VPC SC
      if (data.vpc_sc && data.vpc_sc[0]) {
        preventativeControls.push({
          name: data.vpc_sc[0].name,
          status: data.vpc_sc[0].status,
          controlType: 'VPC Service Control',
          details: data.vpc_sc[0].details,
        });
      }

      // Detective: SHA Modules and Custom Modules
      (data.sha_modules || []).forEach((m: any) => {
        detectiveControls.push({
          name: m.name,
          status: m.status,
          controlType: m.controlType, // 'SHA Module' or 'SHA Custom Module'
          details: m.details,
        });
      });

      // Preventative: VPC SC
      if (data.vpc_sc) {
        preventativeControls.push({
          name: data.vpc_sc.name,
          status: data.vpc_sc.status,
          controlType: 'VPC-SC',
          details: data.vpc_sc.details,
        });
      }

      // Preventative: Firewall Rules
      (data.firewall || []).forEach((f: any) => {
        preventativeControls.push({
          name: f.name,
          status: f.status,
          controlType: f.controlType,
          details: f.details,
        });
      });

      // Detective: SCC Services
      (data.scc_services || []).forEach((s: any) => {
        detectiveControls.push({
          name: s.name,
          status: s.status,
          controlType: s.controlType,
          details: s.details,
        });
      });

      setPreventativeControls(preventativeControls);
      setDetectiveControls(detectiveControls);

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
        pdf.save(`gcp-security-controls-${projectId}.pdf`);
      } catch (error) {
        console.error('Error exporting PDF:', error);
        setError('Failed to export PDF.');
      } finally {
        setIsExporting(false);
      }
    }, 500); // 500ms delay
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      minHeight: '100vh',
      bgcolor: 'background.default',
      color: 'text.primary'
    }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Private Isolated Controls
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl sx={{ mr: 2, minWidth: 240 }} size="small">
              <InputLabel id="project-select-label">Project</InputLabel>
              <Select
                labelId="project-select-label"
                id="project-select"
                value={projectId}
                label="Project"
                onChange={(e) => setProjectId(e.target.value)}
                disabled={projectsLoading || !!projectsError}
              >
                {projectsLoading && <MenuItem value=""><em>Loading projects...</em></MenuItem>}
                {projectsError && <MenuItem value=""><em>{projectsError}</em></MenuItem>}
                {projects.map((p) => (
                  <MenuItem key={p.project_id} value={p.project_id}>
                    {p.display_name} ({p.project_id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton onClick={handleFetchData} disabled={loading || isExporting} color="inherit">
              <VisibilityIcon />
            </IconButton>
            <IconButton onClick={handleRefreshClick} disabled={loading || isExporting} color="inherit">
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={handleExportPDF} disabled={isExporting} color="inherit">
              <PictureAsPdfIcon />
            </IconButton>
            <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
              {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Container ref={printRef} maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && <Typography color="error">Failed to load data: {error}</Typography>}
        {loading && <Typography>Loading...</Typography>}
        {!loading && !error && (preventativeControls.length > 0 || detectiveControls.length > 0) && (
          <>
            {aiSummaryEnabled && (
              <>
                {summaryLoading && <Typography sx={{ mt: 2, mb: 2 }}>Generating AI summary...</Typography>}
                {summaryError && <Typography color="error" sx={{ mt: 2, mb: 2 }}>Error: {summaryError}</Typography>}
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
                          h1: ({node, ...props}) => <Typography variant="h4" gutterBottom {...props} />,
                          h2: ({node, ...props}) => <Typography variant="h5" gutterBottom {...props} />,
                          h3: ({node, ...props}) => <Typography variant="h6" gutterBottom {...props} />,
                          p: ({node, ...props}) => <Typography variant="body1" paragraph {...props} />,
                          li: ({node, ...props}) => <ListItem sx={{ display: 'list-item', ml: 4 }}><Typography variant="body1" {...props} /></ListItem>,
                        }}
                      >
                        {summary}
                      </ReactMarkdown>
                    </AccordionDetails>
                  </Accordion>
                )}
              </>
            )}
            <DashboardCharts preventativeControls={preventativeControls} detectiveControls={detectiveControls} />
          </>
        )}
        {!loading && !error && (
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
              incomplete={isPerimeterIncomplete}
              expanded={expandedPanel === 'perimeter'}
              onChange={handlePanelChange('perimeter')}
            >
              <PerimeterPreventativeControlsTable 
                controls={preventativeControls} 
                onStatusClick={handleStatusClick} 
              />
              <PerimeterDetectiveControlsTable 
                controls={detectiveControls} 
                onStatusClick={handleStatusClick} 
              />

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
