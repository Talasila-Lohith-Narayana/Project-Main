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
