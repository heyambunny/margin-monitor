from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.dashboard import router as dashboard_router
from backend.routes.auth import router as auth_router
from backend.routes.projection import router as projection_router
from backend.routes.billing import router as billing_router
from backend.routes.reports import router as reports_router
from backend.routes.billed import router as billed_router
from backend.routes.edit_projection import router as edit_projection_router
from backend.routes.finance import router as finance_router
from backend.routes.audit import router as audit_router
from backend.routes.client_access import router as client_access_router
from backend.routes.bulk_upload import router as bulk_router
from backend.routes.overview import router as overview_router
from backend.routes.email import router as email_router
from backend.routes.dropdowns import router as dropdowns_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.0.42:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(projection_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(billed_router, prefix="/api")
app.include_router(edit_projection_router, prefix="/api")
app.include_router(finance_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(client_access_router, prefix="/api")
app.include_router(bulk_router, prefix="/api")
app.include_router(overview_router, prefix="/api")
app.include_router(email_router, prefix="/api")
app.include_router(dropdowns_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Margin Monitor API is running"}
