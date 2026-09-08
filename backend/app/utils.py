"""
================================================================================
DATA CONVERSION & SERIALIZATION UTILITIES (utils.py)
================================================================================

WHAT THIS FILE DOES (Plain English):
------------------------------------
Database tables store numbers, monetary amounts, and dates in raw formats (like Decimal
or SQL Date objects) that web browsers cannot directly understand as JSON text.
This file converts those database rows into clean, readable JSON format that the web 
frontend can render in charts, summary cards, and tables.

WHAT PART OF THE UI USES THIS:
------------------------------
1. Dashboard KPIs & Trend Charts:
   - Formats total revenue numbers, dates, and order values into charts and metrics.
2. Tables & Grids (Customers, Products, Orders, Reviews):
   - Formats prices (R$), review dates, and order timestamps so they display cleanly on screen.
================================================================================
"""

from datetime import datetime, date
from decimal import Decimal

def ser(v):
    """
    Serializes a single raw database value into a JSON-friendly format:
    - Converts Date & Timestamp objects to ISO strings ('2018-05-15T12:30:00')
    - Converts Decimal numbers (monetary values) to standard floating numbers (e.g. 159.90)
    """
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    return v

def rows(rs):
    """
    Takes raw SQL query result rows and turns them into a list of clean dictionaries/objects
    ready to be sent over the network to the frontend user interface.
    """
    return [{k: ser(v) for k, v in r._mapping.items()} for r in rs]
