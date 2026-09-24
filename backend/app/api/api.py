from fastapi import APIRouter
from app.api.endpoints import uploads, planning, coaching, appraisal, review360, employees, export, auth, periods, aliases

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(periods.router)
api_router.include_router(aliases.router)
api_router.include_router(uploads.router)
api_router.include_router(planning.router)
api_router.include_router(coaching.router)
api_router.include_router(appraisal.router)
api_router.include_router(review360.router)
api_router.include_router(employees.router)
api_router.include_router(export.router)
