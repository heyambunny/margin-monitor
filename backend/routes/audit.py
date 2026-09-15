from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from backend.db import get_connection, release_connection
from backend.auth.jwt_handler import require_admin
import json

router = APIRouter()

class AuditFilterRequest(BaseModel):
    module: Optional[str] = "All"
    action: Optional[str] = "All"
    impact: Optional[str] = "All"
    date_range: Optional[List[str]] = None
    limit: int = 10
    offset: int = 0

@router.post("/audit-logs")
async def get_audit_logs(
    filters: AuditFilterRequest,
    user: dict = Depends(require_admin)
):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # Build WHERE clause
        conditions = []
        params = []
        
        if filters.module and filters.module != "All":
            conditions.append("module_name = %s")
            params.append(filters.module)
        
        if filters.action and filters.action != "All":
            conditions.append("action_type = %s")
            params.append(filters.action)
        
        if filters.impact and filters.impact != "All":
            conditions.append("impact_level = %s")
            params.append(filters.impact)
        
        if filters.date_range and len(filters.date_range) == 2:
            conditions.append("changed_at >= %s")
            params.append(filters.date_range[0])
            conditions.append("changed_at <= %s")
            params.append(filters.date_range[1] + " 23:59:59")
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # Get total count (unique entries)
        count_query = f"""
            SELECT COUNT(DISTINCT id) 
            FROM audit_logs
            WHERE {where_clause}
        """
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]
        
        # Get data with changes grouped
        data_query = f"""
            SELECT 
                table_name,
                record_id,
                action_type,
                changed_by,
                user_role,
                module_name,
                impact_level,
                changed_at,
                json_agg(
                    json_build_object(
                        'column', column_name,
                        'old', old_value,
                        'new', new_value
                    )
                ) AS changes
            FROM audit_logs
            WHERE {where_clause}
            GROUP BY table_name, record_id, action_type, changed_by, user_role, module_name, impact_level, changed_at
            ORDER BY changed_at DESC
            LIMIT %s OFFSET %s
        """
        cursor.execute(data_query, params + [filters.limit, filters.offset])
        
        rows = cursor.fetchall()
        
        result = []
        for row in rows:
            changes = row[8] if len(row) > 8 and row[8] else []
            
            # Get username from changed_by
            username = "System"
            if row[3]:
                cursor.execute("SELECT name FROM users WHERE id = %s", (row[3],))
                user_result = cursor.fetchone()
                if user_result:
                    username = user_result[0]
            
            result.append({
                "table_name": row[0] or "unknown",
                "record_id": row[1] or 0,
                "action_type": row[2] or "UNKNOWN",
                "username": username,
                "user_role": row[4] or "user",
                "module_name": row[5] or "unknown",
                "impact_level": row[6] or "LOW",
                "changed_at": row[7].isoformat() if row[7] else None,
                "changes": changes
            })
        
        return {
            "total": total,
            "data": result
        }
        
    except Exception as e:
        print(f"Error in audit logs: {e}")
        return {"total": 0, "data": []}
    finally:
        release_connection(conn)
