"""
Database Seeder - Populate initial data
Medicines loaded from medicines.csv in same folder
Run: python -m scripts.seed_database
"""
import asyncio
import csv
import json
from datetime import datetime, timedelta
from bson import ObjectId
import random
import sys
import os

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.mongodb import connect_db, disconnect_db, get_database
from app.auth.utils import get_password_hash


# ============================================
# GET CSV PATH (Same folder as this script)
# ============================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE_PATH = os.path.join(SCRIPT_DIR, "Medicines.csv")


# ============================================
# HELPER FUNCTIONS
# ============================================

def parse_list_field(value: str) -> list:
    """Parse a comma-separated or JSON list field"""
    if not value:
        return []
    
    value = str(value).strip()
    
    # Try JSON parsing first
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return parsed
    except:
        pass
    
    # Fall back to comma-separated
    return [item.strip() for item in value.split(',') if item.strip()]


def parse_bool(value) -> bool:
    """Parse boolean from string"""
    if not value:
        return False
    return str(value).strip().lower() in ['yes', 'true', '1', 'required', 'y']


def parse_float(value, default=0.0) -> float:
    """Safely parse float"""
    if value is None:
        return default
    try:
        # Remove currency symbols and commas
        cleaned = str(value).replace('₹', '').replace('$', '').replace(',', '').strip()
        return float(cleaned) if cleaned else default
    except:
        return default


def parse_int(value, default=0) -> int:
    """Safely parse int"""
    if value is None:
        return default
    try:
        cleaned = str(value).replace(',', '').strip()
        return int(float(cleaned)) if cleaned else default
    except:
        return default


def get_field(row: dict, *field_names, default=""):
    """Get field value trying multiple possible column names"""
    for field in field_names:
        # Try exact match
        if field in row and row[field]:
            return str(row[field]).strip()
        # Try case-insensitive match
        for key in row.keys():
            if key.lower().strip() == field.lower().strip():
                if row[key]:
                    return str(row[key]).strip()
    return default


# ============================================
# SEED USERS
# ============================================

