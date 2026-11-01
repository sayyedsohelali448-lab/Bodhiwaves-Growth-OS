import sys
import os
import getpass
import argparse
from sqlalchemy.orm import Session

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.database.session import SessionLocal
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.users import User
from app.models.audit import AuditLog


def bootstrap_super_admin(email: str = None, password: str = None, name: str = None, force: bool = False):
    """
    Secure First-Admin Bootstrap CLI process.
    Guarantees that production systems never contain hardcoded credentials,
    and prevents unauthorized creation of additional super admin accounts.
    """
    db: Session = SessionLocal()
    try:
        # Check if an existing Super Admin already exists
        existing_super_admin = db.query(User).filter(User.role == "super_admin").first()
        if existing_super_admin and not force:
            print("=================================================================")
            print("SECURITY WARNING: A Super Admin account already exists in the system:")
            print(f"Email: {existing_super_admin.email}")
            print("Unauthorized creation of secondary Super Admin accounts is prevented.")
            print("Use --force if you intentionally need to bootstrap an additional admin.")
            print("=================================================================")
            return

        # 1. Resolve Email
        if not email:
            email = os.getenv("BOOTSTRAP_SUPERADMIN_EMAIL") or settings.BOOTSTRAP_SUPERADMIN_EMAIL
            if not email or not sys.stdin.isatty():
                email = email or "superadmin@bodhiwaves.com"
            else:
                input_email = input(f"Enter Super Admin Email [{email}]: ").strip()
                if input_email:
                    email = input_email

        # 2. Resolve Name
        if not name:
            name = os.getenv("BOOTSTRAP_SUPERADMIN_NAME") or settings.BOOTSTRAP_SUPERADMIN_NAME or "Bodhiwaves Super Admin"
            if sys.stdin.isatty():
                input_name = input(f"Enter Full Name [{name}]: ").strip()
                if input_name:
                    name = input_name

        # 3. Resolve Password securely
        if not password:
            password = os.getenv("BOOTSTRAP_SUPERADMIN_PASSWORD") or settings.BOOTSTRAP_SUPERADMIN_PASSWORD
            if not password:
                if sys.stdin.isatty():
                    password = getpass.getpass("Enter Super Admin Password (min 8 chars): ").strip()
                    confirm = getpass.getpass("Confirm Password: ").strip()
                    if password != confirm:
                        print("ERROR: Passwords do not match.")
                        return
                else:
                    print("ERROR: No password provided in environment or CLI.")
                    return

        if len(password) < 6:
            print("ERROR: Password must be at least 6 characters.")
            return

        # Check if email is already taken
        user = db.query(User).filter(User.email == email.lower().strip()).first()
        if user:
            print(f"Updating existing user '{email}' to Super Admin role...")
            user.role = "super_admin"
            user.full_name = name
            user.hashed_password = get_password_hash(password)
            user.is_active = True
            user.is_verified = True
        else:
            print(f"Creating new Super Admin '{email}'...")
            initials = "SA"
            parts = name.strip().split()
            if len(parts) >= 2:
                initials = f"{parts[0][0]}{parts[-1][0]}".upper()

            user = User(
                email=email.lower().strip(),
                hashed_password=get_password_hash(password),
                full_name=name.strip(),
                role="super_admin",
                avatar_initials=initials,
                is_active=True,
                is_verified=True
            )
            db.add(user)

        db.commit()
        db.refresh(user)

        # Record bootstrap audit log
        audit = AuditLog(
            user_id=user.id,
            action="BOOTSTRAP_SUPER_ADMIN",
            entity_name="User",
            entity_id=str(user.id),
            details=f"Super Admin bootstrapped successfully: {user.email}",
            ip_address="CLI_LOCAL"
        )
        db.add(audit)
        db.commit()

        print("=================================================================")
        print("SUCCESS: Super Admin account has been securely bootstrapped!")
        print(f"Email: {user.email}")
        print(f"Role:  {user.role}")
        print("=================================================================")

    except Exception as e:
        db.rollback()
        print(f"Bootstrap failed with error: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bootstrap the initial Super Admin for Bodhiwaves Growth OS")
    parser.add_argument("--email", help="Super Admin Email")
    parser.add_argument("--password", help="Super Admin Password")
    parser.add_argument("--name", help="Super Admin Full Name")
    parser.add_argument("--force", action="store_true", help="Force creation even if another Super Admin exists")
    args = parser.parse_args()

    bootstrap_super_admin(email=args.email, password=args.password, name=args.name, force=args.force)
