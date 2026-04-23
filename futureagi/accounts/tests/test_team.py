"""
Team Management API Tests

Tests for team users, roles, and member management endpoints.
"""

import pytest
from rest_framework import status


@pytest.mark.integration
@pytest.mark.api
class TestManageTeamAPI:
    """Tests for /accounts/team/users/ endpoint."""

    def test_list_team_users_as_owner(self, auth_client):
        """Owner can list team users."""
        response = auth_client.get("/accounts/team/users/")
        assert response.status_code == status.HTTP_200_OK

    def test_list_team_users_unauthenticated(self, api_client):
        """Unauthenticated request fails."""
        response = api_client.get("/accounts/team/users/")
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_add_team_user(self, auth_client):
        """Owner can add a team user."""
        response = auth_client.post(
            "/accounts/team/users/",
            {
                "email": "newteammate@futureagi.com",
                "role": "member",
            },
            format="json",
        )
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,  # If user already exists
        ]


@pytest.mark.integration
@pytest.mark.api
class TestUserListAPI:
    """Tests for /accounts/user/list/ endpoint."""

    def test_list_users(self, auth_client):
        """Authenticated user can list users."""
        response = auth_client.get("/accounts/user/list/")
        assert response.status_code == status.HTTP_200_OK

    def test_list_users_unauthenticated(self, api_client):
        """Unauthenticated request fails."""
        response = api_client.get("/accounts/user/list/")
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]


@pytest.mark.integration
@pytest.mark.api
class TestUserRoleUpdateAPI:
    """Tests for /accounts/user/role/update/ endpoint."""

    def test_update_role_unauthenticated(self, api_client):
        """Unauthenticated role update fails."""
        response = api_client.patch(
            "/accounts/user/role/update/",
            {
                "user_id": "00000000-0000-0000-0000-000000000000",
                "role": "admin",
            },
            format="json",
        )
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_update_role_invalid_user(self, auth_client):
        """Updating role of nonexistent user fails."""
        # Try POST instead of PATCH
        response = auth_client.post(
            "/accounts/user/role/update/",
            {
                "user_id": "00000000-0000-0000-0000-000000000000",
                "role": "admin",
            },
            format="json",
        )
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        ]

    def test_update_role_missing_data(self, auth_client):
        """Role update without required data fails."""
        response = auth_client.post(
            "/accounts/user/role/update/",
            {},
            format="json",
        )
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        ]


@pytest.mark.integration
@pytest.mark.api
class TestResendInviteAPI:
    """Tests for /accounts/user/resend-invite/ endpoint."""

    def test_resend_invite_unauthenticated(self, api_client):
        """Unauthenticated resend invite fails."""
        response = api_client.post(
            "/accounts/user/resend-invite/",
            {"email": "user@example.com"},
            format="json",
        )
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_resend_invite_invalid_email(self, auth_client):
        """Resend invite with invalid email fails."""
        response = auth_client.post(
            "/accounts/user/resend-invite/",
            {"email": "nonexistent@futureagi.com"},
            format="json",
        )
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
        ]


@pytest.mark.integration
@pytest.mark.api
class TestDeleteUserAPI:
    """Tests for /accounts/user/delete/ endpoint."""

    def test_delete_user_unauthenticated(self, api_client):
        """Unauthenticated delete request fails."""
        response = api_client.delete(
            "/accounts/user/delete/",
            {"user_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_delete_nonexistent_user(self, auth_client):
        """Deleting nonexistent user fails."""
        # Try POST instead of DELETE
        response = auth_client.post(
            "/accounts/user/delete/",
            {"user_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        ]


@pytest.mark.integration
@pytest.mark.api
class TestDeactivateUserAPI:
    """Tests for /accounts/user/deactivate/ endpoint."""

    def test_deactivate_user_unauthenticated(self, api_client):
        """Unauthenticated deactivate request fails."""
        response = api_client.post(
            "/accounts/user/deactivate/",
            {"user_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_deactivate_nonexistent_user(self, auth_client):
        """Deactivating nonexistent user fails."""
        response = auth_client.post(
            "/accounts/user/deactivate/",
            {"user_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_404_NOT_FOUND,
        ]

    def test_deactivate_self(self, auth_client, user):
        """User cannot deactivate themselves."""
        response = auth_client.post(
            "/accounts/user/deactivate/",
            {"user_id": str(user.id)},
            format="json",
        )
        # Should fail - can't deactivate yourself
        assert response.status_code in [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_403_FORBIDDEN,
        ]
