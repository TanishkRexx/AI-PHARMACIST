"""
Database Seeder - Populate initial data
Medicines loaded from CSV in same folder
Auto-detects: Medicine.csv, Medicines.csv, medicines.csv
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
# AUTO-DETECT CSV FILE
# ============================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Try multiple possible CSV filenames
POSSIBLE_CSV_NAMES = [
    "Medicine.csv",      # Your actual filename
    "Medicines.csv",
    "medicines.csv",
    "medicine.csv",
    "MEDICINES.csv",
    "MEDICINE.csv"
]

CSV_FILE_PATH = None
for csv_name in POSSIBLE_CSV_NAMES:
    potential_path = os.path.join(SCRIPT_DIR, csv_name)
    if os.path.exists(potential_path):
        CSV_FILE_PATH = potential_path
        break

# Default fallback
if not CSV_FILE_PATH:
    CSV_FILE_PATH = os.path.join(SCRIPT_DIR, "medicines.csv")


# ============================================
# HELPER FUNCTIONS
# ============================================

def parse_list_field(value: str) -> list:
    """Parse pipe-separated (|) or comma-separated list"""
    if not value:
        return []
    
    value = str(value).strip()
    
    # Your CSV uses pipe (|) as separator
    if '|' in value:
        return [item.strip() for item in value.split('|') if item.strip()]
    
    # Fallback to comma
    if ',' in value:
        return [item.strip() for item in value.split(',') if item.strip()]
    
    # Try JSON
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return parsed
    except:
        pass
    
    return [value] if value else []


def parse_bool(value) -> bool:
    """Parse boolean from string"""
    if not value:
        return False
    return str(value).strip().lower() in ['yes', 'true', '1', 'required', 'y']


def parse_float(value, default=0.0) -> float:
    """Safely parse float"""
    if value is None or value == '':
        return default
    try:
        cleaned = str(value).replace('₹', '').replace('$', '').replace(',', '').strip()
        return float(cleaned) if cleaned else default
    except:
        return default


def parse_int(value, default=0) -> int:
    """Safely parse int"""
    if value is None or value == '':
        return default
    try:
        cleaned = str(value).replace(',', '').strip()
        return int(float(cleaned)) if cleaned else default
    except:
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
# LOAD MEDICINES FROM CSV
# ============================================

def load_medicines_from_csv() -> list:
    """Load all 138 medicines from Medicine.csv"""
    medicines = []
    skipped_rows = []
    
    print(f"\n📂 Loading medicines from CSV...")
    print(f"   Path: {CSV_FILE_PATH}")
    
    if not os.path.exists(CSV_FILE_PATH):
        print(f"   ❌ CSV file not found!")
        print(f"   💡 Tried these filenames:")
        for name in POSSIBLE_CSV_NAMES:
            print(f"      - {name}")
        return []
    
    # Try different encodings
    encodings_to_try = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
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
    
    # Parse CSV
    import io
    csv_file = io.StringIO(file_content)
    csv_reader = csv.DictReader(csv_file)
    
    # Clean and display headers
    headers = csv_reader.fieldnames
    if headers:
        headers = [h.strip().replace('\ufeff', '').replace('\ufffe', '') for h in headers]
        print(f"   📋 CSV Columns ({len(headers)}): {', '.join(headers[:5])}...")
    else:
        print("   ❌ No headers found!")
        return []
    
    # Process each row
    total_rows = 0
    
    for row_num, row in enumerate(csv_reader, start=2):
        total_rows += 1
        
        # Clean row keys (remove BOM)
        cleaned_row = {}
        for key, value in row.items():
            clean_key = key.strip().replace('\ufeff', '').replace('\ufffe', '') if key else ''
            cleaned_row[clean_key] = value.strip() if value else ''
        row = cleaned_row
        
        # Get required fields - YOUR CSV COLUMNS
        name = row.get('Medicine Name', '').strip()
        
        if not name:
            skipped_rows.append(f"Row {row_num}: No name")
            continue
        
        generic_name = row.get('Generic Name', name).strip()
        brand = row.get('Brand', 'Generic').strip()
        category = row.get('Category', 'other').strip().lower()
        dosage = row.get('Dosage', 'N/A').strip()
        description = row.get('Description', f"{name} - Medical product").strip()
        
        # Numeric fields
        unit_price = parse_float(row.get('Unit Price', '0'), 0)
        stock_quantity = parse_int(row.get('Stock Quantity', '100'), 100)
        reorder_level = parse_int(row.get('Reorder Level', '50'), 50)
        
        # Boolean
        prescription_required = parse_bool(row.get('Prescription Required', 'No'))
        
        # List fields (pipe-separated in your CSV)
        contraindications = parse_list_field(row.get('Contraindications', ''))
        drug_interactions = parse_list_field(row.get('Drug Interactions', ''))
        side_effects = parse_list_field(row.get('Side Effects', ''))
        
        # Other fields
        max_daily_dosage = row.get('Max Daily Dosage', '').strip()
        manufacturer = row.get('Manufacturer', brand).strip()
        
        # IMAGE URL - This is what you want!
        image_url = row.get('Image URL', '').strip()
        
        # Check if active (defaults to Yes)
        is_active_str = row.get('Is Active', 'Yes').strip().lower()
        is_active = is_active_str in ['yes', 'true', '1', 'y', '']
        
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
            "image_url": image_url,  # ✅ IMAGE URL FROM CSV
            "is_active": is_active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        medicines.append(medicine)
        
        # Progress indicator every 20 rows
        if total_rows % 20 == 0:
            print(f"   📦 Processed {total_rows} rows...")
    
    # Print summary
    print(f"\n   📊 CSV Processing Complete:")
    print(f"      Total rows in CSV: {total_rows}")
    print(f"      Successfully parsed: {len(medicines)}")
    print(f"      Skipped rows: {len(skipped_rows)}")
    
    if skipped_rows:
        print(f"\n   ⚠️ Skipped rows:")
        for skip in skipped_rows[:5]:
            print(f"      {skip}")
        if len(skipped_rows) > 5:
            print(f"      ... and {len(skipped_rows) - 5} more")
    
    return medicines


# ============================================
# SEED MEDICINES
# ============================================

async def seed_medicines():
    """Seed medicines from CSV file"""
    db = get_database()
    
    # Load from CSV
    medicines = load_medicines_from_csv()
    
    if not medicines:
        print("\n❌ No medicines loaded!")
        print("   Please check that Medicine.csv exists in the scripts folder")
        return []
    
    # Delete existing and insert new
    print(f"\n   🗑️  Clearing existing medicines...")
    await db["medicines"].delete_many({})
    
    print(f"   💾 Inserting {len(medicines)} medicines...")
    result = await db["medicines"].insert_many(medicines)
    
    # Calculate statistics
    with_images = sum(1 for m in medicines if m.get('image_url'))
    with_rx = sum(1 for m in medicines if m.get('prescription_required'))
    categories = set(m.get('category', 'other') for m in medicines)
    brands = set(m.get('brand', '') for m in medicines)
    
    print(f"\n✅ Successfully inserted {len(result.inserted_ids)} medicines!")
    print(f"   📷 With images: {with_images}/{len(medicines)}")
    print(f"   💊 Prescription required: {with_rx}/{len(medicines)}")
    print(f"   📁 Categories ({len(categories)}): {', '.join(sorted(categories))}")
    print(f"   🏷️  Brands ({len(brands)}): {len(brands)} unique brands")
    
    # Show sample medicines
    print(f"\n   📋 Sample medicines loaded:")
    for med in medicines[:5]:
        img_icon = '📷' if med.get('image_url') else '❌'
        rx_icon = '💊' if med.get('prescription_required') else '  '
        print(f"      {img_icon}{rx_icon} {med['name'][:40]:40} - ₹{med['unit_price']:6.2f} - {med['brand']}")
    if len(medicines) > 5:
        print(f"      ... and {len(medicines) - 5} more medicines")
    
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
                "image_url": med.get("image_url", "")  # Include image in orders
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