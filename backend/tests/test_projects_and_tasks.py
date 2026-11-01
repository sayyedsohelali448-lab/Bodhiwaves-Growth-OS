import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.anyio
async def test_projects_and_tasks_crud_workflow():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Login as Super Admin
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": "superadmin@bodhiwaves.com", "password": "SuperAdmin@2026!"}
        )
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. List projects initially (should be empty list)
        list_res = await client.get("/api/v1/projects", headers=headers)
        assert list_res.status_code == 200
        initial_projects = list_res.json()
        assert isinstance(initial_projects, list)

        # 3. Create a real Project in PostgreSQL
        project_payload = {
            "title": "Automated Test Growth Project",
            "description": "Commercial delivery test for Bodhiwaves Media",
            "budget": 75000.0,
            "deadline": "2026-12-31",
            "status": "in_progress",
            "progress_percent": 0
        }
        create_res = await client.post("/api/v1/projects", json=project_payload, headers=headers)
        assert create_res.status_code == 201
        created_project = create_res.json()
        project_id = created_project["id"]
        assert created_project["title"] == project_payload["title"]
        assert created_project["budget"] == 75000.0

        # 4. Fetch the Project by ID
        get_res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
        assert get_res.status_code == 200
        project_detail = get_res.json()
        assert project_detail["id"] == project_id

        # 5. Create a Task under the Project
        task_payload = {
            "title": "Design Brand Identity Kit",
            "description": "Deliver primary and secondary logo marks",
            "project_id": project_id,
            "priority": "high",
            "status": "in_progress",
            "deadline": "2026-11-15",
            "estimated_hours": 12.0,
            "actual_hours": 4.0,
            "progress_percent": 50,
            "manager_approval_status": "pending"
        }
        task_res = await client.post(
            f"/api/v1/projects/{project_id}/tasks",
            json=task_payload,
            headers=headers
        )
        assert task_res.status_code == 201
        created_task = task_res.json()
        task_id = created_task["id"]
        assert created_task["project_id"] == project_id
        assert created_task["title"] == task_payload["title"]

        # 6. Verify Project progress recalculated from tasks
        updated_project_res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
        assert updated_project_res.status_code == 200
        assert updated_project_res.json()["progress_percent"] == 50
        assert len(updated_project_res.json()["tasks"]) == 1

        # 7. Update Task status to completed via Manager approval
        approval_res = await client.put(
            f"/api/v1/tasks/{task_id}/approval?approval_status=approved",
            headers=headers
        )
        assert approval_res.status_code == 200
        approved_task = approval_res.json()
        assert approved_task["manager_approval_status"] == "approved"
        assert approved_task["status"] == "completed"
        assert approved_task["progress_percent"] == 100

        # 8. Clean up: Delete task and project
        del_task_res = await client.delete(f"/api/v1/tasks/{task_id}", headers=headers)
        assert del_task_res.status_code == 204

        del_res = await client.delete(f"/api/v1/projects/{project_id}", headers=headers)
        assert del_res.status_code == 204

        # 9. Verify Project is deleted
        get_deleted_res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
        assert get_deleted_res.status_code == 404
