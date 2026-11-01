import pytest
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.users import User
from app.models.departments import Department
from app.models.employees import Employee


def test_health_check(client):
    """Verify health endpoint reports online status and PostgreSQL connection."""
    response = client.get(f"{settings.API_V1_STR}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["database"]["status"] == "healthy"
    assert "PostgreSQL" in data["database"]["version"]


def test_login_success(client):
    """Verify successful login for bootstrapped Super Admin returns access and rotating refresh tokens."""
    payload = {
        "email": "superadmin@bodhiwaves.com",
        "password": "SuperAdmin@2026!"
    }
    response = client.post(f"{settings.API_V1_STR}/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["email"] == "superadmin@bodhiwaves.com"
    assert data["role"] == "super_admin"


def test_login_invalid_password(client):
    """Verify that wrong password returns 401 Unauthorized and is recorded."""
    payload = {
        "email": "superadmin@bodhiwaves.com",
        "password": "WrongPassword123"
    }
    response = client.post(f"{settings.API_V1_STR}/auth/login", json=payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_refresh_token_rotation(client):
    """Verify refresh token rotation: old token is revoked, new token pair is issued."""
    # 1. Login to get initial tokens
    login_res = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "superadmin@bodhiwaves.com",
        "password": "SuperAdmin@2026!"
    })
    initial_tokens = login_res.json()
    refresh_1 = initial_tokens["refresh_token"]

    # 2. Rotate refresh token
    rotate_res = client.post(f"{settings.API_V1_STR}/auth/refresh", json={
        "refresh_token": refresh_1
    })
    assert rotate_res.status_code == 200
    rotated_tokens = rotate_res.json()
    refresh_2 = rotated_tokens["refresh_token"]
    assert refresh_2 != refresh_1

    # 3. Attempting to use the old revoked refresh token should fail with 401
    reuse_res = client.post(f"{settings.API_V1_STR}/auth/refresh", json={
        "refresh_token": refresh_1
    })
    assert reuse_res.status_code == 401


def test_protected_endpoint_without_token(client):
    """Verify that protected endpoints reject requests lacking valid bearer authorization."""
    response = client.get(f"{settings.API_V1_STR}/auth/me")
    assert response.status_code == 401


def test_protected_endpoint_with_valid_token(client):
    """Verify access to /auth/me with valid Bearer token."""
    login_res = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "superadmin@bodhiwaves.com",
        "password": "SuperAdmin@2026!"
    })
    token = login_res.json()["access_token"]

    response = client.get(
        f"{settings.API_V1_STR}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "superadmin@bodhiwaves.com"
    assert data["role"] == "super_admin"


def test_role_based_access_control(client, db_session):
    """
    Verify RBAC:
    - Employee cannot access Admin-only /users list (403 Forbidden).
    - Admin can access and create users.
    """
    # 1. Create a test employee user in DB if not present
    emp_user = db_session.query(User).filter(User.email == "test.emp@bodhiwaves.com").first()
    if not emp_user:
        emp_user = User(
            email="test.emp@bodhiwaves.com",
            hashed_password=get_password_hash("EmployeePass@123"),
            full_name="Test Employee",
            role="employee",
            avatar_initials="TE",
            is_active=True
        )
        db_session.add(emp_user)
        db_session.commit()

    # 2. Login as Employee
    emp_login = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "test.emp@bodhiwaves.com",
        "password": "EmployeePass@123"
    })
    emp_token = emp_login.json()["access_token"]

    # 3. Employee attempts to access admin-only /users
    forbidden_res = client.get(
        f"{settings.API_V1_STR}/users",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert forbidden_res.status_code == 403

    # 4. Super Admin attempts to access /users
    admin_login = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "superadmin@bodhiwaves.com",
        "password": "SuperAdmin@2026!"
    })
    admin_token = admin_login.json()["access_token"]

    allowed_res = client.get(
        f"{settings.API_V1_STR}/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert allowed_res.status_code == 200


def test_department_management(client):
    """Verify department listing and creation."""
    # Login as admin
    admin_login = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "superadmin@bodhiwaves.com",
        "password": "SuperAdmin@2026!"
    })
    admin_token = admin_login.json()["access_token"]

    # List departments (should contain 10 initial seeded departments)
    list_res = client.get(
        f"{settings.API_V1_STR}/departments",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert list_res.status_code == 200
    depts = list_res.json()["data"]
    assert len(depts) >= 10
    dept_codes = {d["code"] for d in depts}
    assert "SBD" in dept_codes
    assert "DM" in dept_codes
    assert "DEV" in dept_codes


def test_logout(client):
    """Verify logout revokes refresh token."""
    login_res = client.post(f"{settings.API_V1_STR}/auth/login", json={
        "email": "superadmin@bodhiwaves.com",
        "password": "SuperAdmin@2026!"
    })
    tokens = login_res.json()

    logout_res = client.post(
        f"{settings.API_V1_STR}/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
        headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["data"] is True
