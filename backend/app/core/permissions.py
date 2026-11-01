import enum
from typing import List, Callable
from fastapi import HTTPException, status


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    DEPARTMENT_MANAGER = "department_manager"
    TEAM_LEADER = "team_leader"
    EMPLOYEE = "employee"
    CLIENT = "client"


# Hierarchy rank for permission cascading
ROLE_RANK = {
    UserRole.SUPER_ADMIN: 100,
    UserRole.ADMIN: 80,
    UserRole.DEPARTMENT_MANAGER: 60,
    UserRole.TEAM_LEADER: 40,
    UserRole.EMPLOYEE: 20,
    UserRole.CLIENT: 10,
}


def require_roles(allowed_roles: List[UserRole]) -> Callable:
    """Dependency factory checking that the authenticated user possesses one of the allowed roles."""
    def role_verifier(current_user):
        user_role = getattr(current_user, "role", None)
        if isinstance(user_role, enum.Enum):
            user_role = user_role.value
        allowed_str = [r.value for r in allowed_roles]
        if not user_role or user_role not in allowed_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires role in {allowed_str}"
            )
        return current_user
    return role_verifier


def require_min_role(min_role: UserRole) -> Callable:
    """Dependency factory ensuring user role is at least as high as min_role in the hierarchy."""
    def min_role_verifier(current_user):
        user_role = getattr(current_user, "role", None)
        if isinstance(user_role, enum.Enum):
            user_role = user_role.value
        user_rank = ROLE_RANK.get(UserRole(user_role), 0) if user_role in [r.value for r in UserRole] else 0
        min_rank = ROLE_RANK[min_role]
        if user_rank < min_rank:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Minimum role required is {min_role.value}"
            )
        return current_user
    return min_role_verifier