async def seed_users():
    """Seed demo users"""
    db = get_database()
    
    users = [
        {
            "email": "admin@demo.com",
            "password_hash": get_password_hash("admin123"),
            "name": "System Admin",
            "phone": "9000000000",
            "role": "admin",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "email": "customer@demo.com",
            "password_hash": get_password_hash("password123"),
            "name": "Demo Customer",
            "phone": "9876543210",
            "role": "customer",
            "address": "123 Main Street, Mumbai 400001",
            "medical_info": {
                "allergies": [
                    {"allergen": "Penicillin", "severity": "severe", "reaction": "Rash"}
                ],
                "chronic_conditions": ["Diabetes"],
                "current_medications": ["Metformin"]
            },
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "email": "pharmacy@demo.com",
            "password_hash": get_password_hash("password123"),
            "name": "Pharmacy Admin",
            "phone": "9876543211",
            "role": "pharmacy",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "email": "distributor@demo.com",
            "password_hash": get_password_hash("password123"),
            "name": "Distributor Admin",
            "phone": "9876543212",
            "role": "distributor",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    await db["users"].delete_many({})
    result = await db["users"].insert_many(users)
    print(f"✅ Created {len(result.inserted_ids)} users")
    
    return result.inserted_ids


# ============================================
# DIAGNOSE CSV FILE
# ============================================

def diagnose_csv():
    """Diagnose CSV file for issues"""
    print("\n🔍 Diagnosing CSV file...")
    print(f"   Path: {CSV_FILE_PATH}")
    
    if not os.path.exists(CSV_FILE_PATH):
        print("   ❌ File not found!")
        return False
    
    # Check file size
    file_size = os.path.getsize(CSV_FILE_PATH)
    print(f"   📦 File size: {file_size} bytes")
    
    # Try different encodings
    encodings_to_try = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
    
    for encoding in encodings_to_try:
        try:
            with open(CSV_FILE_PATH, 'r', encoding=encoding) as f:
                # Read first few bytes to check for BOM
                first_bytes = f.read(10)
                f.seek(0)
                
                # Try to read as CSV
                reader = csv.DictReader(f)
                headers = reader.fieldnames
                
                if headers:
                    print(f"   ✅ Encoding '{encoding}' works!")
                    print(f"   📋 Found {len(headers)} columns:")
                    for i, h in enumerate(headers):
                        print(f"      {i+1}. '{h}'")
                    
                    # Count rows
                    row_count = sum(1 for _ in reader)
                    print(f"   📊 Total data rows: {row_count}")
                    
                    return encoding
        except Exception as e:
            print(f"   ⚠️ Encoding '{encoding}' failed: {e}")
    
    return None


# ============================================
# LOAD MEDICINES FROM CSV
# ============================================

def load_medicines_from_csv() -> list:
    """Load medicines from medicines.csv in the same folder"""
    medicines = []
    skipped_rows = []
    
    print(f"\n📂 Loading medicines from: {CSV_FILE_PATH}")
    
    if not os.path.exists(CSV_FILE_PATH):
        print(f"   ❌ CSV file not found!")
        return []
    
    # Try different encodings
    encodings_to_try = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']
    file_content = None
    used_encoding = None
    
    for encoding in encodings_to_try:
        try:
            with open(CSV_FILE_PATH, 'r', encoding=encoding) as f:
                file_content = f.read()
                used_encoding = encoding
                break
        except UnicodeDecodeError:
            continue
    
    if not file_content:
        print("   ❌ Could not read CSV with any encoding!")
        return []
    
    print(f"   ✅ Using encoding: {used_encoding}")
    
    # Parse CSV from string
    import io
    csv_file = io.StringIO(file_content)
    csv_reader = csv.DictReader(csv_file)
    
    # Print headers
    headers = csv_reader.fieldnames
    if headers:
        # Clean headers (remove BOM and whitespace)
        headers = [h.strip().replace('\ufeff', '') for h in headers]
        print(f"   📋 Columns found: {headers}")
    else:
        print("   ❌ No headers found in CSV!")
        return []
    
    # Process each row
    total_rows = 0
    
    for row_num, row in enumerate(csv_reader, start=2):
        total_rows += 1
        
        # Clean row keys
        cleaned_row = {}
        for key, value in row.items():
            clean_key = key.strip().replace('\ufeff', '') if key else ''
            cleaned_row[clean_key] = value
        row = cleaned_row
        
        # Get name using flexible field matching
        name = get_field(
            row,
            'name', 'Name', 'NAME',
            'medicine_name', 'Medicine Name', 'MEDICINE NAME',
            'medicine', 'Medicine', 'MEDICINE',
            'product_name', 'Product Name',
            'item_name', 'Item Name',
            'drug_name', 'Drug Name'
        )
        
        if not name:
            skipped_rows.append(f"Row {row_num}: No name found - {dict(list(row.items())[:3])}")
            continue
        
        # Parse all fields
        generic_name = get_field(
            row,
            'generic_name', 'Generic Name', 'GENERIC NAME',
            'generic', 'Generic', 'GENERIC',
            'salt', 'Salt', 'composition', 'Composition',
            default=name
        )
        
        brand = get_field(
            row,
            'brand', 'Brand', 'BRAND',
            'brand_name', 'Brand Name',
            'company', 'Company',
            default="Generic"
        )
        
        category = get_field(
            row,
            'category', 'Category', 'CATEGORY',
            'type', 'Type', 'TYPE',
            'medicine_type', 'Medicine Type',
            'drug_type', 'Drug Type',
            default="other"
        ).lower()
        
        dosage = get_field(
            row,
            'dosage', 'Dosage', 'DOSAGE',
            'strength', 'Strength', 'STRENGTH',
            'dose', 'Dose',
            'mg', 'MG',
            default="N/A"
        )
        
        description = get_field(
            row,
            'description', 'Description', 'DESCRIPTION',
            'desc', 'Desc',
            'details', 'Details',
            'about', 'About',
            'use', 'Use', 'uses', 'Uses',
            default=f"{name} - Medical product"
        )
        
        # Parse numeric fields
        unit_price = parse_float(get_field(
            row,
            'unit_price', 'Unit Price', 'UNIT PRICE',
            'price', 'Price', 'PRICE',
            'mrp', 'MRP',
            'cost', 'Cost',
            'rate', 'Rate',
            default="0"
        ), 0)
        
        stock_quantity = parse_int(get_field(
            row,
            'stock_quantity', 'Stock Quantity', 'STOCK QUANTITY',
            'stock', 'Stock', 'STOCK',
            'quantity', 'Quantity', 'QUANTITY',
            'qty', 'Qty', 'QTY',
            'available', 'Available',
            default="100"
        ), 100)
        
        reorder_level = parse_int(get_field(
            row,
            'reorder_level', 'Reorder Level', 'REORDER LEVEL',
            'min_stock', 'Min Stock', 'MIN STOCK',
            'reorder', 'Reorder',
            'minimum', 'Minimum',
            default="50"
        ), 50)
        
        # Parse prescription required
        prescription_required = parse_bool(get_field(
            row,
            'prescription_required', 'Prescription Required', 'PRESCRIPTION REQUIRED',
            'prescription', 'Prescription', 'PRESCRIPTION',
            'rx_required', 'Rx Required', 'RX REQUIRED',
            'rx', 'Rx', 'RX',
            default="No"
        ))
        
        # Parse list fields
        contraindications = parse_list_field(get_field(
            row,
            'contraindications', 'Contraindications', 'CONTRAINDICATIONS',
            'contra', 'warnings', 'Warnings',
            default=""
        ))
        
        drug_interactions = parse_list_field(get_field(
            row,
            'drug_interactions', 'Drug Interactions', 'DRUG INTERACTIONS',
            'interactions', 'Interactions',
            default=""
        ))
        
        side_effects = parse_list_field(get_field(
            row,
            'side_effects', 'Side Effects', 'SIDE EFFECTS',
            'sideeffects', 'SideEffects',
            'effects', 'Effects',
            default=""
        ))
        
        max_daily_dosage = get_field(
            row,
            'max_daily_dosage', 'Max Daily Dosage', 'MAX DAILY DOSAGE',
            'max_dosage', 'Max Dosage',
            'daily_limit', 'Daily Limit',
            default=""
        )
        
        manufacturer = get_field(
            row,
            'manufacturer', 'Manufacturer', 'MANUFACTURER',
            'mfg', 'Mfg', 'MFG',
            'company', 'Company',
            'maker', 'Maker',
            default=brand if brand != "Generic" else "Generic"
        )
        
        # Get image URL
        image_url = get_field(
            row,
            'image_url', 'Image URL', 'IMAGE URL',
            'image', 'Image', 'IMAGE',
            'img_url', 'Img URL', 'IMG URL',
            'img', 'Img', 'IMG',
            'photo', 'Photo', 'PHOTO',
            'picture', 'Picture', 'PICTURE',
            'url', 'URL',
            default=""
        )
        
        # Build medicine document
        medicine = {
            "name": name,
            "generic_name": generic_name,
            "brand": brand,
            "category": category,
            "dosage": dosage,
            "description": description,
            "unit_price": unit_price,
            "stock_quantity": stock_quantity,
            "reorder_level": reorder_level,
            "prescription_required": prescription_required,
            "contraindications": contraindications,
            "drug_interactions": drug_interactions,
            "side_effects": side_effects,
            "max_daily_dosage": max_daily_dosage,
            "manufacturer": manufacturer,
            "image_url": image_url,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        medicines.append(medicine)
    
    # Print summary
    print(f"\n   📊 CSV Processing Summary:")
    print(f"      Total rows in CSV: {total_rows}")
    print(f"      Successfully parsed: {len(medicines)}")
    print(f"      Skipped rows: {len(skipped_rows)}")
    
    if skipped_rows and len(skipped_rows) <= 10:
        print(f"\n   ⚠️ Skipped rows details:")
        for skip in skipped_rows:
            print(f"      {skip}")
    elif skipped_rows:
        print(f"\n   ⚠️ First 10 skipped rows:")
        for skip in skipped_rows[:10]:
            print(f"      {skip}")
        print(f"      ... and {len(skipped_rows) - 10} more")
    
    return medicines


# ============================================
# SEED MEDICINES
# ============================================

async def seed_medicines():
    """Seed medicines from CSV file"""
    db = get_database()
    
    # First diagnose the CSV
    diagnose_csv()
    
    # Load medicines
    medicines = load_medicines_from_csv()
    
    if not medicines:
        print("\n❌ No medicines loaded! Please check your medicines.csv file")
        print("\n📝 Make sure your CSV has one of these column names for medicine name:")
        print("   name, Name, NAME, medicine_name, Medicine Name, medicine, Medicine")
        return []
    
    # Delete existing and insert new
    await db["medicines"].delete_many({})
    result = await db["medicines"].insert_many(medicines)
    
    # Print statistics
    with_images = sum(1 for m in medicines if m.get('image_url'))
    with_rx = sum(1 for m in medicines if m.get('prescription_required'))
    categories = set(m.get('category', 'other') for m in medicines)
    
    print(f"\n✅ Successfully inserted {len(result.inserted_ids)} medicines!")
    print(f"   📷 With images: {with_images}/{len(medicines)}")
    print(f"   💊 Prescription required: {with_rx}/{len(medicines)}")
    print(f"   📁 Categories: {', '.join(sorted(categories))}")
    
    # Show sample medicines
    print(f"\n   📋 Sample medicines loaded:")
    for med in medicines[:5]:
        img_icon = '📷' if med.get('image_url') else '  '
        rx_icon = '💊' if med.get('prescription_required') else '  '
        print(f"      {img_icon}{rx_icon} {med['name']} - ₹{med['unit_price']}")
    if len(medicines) > 5:
        print(f"      ... and {len(medicines) - 5} more")
    
    return result.inserted_ids


# ============================================
# SEED SAMPLE ORDERS
# ============================================

async def seed_sample_orders(user_ids, medicine_ids):
    """Create sample orders"""
    db = get_database()
    
    users = await db["users"].find({"role": "customer"}).to_list(1)
    if not users:
        print("⚠️ No customer user found, skipping order seeding")
        return
    
    customer = users[0]
    customer_id = str(customer["_id"])
    
    medicines = await db["medicines"].find({}).to_list(100)
    
    if not medicines:
        print("⚠️ No medicines found, skipping order seeding")
        return
    
    orders = []
    
    for i in range(5):
        order_date = datetime.utcnow() - timedelta(days=random.randint(1, 30))
        
        num_items = min(random.randint(1, 3), len(medicines))
        selected = random.sample(medicines, num_items)
        
        items = []
        subtotal = 0
        
        for med in selected:
            qty = random.randint(1, 3)
            item_subtotal = qty * med["unit_price"]
            subtotal += item_subtotal
            
            items.append({
                "medicine_id": str(med["_id"]),
                "medicine_name": med["name"],
                "quantity": qty,
                "unit_price": med["unit_price"],
                "subtotal": item_subtotal,
                "dosage": med.get("dosage", ""),
                "prescription_required": med.get("prescription_required", False),
                "image_url": med.get("image_url", "")
            })
        
        tax = subtotal * 0.05
        delivery = 0 if subtotal >= 500 else 40
        total = subtotal + tax + delivery
        
        status = random.choice(["delivered", "delivered", "confirmed", "dispatched"])
        
        orders.append({
            "order_number": f"ORD-{order_date.strftime('%Y%m%d')}-{1000+i}",
            "customer_id": customer_id,
            "customer_name": customer.get("name", "Demo Customer"),
            "customer_phone": customer.get("phone", "9876543210"),
            "customer_email": customer.get("email", "customer@demo.com"),
            "items": items,
            "subtotal": round(subtotal, 2),
            "tax_amount": round(tax, 2),
            "delivery_charge": delivery,
            "total_amount": round(total, 2),
            "status": status,
            "payment_status": "paid",
            "delivery_address": customer.get("address", "123 Main Street, Mumbai 400001"),
            "created_at": order_date,
            "updated_at": order_date,
            "confirmed_at": order_date if status != "pending" else None,
            "delivered_at": order_date if status == "delivered" else None
        })
    
    await db["orders"].delete_many({})
    result = await db["orders"].insert_many(orders)
    print(f"✅ Created {len(result.inserted_ids)} sample orders")


# ============================================
# CREATE INDEXES
# ============================================

async def create_indexes():
    """Create database indexes"""
    db = get_database()
    
    await db["users"].create_index("email", unique=True)
    await db["users"].create_index("phone")
    await db["users"].create_index("role")
    
    await db["medicines"].create_index("name")
    await db["medicines"].create_index("generic_name")
    await db["medicines"].create_index("category")
    await db["medicines"].create_index([("name", "text"), ("generic_name", "text")])
    
    await db["orders"].create_index("order_number", unique=True)
    await db["orders"].create_index("customer_id")
    await db["orders"].create_index("status")
    await db["orders"].create_index("created_at")
    
    await db["carts"].create_index("user_id", unique=True)
    
    await db["procurement_orders"].create_index("po_number", unique=True)
    await db["procurement_orders"].create_index("status")
    
    print("✅ Created database indexes")


# ============================================
# MAIN FUNCTION
# ============================================

async def main():
    """Main seeder function"""
    print("🌱 Starting database seeding...")
    print("=" * 60)
    
    await connect_db()
    
    try:
        await create_indexes()
        user_ids = await seed_users()
        medicine_ids = await seed_medicines()
        await seed_sample_orders(user_ids, medicine_ids)
        
        print("\n" + "=" * 60)
        print("🎉 Database seeding completed!")
        print("")
        print("📋 Demo Credentials:")
        print("   Admin:       admin@demo.com / admin123")
        print("   Customer:    customer@demo.com / password123")
        print("   Pharmacy:    pharmacy@demo.com / password123")
        print("   Distributor: distributor@demo.com / password123")
        print("")
        
    finally:
        await disconnect_db()


if __name__ == "__main__":
    asyncio.run(main())