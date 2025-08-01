'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppBar, Toolbar, Typography, IconButton, Box, Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Link } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Project {
  project_id: string;
  display_name: string;
  state: string;
  folder_name?: string;
  environment?: string;
}

const ProjectsContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const city = searchParams.get('city');
  const gcpRegion = searchParams.get('gcpRegion');

  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchProjects = useCallback(async () => {
    const url = `/api/projects`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectClick = (projectId: string) => {
    router.push(`/dashboard?project_id=${projectId}`);
  };

  const displayName = 'All Projects';

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Private Isolated Controls
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          {displayName ? `Projects in ${displayName}` : 'Projects'}
        </Typography>
        {loading && <p>Loading projects...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {!loading && !error && (
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell>Project Name</TableCell>
                  <TableCell>Project ID</TableCell>
                  <TableCell>Environment</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <TableRow
                      key={project.project_id}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell component="th" scope="row">
                        <Link component="button" variant="body2" onClick={() => handleProjectClick(project.project_id)}>
                          {project.display_name}
                        </Link>
                      </TableCell>
                      <TableCell>{project.project_id}</TableCell>
                      <TableCell>{project.environment || 'N/A'}</TableCell>
                      <TableCell>{project.state}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No projects found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Box>
  );
};

const ProjectsPage = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <ProjectsContent />
  </Suspense>
);

export default ProjectsPage;
