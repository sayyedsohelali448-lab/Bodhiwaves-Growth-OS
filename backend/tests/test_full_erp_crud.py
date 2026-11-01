import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.anyio
async def test_full_erp_modules_crud_workflow():
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

        # ==========================================
        # 2. Clients Module CRUD Test
        # ==========================================
        client_payload = {
            "business_name": "Acme Global Dynamics Ltd",
            "industry": "Enterprise Tech",
            "contact_person": "Arthur Pendelton",
            "email": "arthur@acmeglobal.com",
            "phone": "+91 99887 76655",
            "address": "Tech Park Tower A, Bangalore",
            "status": "active"
        }
        create_client_res = await client.post("/api/v1/clients", json=client_payload, headers=headers)
        assert create_client_res.status_code == 201
        created_client = create_client_res.json()
        client_id = created_client["id"]
        assert created_client["business_name"] == client_payload["business_name"]

        # Fetch client
        get_client_res = await client.get(f"/api/v1/clients/{client_id}", headers=headers)
        assert get_client_res.status_code == 200
        assert get_client_res.json()["contact_person"] == "Arthur Pendelton"

        # Update client
        update_client_res = await client.put(
            f"/api/v1/clients/{client_id}",
            json={"status": "onboarding"},
            headers=headers
        )
        assert update_client_res.status_code == 200
        assert update_client_res.json()["status"] == "onboarding"

        # ==========================================
        # 3. CRM & Sales Module Test
        # ==========================================
        lead_payload = {
            "company_name": "Horizon Retail Ventures",
            "contact_person": "Elena Vance",
            "email": "elena@horizonretail.com",
            "phone": "+91 91234 56789",
            "industry": "Retail & Fashion",
            "source": "website",
            "stage": "new",
            "estimated_value": 120000.0,
            "notes": "Interested in full agency brand package"
        }
        create_lead_res = await client.post("/api/v1/crm/leads", json=lead_payload, headers=headers)
        assert create_lead_res.status_code == 201
        created_lead = create_lead_res.json()
        lead_id = created_lead["id"]
        assert created_lead["estimated_value"] == 120000.0

        # Progress stage
        stage_res = await client.put(
            f"/api/v1/crm/leads/{lead_id}/stage",
            json={"stage": "qualified", "notes": "Budget confirmed via discovery call"},
            headers=headers
        )
        assert stage_res.status_code == 200
        assert stage_res.json()["stage"] == "qualified"

        # Add activity
        act_res = await client.post(
            f"/api/v1/crm/leads/{lead_id}/activities",
            json={"activity_type": "call", "description": "30-min discovery call conducted"},
            headers=headers
        )
        assert act_res.status_code == 201

        # ==========================================
        # 4. Finance & Invoices Module Test
        # ==========================================
        inv_payload = {
            "client_id": client_id,
            "total_amount": 50000.0,
            "due_date": "2026-12-01",
            "status": "sent"
        }
        create_inv_res = await client.post("/api/v1/finance/invoices", json=inv_payload, headers=headers)
        assert create_inv_res.status_code == 201
        created_inv = create_inv_res.json()
        inv_id = created_inv["id"]
        assert created_inv["balance_amount"] == 50000.0

        # Record payment
        pay_res = await client.post(
            f"/api/v1/finance/invoices/{inv_id}/payments",
            json={"amount": 25000.0, "payment_method": "Bank Transfer", "transaction_ref": "UTR-TEST-001"},
            headers=headers
        )
        assert pay_res.status_code == 200
        paid_inv = pay_res.json()
        assert paid_inv["paid_amount"] == 25000.0
        assert paid_inv["balance_amount"] == 25000.0
        assert paid_inv["status"] == "partially_paid"

        # Expense
        exp_res = await client.post(
            "/api/v1/finance/expenses",
            json={
                "title": "AWS Cloud Production Server",
                "category": "Hosting & Servers",
                "amount": 12500.0,
                "expense_date": "2026-11-01"
            },
            headers=headers
        )
        assert exp_res.status_code == 201
        exp_id = exp_res.json()["id"]

        # Financial Summary Check
        summary_res = await client.get("/api/v1/finance/summary", headers=headers)
        assert summary_res.status_code == 200
        sum_data = summary_res.json()
        assert sum_data["total_invoiced"] >= 50000.0
        assert sum_data["total_collected"] >= 25000.0

        # ==========================================
        # 5. WhatsApp Module Test
        # ==========================================
        status_res = await client.get("/api/v1/whatsapp/status", headers=headers)
        assert status_res.status_code == 200
        assert "configured" in status_res.json()

        convo_res = await client.post(
            "/api/v1/whatsapp/conversations",
            json={"contact_phone": "+919988776655", "contact_name": "Arthur Pendelton"},
            headers=headers
        )
        assert convo_res.status_code == 201
        convo_id = convo_res.json()["id"]

        # ==========================================
        # 6. Analytics Overview Test
        # ==========================================
        analytics_res = await client.get("/api/v1/analytics/overview", headers=headers)
        assert analytics_res.status_code == 200
        overview = analytics_res.json()
        assert "finance" in overview
        assert "pipeline" in overview
        assert "projects" in overview
        assert "workforce" in overview

        # ==========================================
        # 7. Settings Module Test
        # ==========================================
        profile_res = await client.get("/api/v1/settings/profile", headers=headers)
        assert profile_res.status_code == 200
        assert profile_res.json()["email"] == "superadmin@bodhiwaves.com"

        audit_res = await client.get("/api/v1/settings/audit-logs", headers=headers)
        assert audit_res.status_code == 200
        assert isinstance(audit_res.json(), list)

        # ==========================================
        # 8. Clean up test records
        # ==========================================
        await client.delete(f"/api/v1/finance/invoices/{inv_id}", headers=headers)
        await client.delete(f"/api/v1/finance/expenses/{exp_id}", headers=headers)
        await client.delete(f"/api/v1/crm/leads/{lead_id}", headers=headers)
        await client.delete(f"/api/v1/clients/{client_id}", headers=headers)
