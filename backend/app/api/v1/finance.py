from typing import List, Optional
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database.session import get_db
from app.models.finance import Invoice, Payment, Expense
from app.models.clients_projects import Client, Project
from app.models.departments import Department
from app.models.users import User
from app.schemas.finance import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceOut,
    InvoiceDetailOut,
    PaymentCreate,
    PaymentOut,
    ExpenseCreate,
    ExpenseOut
)
from app.api.deps import get_current_user, get_current_admin, get_current_manager_or_higher

router = APIRouter(prefix="/finance", tags=["Finance & Invoices"])


def _format_payment(p: Payment) -> PaymentOut:
    return PaymentOut(
        id=p.id,
        invoice_id=p.invoice_id,
        amount=p.amount,
        payment_method=p.payment_method,
        transaction_ref=p.transaction_ref,
        paid_at=p.paid_at
    )


def _format_invoice(inv: Invoice) -> InvoiceOut:
    payments = inv.payments or []
    return InvoiceOut(
        id=inv.id,
        invoice_number=inv.invoice_number,
        client_id=inv.client_id,
        client_name=inv.client.business_name if inv.client else None,
        project_id=inv.project_id,
        project_title=inv.project.title if inv.project else None,
        total_amount=inv.total_amount,
        paid_amount=inv.paid_amount,
        balance_amount=inv.balance_amount,
        due_date=inv.due_date,
        status=inv.status,
        created_at=inv.created_at,
        payments_count=len(payments)
    )


def _format_expense(exp: Expense) -> ExpenseOut:
    return ExpenseOut(
        id=exp.id,
        title=exp.title,
        category=exp.category,
        department_id=exp.department_id,
        department_name=exp.department.name if exp.department else None,
        amount=exp.amount,
        expense_date=exp.expense_date,
        recorded_by_name=exp.recorded_by.full_name if exp.recorded_by else None,
        notes=exp.notes,
        created_at=exp.created_at
    )


# ==========================================
# Invoice Endpoints
# ==========================================

@router.get("/invoices", response_model=List[InvoiceOut])
def list_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    client_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status")
):
    """
    List actual tax invoices from PostgreSQL.
    """
    query = db.query(Invoice)

    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    if status_filter and status_filter != "all":
        query = query.filter(Invoice.status == status_filter)

    invoices = query.order_by(desc(Invoice.created_at)).all()
    return [_format_invoice(i) for i in invoices]


@router.post("/invoices", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Generate a new commercial tax invoice in PostgreSQL.
    """
    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=400, detail="Specified client does not exist")

    if payload.project_id:
        proj = db.query(Project).filter(Project.id == payload.project_id).first()
        if not proj:
            raise HTTPException(status_code=400, detail="Specified project does not exist")

    # Safe sequential invoice number generation
    year = date.today().year
    count = db.query(Invoice).count() + 1
    invoice_num = f"BW-INV-{year}-{count:04d}"

    invoice = Invoice(
        invoice_number=invoice_num,
        client_id=payload.client_id,
        project_id=payload.project_id,
        total_amount=payload.total_amount,
        paid_amount=0.0,
        balance_amount=payload.total_amount,
        due_date=payload.due_date,
        status=payload.status
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return _format_invoice(invoice)


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetailOut)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get invoice details including recorded payment receipts.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    base = _format_invoice(invoice)
    payments = invoice.payments or []
    return InvoiceDetailOut(
        **base.model_dump(),
        payments=[_format_payment(p) for p in payments]
    )


@router.put("/invoices/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: int,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Update invoice details.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if payload.total_amount is not None:
        invoice.total_amount = payload.total_amount
        invoice.balance_amount = max(0.0, payload.total_amount - invoice.paid_amount)
    if payload.due_date is not None:
        invoice.due_date = payload.due_date
    if payload.status is not None:
        invoice.status = payload.status

    db.commit()
    db.refresh(invoice)
    return _format_invoice(invoice)


@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Delete invoice (admin only).
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.delete(invoice)
    db.commit()
    return None


@router.post("/invoices/{invoice_id}/payments", response_model=InvoiceDetailOut)
def record_payment(
    invoice_id: int,
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Record payment against an invoice and update balance/status atomically.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    payment = Payment(
        invoice_id=invoice_id,
        amount=payload.amount,
        payment_method=payload.payment_method,
        transaction_ref=payload.transaction_ref
    )
    db.add(payment)

    # Recalculate invoice balances
    new_paid = invoice.paid_amount + payload.amount
    invoice.paid_amount = new_paid
    invoice.balance_amount = max(0.0, invoice.total_amount - new_paid)

    if invoice.balance_amount == 0.0:
        invoice.status = "paid"
    else:
        invoice.status = "partially_paid"

    db.commit()
    db.refresh(invoice)

    base = _format_invoice(invoice)
    payments = invoice.payments or []
    return InvoiceDetailOut(
        **base.model_dump(),
        payments=[_format_payment(p) for p in payments]
    )


# ==========================================
# Expense Endpoints
# ==========================================

@router.get("/expenses", response_model=List[ExpenseOut])
def list_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    department_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None)
):
    """
    List operational agency expenses.
    """
    query = db.query(Expense)

    if department_id:
        query = query.filter(Expense.department_id == department_id)
    if category and category != "all":
        query = query.filter(Expense.category == category)

    expenses = query.order_by(desc(Expense.created_at)).all()
    return [_format_expense(e) for e in expenses]


@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_higher)
):
    """
    Log an agency business expense.
    """
    if payload.department_id:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Specified department does not exist")

    expense = Expense(
        title=payload.title.strip(),
        category=payload.category,
        department_id=payload.department_id,
        amount=payload.amount,
        expense_date=payload.expense_date,
        recorded_by_id=current_user.id,
        notes=payload.notes.strip() if payload.notes else None
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _format_expense(expense)


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Delete an expense (admin only).
    """
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return None


# ==========================================
# Financial Summary Endpoint
# ==========================================

@router.get("/summary")
def get_financial_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aggregate real financial metrics from PostgreSQL.
    """
    invoices = db.query(Invoice).all()
    expenses = db.query(Expense).all()

    total_invoiced = sum(i.total_amount for i in invoices)
    total_collected = sum(i.paid_amount for i in invoices)
    outstanding_balance = sum(i.balance_amount for i in invoices)
    total_expenses = sum(e.amount for e in expenses)

    return {
        "total_invoiced": total_invoiced,
        "total_collected": total_collected,
        "outstanding_balance": outstanding_balance,
        "total_expenses": total_expenses,
        "net_revenue": total_collected - total_expenses,
        "invoices_count": len(invoices),
        "expenses_count": len(expenses)
    }
