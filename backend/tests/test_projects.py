import unittest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from google.api_core import exceptions

# Add the parent directory to the Python path to allow module imports
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from projects import get_projects_in_org

class TestRecursiveProjects(unittest.TestCase):

    def _create_mock_project(self, project_id, display_name, state='ACTIVE'):
        mock = MagicMock()
        mock.project_id = project_id
        mock.display_name = display_name
        mock.state.name = state
        return mock

    def _create_mock_folder(self, folder_id, display_name):
        mock = MagicMock()
        mock.name = f"folders/{folder_id}"
        mock.display_name = display_name
        return mock

    @patch('os.getenv', return_value='12345')
    @patch('projects.resourcemanager_v3.FoldersClient')
    @patch('projects.resourcemanager_v3.ProjectsClient')
    def test_recursive_project_search(self, MockProjectsClient, MockFoldersClient, mock_getenv):
        """Test that projects are found recursively and de-duplicated."""
        # Arrange: Mock clients
        mock_proj_client = MockProjectsClient.return_value
        mock_fld_client = MockFoldersClient.return_value

        # Mock data
        org_project = self._create_mock_project('org-proj-1', 'Org Project 1')
        folder1_project = self._create_mock_project('f1-proj-1', 'Folder 1 Project 1')
        subfolder_project = self._create_mock_project('sf-proj-1', 'Subfolder Project 1')

        folder1 = self._create_mock_folder('f1', 'Folder 1')
        subfolder = self._create_mock_folder('sf1', 'Subfolder 1')

        # Mock API responses
        def search_projects_side_effect(request):
            query = request.query
            if 'organizations/12345' in query:
                return [org_project]
            if 'folders/f1' in query:
                return [folder1_project]
            if 'folders/sf1' in query:
                return [subfolder_project]
            return []
        
        def list_folders_side_effect(request):
            parent = request.parent
            if 'organizations/12345' in parent:
                return [folder1]
            if 'folders/f1' in parent:
                return [subfolder]
            return []

        mock_proj_client.search_projects.side_effect = search_projects_side_effect
        mock_fld_client.list_folders.side_effect = list_folders_side_effect

        # Act
        result = get_projects_in_org()

        # Assert
        self.assertEqual(len(result), 3)
        project_ids = {p['project_id'] for p in result}
        self.assertIn('org-proj-1', project_ids)
        self.assertIn('f1-proj-1', project_ids)
        self.assertIn('sf-proj-1', project_ids)

    @patch('os.getenv', return_value='12345')
    @patch('projects.resourcemanager_v3.FoldersClient')
    @patch('projects.resourcemanager_v3.ProjectsClient')
    def test_permission_denied_on_folders(self, MockProjectsClient, MockFoldersClient, mock_getenv):
        """Test that a permission denied error on listing folders is handled."""
        # Arrange
        mock_fld_client = MockFoldersClient.return_value
        mock_fld_client.list_folders.side_effect = exceptions.PermissionDenied("Folder access denied")

        # Act & Assert
        with self.assertRaises(HTTPException) as context:
            get_projects_in_org()
        self.assertEqual(context.exception.status_code, 403)
        self.assertIn("Permission Denied", context.exception.detail)

    @patch('os.getenv', return_value=None)
    def test_env_var_not_set(self, mock_getenv):
        """Test that an exception is raised if ORGANIZATION_ID is not set."""
        with self.assertRaises(HTTPException) as context:
            get_projects_in_org()
        self.assertEqual(context.exception.status_code, 500)
        self.assertIn("ORGANIZATION_ID is not set", context.exception.detail)

if __name__ == '__main__':
    unittest.main()
