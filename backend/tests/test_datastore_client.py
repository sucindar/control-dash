import unittest
from unittest.mock import patch, MagicMock
import os
import importlib

# Add the parent directory to the Python path to allow module imports
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class TestDatastoreClient(unittest.TestCase):

    def setUp(self):
        """Set a valid environment variable and reload the module before each test."""
        self.patcher = patch.dict(os.environ, {'DASHBOARD_GCP_PROJECT_ID': 'test-datastore-project'})
        self.patcher.start()
        global datastore_client
        import datastore_client
        importlib.reload(datastore_client)

    def tearDown(self):
        """Stop the patcher after each test to clean up the environment."""
        self.patcher.stop()

    @patch('datastore_client.datastore.Client')
    def test_get_datastore_client_with_env(self, MockDatastoreClient):
        """Test client is initialized with the project ID from the environment."""
        datastore_client.get_datastore_client()
        MockDatastoreClient.assert_called_once_with(project='test-datastore-project')

    @patch('datastore_client.get_datastore_client')
    def test_save_dashboard_data_success(self, mock_get_client):
        """Test that data is saved to Datastore correctly."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        result = datastore_client.save_dashboard_data('test-id', {'key': 'value'})
        self.assertTrue(result)
        mock_client.key.assert_called_once_with(datastore_client.DATASTORE_KIND, 'test-id')
        mock_client.put.assert_called_once()

    @patch('datastore_client.get_datastore_client')
    def test_get_dashboard_data_found(self, mock_get_client):
        """Test that data is retrieved from Datastore when it exists."""
        mock_client = MagicMock()
        mock_entity = {'key': 'value'}
        mock_client.get.return_value = mock_entity
        mock_get_client.return_value = mock_client
        result = datastore_client.get_dashboard_data('test-id')
        self.assertEqual(result, mock_entity)
        mock_client.key.assert_called_once_with(datastore_client.DATASTORE_KIND, 'test-id')

    @patch('datastore_client.get_datastore_client')
    def test_get_dashboard_data_not_found(self, mock_get_client):
        """Test that None is returned when no data is found in Datastore."""
        mock_client = MagicMock()
        mock_client.get.return_value = None
        mock_get_client.return_value = mock_client
        result = datastore_client.get_dashboard_data('test-id')
        self.assertIsNone(result)

    def test_datastore_project_id_not_set(self):
        """Test that a RuntimeError is raised if the environment variable is not set."""
        self.patcher.stop() # Stop the default patcher
        with patch.dict(os.environ, {'DASHBOARD_GCP_PROJECT_ID': ''}):
            with self.assertRaises(RuntimeError):
                import datastore_client
                importlib.reload(datastore_client)
        self.patcher.start() # Restart for subsequent tests

    @patch('datastore_client.get_datastore_client')
    def test_save_projects_data(self, mock_get_client):
        """Test that project hierarchy data is saved to Datastore correctly."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        org_id = '123456789012'
        projects_data = {'projects': [{'id': 'proj-1'}, {'id': 'proj-2'}]}

        result = datastore_client.save_projects_data(org_id, projects_data)

        self.assertTrue(result)
        mock_client.key.assert_called_once_with(datastore_client.PROJECTS_KIND, org_id)
        mock_client.put.assert_called_once()

if __name__ == '__main__':
    unittest.main()
