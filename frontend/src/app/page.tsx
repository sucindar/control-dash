'use client';
import { useEffect, useState, ChangeEvent, ReactNode, useRef } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  TextField
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Data Structures ---
interface PreventativeControl {
  name: string;
  status: string;
  controlType: string;
}

interface OrgPolicy {
  name: string;
  status: string;
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

function PreventativeControls({ controls }: { controls: PreventativeControl[] }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [filters, setFilters] = useState({ name: '', controlType: '' });
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
    control.controlType.toLowerCase().includes(filters.controlType.toLowerCase())
  );

  const paginatedControls = filteredControls.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader aria-label="preventative controls table">
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
                  'Preventative Control'
                )}
              </TableCell>
              <TableCell onClick={() => setVisibleFilter(visibleFilter === 'controlType' ? null : 'controlType')} sx={{ cursor: 'pointer' }}>
                {visibleFilter === 'controlType' ? (
                  <TextField
                    name="controlType"
                    label="Filter by type"
                    value={filters.controlType}
                    onChange={handleFilterChange}
                    variant="standard"
                    fullWidth
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  'Control Type'
                )}
              </TableCell>
              <TableCell align="right">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedControls.map((policy) => (
              <TableRow hover role="checkbox" tabIndex={-1} key={policy.name}>
                <TableCell component="th" scope="row">
                  {policy.name}
                </TableCell>
                <TableCell>{policy.controlType}</TableCell>
                <TableCell align="right">
                  <StatusChip status={policy.status} />
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

interface ControlSectionProps {
  title: string;
  children: ReactNode;
  borderColor: string;
  isExpanded?: boolean;
}

function ControlSection({ title, children, borderColor, isExpanded }: ControlSectionProps) {
  return (
    <Accordion sx={{ border: `2px solid ${borderColor}` }} expanded={isExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h5">{title}</Typography>
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



// --- Main Page Component ---
export default function Home() {
  const [preventativeControls, setPreventativeControls] = useState<PreventativeControl[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<string>('evol-dev-456410');
  const [inputValue, setInputValue] = useState<string>('evol-dev-456410');
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Determine the overall status for the border color
  const isPerimeterIncomplete = preventativeControls.some(
    (control) => control.status === 'Disabled' || control.status === 'Error'
  );

      useEffect(() => {
    const fetchControls = async () => {
      if (!projectId) return;
      try {
        setLoading(true);
        setError(null);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const response = await fetch(`${backendUrl}/api/effective-org-policies/${projectId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const orgPoliciesResult: OrgPolicy[] = await response.json();

        const vpcScResponse = await fetch(`${backendUrl}/api/vpc-sc-status/${projectId}`);
        if (!vpcScResponse.ok) {
          throw new Error(`HTTP error! status: ${vpcScResponse.status}`);
        }
        const vpcScResult: PreventativeControl = await vpcScResponse.json();

        const formattedOrgPolicies: PreventativeControl[] = orgPoliciesResult.map(p => ({
          name: p.name,
          status: p.status,
          controlType: 'Org Policy',
        }));
        
        const allControls: PreventativeControl[] = [
          ...formattedOrgPolicies,
          vpcScResult,
          { name: 'Hierarchical FW', status: 'Placeholder', controlType: 'Firewall' },
          { name: 'Control SPL2', status: 'Placeholder', controlType: 'SPL' },
          { name: 'Control SPL3', status: 'Placeholder', controlType: 'SPL' },
        ];

        setPreventativeControls(allControls);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchControls();
  }, [projectId]);

    const handleLoadClick = () => {
    setProjectId(inputValue);
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
            <Button variant="contained" onClick={handleLoadClick} disabled={loading || isExporting}>
              {loading ? 'Loading...' : 'Load'}
            </Button>
            <Button variant="contained" color="secondary" onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export to PDF'}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Container ref={printRef} maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && <Typography color="error">Failed to load data: {error}</Typography>}
        {loading && <Typography>Loading...</Typography>}
        {!loading && !error && (
           <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <ControlSection title="Perimeter Controls" isExpanded={isExporting || isPerimeterIncomplete} borderColor={isPerimeterIncomplete ? "#f44336" : 'green'}>
              <PreventativeControls controls={preventativeControls} />
              <DetectiveControlsPlaceholder />
            </ControlSection>

                        <ControlSection title="Identity Controls" isExpanded={isExporting} borderColor="grey">
              <Typography>Placeholder for Identity Controls</Typography>
            </ControlSection>

                        <ControlSection title="Data Controls" isExpanded={isExporting} borderColor="grey">
              <Typography>Placeholder for Data Controls</Typography>
            </ControlSection>
          </Box>
        )}
      </Container>
    </Box>
  );
}

