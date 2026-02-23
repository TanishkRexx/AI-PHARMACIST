"""
Database Seeder - Populate initial data
Run: python -m scripts.seed_database
"""
import asyncio
from datetime import datetime, timedelta
from bson import ObjectId
import random
import sys
import os

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.mongodb import connect_db, disconnect_db, get_database
from app.auth.utils import get_password_hash


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


async def seed_medicines():
    """Seed medicines"""
    db = get_database()
    
    medicines = [
        {
            "name": "Paracetamol 500mg",
            "generic_name": "Paracetamol",
            "brand": "Crocin",
            "category": "painkiller",
            "dosage": "500mg",
            "description": "Used for fever and mild pain relief",
            "unit_price": 15.00,
            "stock_quantity": 500,
            "reorder_level": 100,
            "prescription_required": False,
            "contraindications": ["Liver disease", "Alcohol use"],
            "drug_interactions": ["Warfarin"],
            "side_effects": ["Nausea", "Allergic reaction"],
            "max_daily_dosage": "4000mg",
            "manufacturer": "GSK",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Amoxicillin 500mg",
            "generic_name": "Amoxicillin",
            "brand": "Moxikind",
            "category": "antibiotic",
            "dosage": "500mg",
            "description": "Antibiotic for bacterial infections",
            "unit_price": 85.00,
            "stock_quantity": 200,
            "reorder_level": 50,
            "prescription_required": True,
            "contraindications": ["Penicillin allergy"],
            "drug_interactions": ["Methotrexate", "Warfarin"],
            "side_effects": ["Diarrhea", "Rash", "Nausea"],
            "manufacturer": "Mankind",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Metformin 500mg",
            "generic_name": "Metformin",
            "brand": "Glycomet",
            "category": "antidiabetic",
            "dosage": "500mg",
            "description": "For Type 2 diabetes management",
            "unit_price": 35.00,
            "stock_quantity": 300,
            "reorder_level": 75,
            "prescription_required": True,
            "contraindications": ["Kidney disease", "Liver disease"],
            "drug_interactions": ["Alcohol"],
            "side_effects": ["Nausea", "Diarrhea"],
            "manufacturer": "USV",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Amlodipine 5mg",
            "generic_name": "Amlodipine",
            "brand": "Amlong",
            "category": "cardiovascular",
            "dosage": "5mg",
            "description": "For high blood pressure",
            "unit_price": 45.00,
            "stock_quantity": 250,
            "reorder_level": 60,
            "prescription_required": True,
            "contraindications": ["Severe hypotension"],
            "drug_interactions": ["Simvastatin"],
            "side_effects": ["Swelling", "Fatigue"],
            "manufacturer": "Micro Labs",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Cetirizine 10mg",
            "generic_name": "Cetirizine",
            "brand": "Zyrtec",
            "category": "other",
            "dosage": "10mg",
            "description": "Antihistamine for allergies",
            "unit_price": 25.00,
            "stock_quantity": 400,
            "reorder_level": 80,
            "prescription_required": False,
            "contraindications": ["Kidney disease"],
            "drug_interactions": ["Alcohol"],
            "side_effects": ["Drowsiness"],
            "manufacturer": "J&J",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Omeprazole 20mg",
            "generic_name": "Omeprazole",
            "brand": "Omez",
            "category": "gastrointestinal",
            "dosage": "20mg",
            "description": "For acid reflux and ulcers",
            "unit_price": 55.00,
            "stock_quantity": 180,
            "reorder_level": 40,
            "prescription_required": False,
            "contraindications": ["Liver disease"],
            "drug_interactions": ["Clopidogrel"],
            "side_effects": ["Headache", "Diarrhea"],
            "manufacturer": "Dr Reddy's",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Vitamin D3 60000IU",
            "generic_name": "Cholecalciferol",
            "brand": "Uprise D3",
            "category": "vitamin",
            "dosage": "60000IU",
            "description": "Vitamin D supplement",
            "unit_price": 30.00,
            "stock_quantity": 500,
            "reorder_level": 100,
            "prescription_required": False,
            "contraindications": [],
            "drug_interactions": [],
            "side_effects": [],
            "manufacturer": "Alkem",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Azithromycin 500mg",
            "generic_name": "Azithromycin",
            "brand": "Zithromax",
            "category": "antibiotic",
            "dosage": "500mg",
            "description": "Antibiotic for respiratory infections",
            "unit_price": 120.00,
            "stock_quantity": 100,
            "reorder_level": 30,
            "prescription_required": True,
            "contraindications": ["Liver disease"],
            "drug_interactions": ["Warfarin"],
            "side_effects": ["Diarrhea", "Nausea"],
            "manufacturer": "Cipla",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Ibuprofen 400mg",
            "generic_name": "Ibuprofen",
            "brand": "Brufen",
            "category": "painkiller",
            "dosage": "400mg",
            "description": "Pain relief and anti-inflammatory",
            "unit_price": 20.00,
            "stock_quantity": 350,
            "reorder_level": 70,
            "prescription_required": False,
            "contraindications": ["Peptic ulcer", "Kidney disease"],
            "drug_interactions": ["Aspirin", "Warfarin"],
            "side_effects": ["Stomach pain", "Nausea"],
            "manufacturer": "Abbott",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Losartan 50mg",
            "generic_name": "Losartan",
            "brand": "Cozaar",
            "category": "cardiovascular",
            "dosage": "50mg",
            "description": "For high blood pressure",
            "unit_price": 55.00,
            "stock_quantity": 180,
            "reorder_level": 45,
            "prescription_required": True,
            "contraindications": ["Pregnancy"],
            "drug_interactions": ["Potassium supplements"],
            "side_effects": ["Dizziness", "Fatigue"],
            "manufacturer": "Merck",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        # Low stock items for testing
        {
            "name": "Ciprofloxacin 500mg",
            "generic_name": "Ciprofloxacin",
            "brand": "Ciplox",
            "category": "antibiotic",
            "dosage": "500mg",
            "description": "Antibiotic for various infections",
            "unit_price": 95.00,
            "stock_quantity": 25,  # Low stock
            "reorder_level": 40,
            "prescription_required": True,
            "contraindications": ["Tendon disorders"],
            "drug_interactions": ["Theophylline"],
            "side_effects": ["Nausea", "Headache"],
            "manufacturer": "Cipla",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Atorvastatin 10mg",
            "generic_name": "Atorvastatin",
            "brand": "Lipitor",
            "category": "cardiovascular",
            "dosage": "10mg",
            "description": "For high cholesterol",
            "unit_price": 75.00,
            "stock_quantity": 10,  # Very low
            "reorder_level": 50,
            "prescription_required": True,
            "contraindications": ["Liver disease", "Pregnancy"],
            "drug_interactions": ["Warfarin"],
            "side_effects": ["Muscle pain"],
            "manufacturer": "Pfizer",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    await db["medicines"].delete_many({})
    result = await db["medicines"].insert_many(medicines)
    print(f"✅ Created {len(result.inserted_ids)} medicines")
    
    return result.inserted_ids


async def seed_sample_orders(user_ids, medicine_ids):
    """Create sample orders"""
    db = get_database()
    
    customer_id = str(user_ids[0])  # First user is customer
    
    medicines = await db["medicines"].find({}).to_list(100)
    
    orders = []
    
    for i in range(5):
        order_date = datetime.utcnow() - timedelta(days=random.randint(1, 30))
        
        # Pick 1-3 random medicines
        selected = random.sample(medicines, random.randint(1, 3))
        
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
                "dosage": med["dosage"],
                "prescription_required": med.get("prescription_required", False)
            })
        
        tax = subtotal * 0.05
        delivery = 0 if subtotal >= 500 else 40
        total = subtotal + tax + delivery
        
        status = random.choice(["delivered", "delivered", "confirmed", "dispatched"])
        
        orders.append({
            "order_number": f"ORD-{order_date.strftime('%Y%m%d')}-{1000+i}",
            "customer_id": customer_id,
            "customer_name": "Demo Customer",
            "customer_phone": "9876543210",
            "customer_email": "customer@demo.com",
            "items": items,
            "subtotal": round(subtotal, 2),
            "tax_amount": round(tax, 2),
            "delivery_charge": delivery,
            "total_amount": round(total, 2),
            "status": status,
            "payment_status": "paid",
            "delivery_address": "123 Main Street, Mumbai 400001",
            "created_at": order_date,
            "updated_at": order_date,
            "confirmed_at": order_date if status != "pending" else None,
            "delivered_at": order_date if status == "delivered" else None
        })
    
    await db["orders"].delete_many({})
    result = await db["orders"].insert_many(orders)
    print(f"✅ Created {len(result.inserted_ids)} orders")


async def create_indexes():
    """Create database indexes"""
    db = get_database()
    
    # Users
    await db["users"].create_index("email", unique=True)
    await db["users"].create_index("phone")
    await db["users"].create_index("role")
    
    # Medicines
    await db["medicines"].create_index("name")
    await db["medicines"].create_index("generic_name")
    await db["medicines"].create_index("category")
    await db["medicines"].create_index([("name", "text"), ("generic_name", "text")])
    
    # Orders
    await db["orders"].create_index("order_number", unique=True)
    await db["orders"].create_index("customer_id")
    await db["orders"].create_index("status")
    await db["orders"].create_index("created_at")
    
    # Carts
    await db["carts"].create_index("user_id", unique=True)
    
    # Procurement
    await db["procurement_orders"].create_index("po_number", unique=True)
    await db["procurement_orders"].create_index("status")
    
    print("✅ Created indexes")


async def main():
    """Main seeder function"""
    print("🌱 Starting database seeding...")
    print("=" * 50)
    
    await connect_db()
    
    try:
        await create_indexes()
        user_ids = await seed_users()
        medicine_ids = await seed_medicines()
        await seed_sample_orders(user_ids, medicine_ids)
        
        print("=" * 50)
        print("🎉 Database seeding completed!")
        print("")
        print("📋 Demo Credentials:")
        print("   Customer:    customer@demo.com / password123")
        print("   Pharmacy:    pharmacy@demo.com / password123")
        print("   Distributor: distributor@demo.com / password123")
        print("")
        
    finally:
        await disconnect_db()


if __name__ == "__main__":
    asyncio.run(main())