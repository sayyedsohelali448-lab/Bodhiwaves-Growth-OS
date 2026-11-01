from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ==========================================
# Payment Schemas
# ==========================================

class PaymentCreate(BaseModel):
    amount: float = Field(..., gt=0.0)
    payment_method: str = Field("Bank Transfer", max_length=50)
    transaction_ref: Optional[str] = None


class PaymentOut(BaseModel):
    id: int
    invoice_id: int
    amount: float
    payment_method: str
    transaction_ref: Optional[str] = None
    paid_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# Invoice Schemas
# ==========================================

class InvoiceCreate(BaseModel):
    client_id: int
    project_id: Optional[int] = None
    total_amount: float = Field(..., gt=0.0)
    due_date: Optional[str] = None
    status: str = Field("draft", pattern="^(draft|sent|partially_paid|paid|overdue|cancelled)$")


class InvoiceUpdate(BaseModel):
    total_amount: Optional[float] = None
    due_date: Optional[str] = None
    status: Optional[str] = None


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    client_id: int
    client_name: Optional[str] = None
    project_id: Optional[int] = None
    project_title: Optional[str] = None
    total_amount: float
    paid_amount: float
    balance_amount: float
    due_date: Optional[str] = None
    status: str
    created_at: datetime
    payments_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class InvoiceDetailOut(InvoiceOut):
    payments: List[PaymentOut] = []


# ==========================================
# Expense Schemas
# ==========================================

class ExpenseCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    category: str = Field("Software & Tools", max_length=100)
    department_id: Optional[int] = None
    amount: float = Field(..., gt=0.0)
    expense_date: str = Field(..., min_length=4)
    notes: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    title: str
    category: str
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    amount: float
    expense_date: str
    recorded_by_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
