import unittest
from unittest.mock import patch, MagicMock
from backend.firewall import get_denied_internet_ingress_rules

class TestFirewall(unittest.TestCase):

    @patch('backend.firewall.compute_v1.FirewallsClient')
    def test_get_denied_internet_ingress_rules(self, mock_firewalls_client):
        # Mock the firewalls client and its list method
        mock_client_instance = mock_firewalls_client.return_value
        
        # Create mock firewall rules
        rule1 = MagicMock()
        rule1.name = 'deny-all-internet'
        rule1.direction = 'INGRESS'
        rule1.denied = [MagicMock(I_p_protocol='all')]
        rule1.source_ranges = ['0.0.0.0/0']

        rule2 = MagicMock()
        rule2.name = 'allow-ssh'
        rule2.direction = 'INGRESS'
        rule2.allowed = [MagicMock(I_p_protocol='tcp', ports=['22'])]
        rule2.source_ranges = ['0.0.0.0/0']

        rule3 = MagicMock()
        rule3.name = 'deny-internal'
        rule3.direction = 'INGRESS'
        rule3.denied = [MagicMock(I_p_protocol='all')]
        rule3.source_ranges = ['10.0.0.0/8']

        mock_client_instance.list.return_value = [rule1, rule2, rule3]

        # Call the function
        project_id = 'test-project'
        denied_rules = get_denied_internet_ingress_rules(project_id)

        # Assertions
        self.assertIn('deny-all-internet', denied_rules)
        self.assertEqual(len(denied_rules), 1)
        mock_firewalls_client.assert_called_once()
        mock_client_instance.list.assert_called_once()

if __name__ == '__main__':
    unittest.main()
