# Bodhiwaves Growth OS — REST API & WebSocket Documentation

**Base URL:** `http://localhost:8000/api/v1`  
**Interactive Docs (Swagger UI):** `http://localhost:8000/docs`  
**ReDoc Reference:** `http://localhost:8000/redoc`

---

## 1. Authentication Endpoints (`/auth`)

### `POST /auth/login`
Authenticates a user with email and password.
- **Request Body:**
  ```json
  {
    "email": "superadmin@bodhiwaves.com",
    "password": "SuperAdmin@2026!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "k8Vz9q1P...",
    "token_type": "bearer",
    "user_id": 1,
    "email": "superadmin@bodhiwaves.com",
    "full_name": "Bodhiwaves Super Admin",
    "role": "super_admin",
    "avatar_initials": "SA"
  }
  ```
- **Error Response (401 Unauthorized / 423 Locked):**
  ```json
  {
    "detail": "Invalid email or password"
  }
  ```

### `POST /auth/refresh`
Rotates the refresh token and issues a new access token.
- **Request Body:**
  ```json
  {
    "refresh_token": "k8Vz9q1P..."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "w3Nm1p8L...",
    "token_type": "bearer",
    "user_id": 1,
    "email": "superadmin@bodhiwaves.com",
    "full_name": "Bodhiwaves Super Admin",
    "role": "super_admin",
    "avatar_initials": "SA"
  }
  ```

### `POST /auth/logout`
Revokes the refresh token and invalidates the session.
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body:**
  ```json
  {
    "refresh_token": "w3Nm1p8L..."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Successfully logged out",
    "data": true
  }
  ```

### `GET /auth/me`
Fetches authenticated user identity.
- **Headers:** `Authorization: Bearer <access_token>`
- **Success Response (200 OK):**
  ```json
  {
    "id": 1,
    "email": "superadmin@bodhiwaves.com",
    "full_name": "Bodhiwaves Super Admin",
    "role": "super_admin",
    "phone": null,
    "avatar_url": null,
    "avatar_initials": "SA",
    "is_active": true
  }
  ```

---

## 2. User Management Endpoints (`/users`)
*Requires Admin or Super Admin role.*

- `GET /users`: List users with pagination (`?page=1&size=20`), search (`?search=`), and role filter (`?role=`).
- `POST /users`: Create user account.
- `GET /users/{id}`: Retrieve single user.
- `PUT /users/{id}`: Update user profile, role, or password.
- `POST /users/{id}/toggle-status`: Activate or deactivate account.

---

## 3. Department Endpoints (`/departments`)
- `GET /departments`: List all active departments.
- `POST /departments`: Create a department (Admin only).
- `GET /departments/{id}`: Get single department.
- `PUT /departments/{id}`: Update department.

---

## 4. Employee & Workforce Tracking Endpoints (`/employees`)
- `GET /employees`: List employee profiles with department and live status.
- `POST /employees`: Create employee profile and badge code.
- `GET /employees/{id}`: Get single employee profile.
- `PUT /employees/{id}`: Update employee details.
- `POST /employees/{id}/live-status?status_value=working`: Update transparent live status (`online`, `working`, `break`, `away`, `offline`) and broadcast via WebSockets.

---

## 5. System Health (`/health`)
- `GET /health`: Returns status of API uptime, PostgreSQL connection, database version, and Meta WhatsApp integration mode.

---

## 6. Real-Time WebSockets
- **URL:** `ws://localhost:8000/ws`
- **Heartbeat:** Send `"ping"`, receive `"pong"`.
- **Event Dispatch Payload:**
  ```json
  {
    "event": "EMPLOYEE_STATUS_CHANGED",
    "employee_id": 1,
    "employee_code": "BW-EMP-001",
    "new_status": "working",
    "timestamp": "2026-11-01T14:30:00Z"
  }
  ```
