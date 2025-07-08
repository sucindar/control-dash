import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from google.cloud import orgpolicy_v2

# List of organization policy constraints to check
EFFECTIVE_ORG_POLICIES_TO_CHECK = [
    "compute.managed.blockPreviewFeatures",
    "iam.managed.disableServiceAccountApiKeyCreation",
    "iam.managed.disableServiceAccountCreation",
    "iam.managed.disableServiceAccountKeyCreation",
    "iam.managed.disableServiceAccountKeyUpload",
    "pubsub.managed.disableSubscriptionMessageTransforms",
    "pubsub.managed.disableTopicMessageTransforms",
    "container.managed.disallowDefaultComputeServiceAccount",
    "iam.managed.preventPrivilegedBasicRolesForDefaultServiceAccounts",
    "container.managed.enableBinaryAuthorization",
    "container.managed.enableGoogleGroupsRBAC",
    "container.managed.enableNetworkPolicy",
    "container.managed.enablePrivateNodes",
    "container.managed.enableSecurityBulletinNotifications",
    "container.managed.enableSecretsEncryption",
    "container.managed.enableWorkloadIdentityFederation",
    "run.managed.requireInvokerIam",
    "container.managed.enableControlPlaneDNSOnlyAccess",
    "container.managed.disableRBACSystemBindings",
    "iam.managed.allowedPolicyMembers",
    "essentialcontacts.managed.allowedContactDomains",
    "compute.managed.restrictProtocolForwardingCreationForTypes",
    "custom.denytestautomation",
    "custom.iamDenySaKeyCreationAutomationSA1",
    "custom.kmsDisableAutoKeyCreation",
    "custom.iamDenySaKeyCreationtoAutomationSA",
    "iam.allowServiceAccountCredentialLifetimeExtension",
    "iam.workloadIdentityPoolAwsAccounts",
    "run.allowedBinaryAuthorizationPolicies",
    "cloudfunctions.restrictAllowedGenerations",
    "resourcemanager.allowedExportDestinations",
    "iam.workloadIdentityPoolProviders",
    "cloudfunctions.allowedIngressSettings",
    "run.allowedIngress",
    "cloudbuild.allowedIntegrations",
    "resourcemanager.allowedImportSources",
    "cloudscheduler.allowedTargetTypes",
    "compute.allowedVlanAttachmentEncryption",
    "cloudfunctions.allowedVpcConnectorEgressSettings",
    "run.allowedVPCEgress",
    "meshconfig.allowedVpcscModes",
    "cloudbuild.allowedWorkerPools",
    "storage.restrictAuthTypes",
    "storage.softDeletePolicySeconds",
    "compute.storageResourceUseRestrictions",
    "datastream.disablePublicConnectivity",
    "ainotebooks.accessMode",
    "vertexai.allowedGenAIModels",
    "vertexai.allowedModels",
    "compute.vmExternalIpAccess",
]

def _fetch_single_policy(org_policy_client, project_id, constraint):
    """Fetches a single effective organization policy and determines its status."""
    policy_name = f"projects/{project_id}/policies/{constraint}"
    try:
        logging.info(f"Fetching effective policy for: {constraint}")
        policy = org_policy_client.get_effective_policy(name=policy_name)
        status = "Disabled"

        # A policy is "Enabled" if its spec has at least one rule that is enforced.
        if policy.spec and policy.spec.rules:
            if any(rule.enforce for rule in policy.spec.rules):
                status = "Enabled"
                
        return {"name": constraint, "status": status, "details": str(policy)}
    except Exception as e:
        logging.error(f"Failed to fetch effective policy for {constraint}: {e}")
        return {"name": constraint, "status": "Error", "details": str(e)}

async def get_all_effective_policies(project_id: str):
    """
    Fetches all effective organization policies for a given project concurrently.
    """
    org_policy_client = orgpolicy_v2.OrgPolicyClient()
    
    loop = asyncio.get_running_loop()
    with ThreadPoolExecutor() as pool:
        tasks = [
            loop.run_in_executor(pool, _fetch_single_policy, org_policy_client, project_id, constraint)
            for constraint in EFFECTIVE_ORG_POLICIES_TO_CHECK
        ]
        results = await asyncio.gather(*tasks)
    
    return results