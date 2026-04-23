"""
Shared helper for resolving the set of project IDs a request is allowed to see.
"""

from typing import List, Optional

from tracer.models.project import Project


def get_accessible_project_ids(request) -> List[str]:
    """
    Return list of project IDs the request's user has access to.

    Scoped by organization (+ workspace if present on the request).
    Returns empty list if the user has no organization.
    """
    org = getattr(request, "organization", None) or getattr(
        request.user, "organization", None
    )
    if not org:
        return []

    qs = Project.objects.filter(organization_id=org.id)
    workspace = getattr(request, "workspace", None)
    if workspace is not None:
        qs = qs.filter(workspace_id=workspace.id)
    return [str(pid) for pid in qs.values_list("id", flat=True)]


def resolve_requested_project_ids(
    request, requested_project_id: Optional[str]
) -> Optional[List[str]]:
    """
    Given an optional `project_id` filter, return the effective list of project
    IDs to query, or None if the user is forbidden from the requested project.

    - If requested_project_id is None → return all accessible project IDs.
    - If requested_project_id is set and accessible → return [requested_project_id].
    - If requested_project_id is set but NOT accessible → return None (403).
    """
    accessible = get_accessible_project_ids(request)
    if requested_project_id is None:
        return accessible
    if str(requested_project_id) in accessible:
        return [str(requested_project_id)]
    return None
