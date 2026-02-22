"""
Helper Utilities
"""
import uuid
from datetime import datetime


def generate_order_number() -> str:
    """Generate unique order number"""
    date_part = datetime.now().strftime("%Y%m%d")
    unique_part = uuid.uuid4().hex[:6].upper()
    return f"ORD-{date_part}-{unique_part}"


def generate_po_number() -> str:
    """Generate unique procurement order number"""
    date_part = datetime.now().strftime("%Y%m%d")
    unique_part = uuid.uuid4().hex[:6].upper()
    return f"PO-{date_part}-{unique_part}"


def generate_tracking_number() -> str:
    """Generate tracking number"""
    return f"TRK{uuid.uuid4().hex[:12].upper()}"