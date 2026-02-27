"""
Import medicines from CSV file - Hackathon Data
Run: python -m scripts.import_medicines_csv
"""
import asyncio
import csv
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.mongodb import connect_db, disconnect_db, get_database


async def import_medicines_from_csv(csv_path: str):
    """
    Import medicines from CSV file.
    
    Expected CSV columns:
    - Medicine Name
    - Generic Name (optional)
    - Brand (optional)
    - Category
    - Dosage
    - Unit Price
    - Stock Quantity
    - Reorder Level (optional)
    - Prescription Required (Yes/No)
    - Description (optional)
    - Manufacturer (optional)
    """
    
    await connect_db()
    db = get_database()
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            medicines_to_insert = []
            
            for row in csv_reader:
                name = (
                    row.get('Medicine Name') or 
                    row.get('medicine_name') or 
                    row.get('Name') or 
                    row.get('name')
                )
                
                if not name:
                    print(f"Skipping row - no name: {row}")
                    continue
                
                rx_value = (
                    row.get('Prescription Required') or 
                    row.get('prescription_required') or 
                    row.get('Rx Required') or 
                    'No'
                ).strip().lower()
                
                prescription_required = rx_value in ['yes', 'true', '1', 'required', 'y']
                
                # Build medicine document
                medicine = {
                    "name": name.strip(),
                    "generic_name": (
                        row.get('Generic Name') or 
                        row.get('generic_name') or 
                        row.get('Generic') or 
                        name.strip()
                    ).strip(),
                    "brand": (
                        row.get('Brand') or 
                        row.get('brand') or 
                        row.get('Manufacturer') or 
                        "Generic"
                    ).strip(),
                    "category": (
                        row.get('Category') or 
                        row.get('category') or 
                        'other'
                    ).strip().lower(),
                    "dosage": (
                        row.get('Dosage') or 
                        row.get('dosage') or 
                        row.get('Strength') or 
                        'N/A'
                    ).strip(),
                    "unit_price": float(
                        row.get('Unit Price') or 
                        row.get('unit_price') or 
                        row.get('Price') or 
                        row.get('price') or 
                        0
                    ),
                    "stock_quantity": int(
                        row.get('Stock Quantity') or 
                        row.get('stock_quantity') or 
                        row.get('Stock') or 
                        row.get('Quantity') or 
                        100
                    ),
                    "reorder_level": int(
                        row.get('Reorder Level') or 
                        row.get('reorder_level') or 
                        row.get('Min Stock') or 
                        50
                    ),
                    "prescription_required": prescription_required,
                    "description": (
                        row.get('Description') or 
                        row.get('description') or 
                        f"{name} - Medical product"
                    ).strip(),
                    "manufacturer": (
                        row.get('Manufacturer') or 
                        row.get('manufacturer') or 
                        row.get('Brand') or 
                        "Generic"
                    ).strip(),
                    "contraindications": [],
                    "drug_interactions": [],
                    "side_effects": [],
                    "max_daily_dosage": row.get('Max Daily Dosage', ''),
                    "is_active": True,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                medicines_to_insert.append(medicine)
                print(f"✓ Parsed: {medicine['name']} - ₹{medicine['unit_price']} - Stock: {medicine['stock_quantity']}")
        
        if medicines_to_insert:
            
            result = await db["medicines"].insert_many(medicines_to_insert)
            print(f"\n✅ Successfully imported {len(result.inserted_ids)} medicines!")
            
            await db["medicines"].create_index("name")
            await db["medicines"].create_index("category")
            await db["medicines"].create_index([("name", "text"), ("generic_name", "text")])
            print("Created database indexes")
        else:
            print("No medicines to import!")
    
    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_path}")
    except Exception as e:
        print(f"Import failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await disconnect_db()


async def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.import_medicines_csv <path_to_csv>")
        print("Example: python -m scripts.import_medicines_csv data/medicines.csv")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    print(f"Importing medicines from: {csv_path}")
    await import_medicines_from_csv(csv_path)


if __name__ == "__main__":
    asyncio.run(main())