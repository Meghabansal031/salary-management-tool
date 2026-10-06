"""HTTP layer for dropdown options."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.insights import MetaFilters
from app.services import meta as meta_service

router = APIRouter(prefix="/api/meta", tags=["meta"])
_db_dependency = Depends(get_db)


@router.get("/filters", response_model=MetaFilters)
def filters(db: Session = _db_dependency):
    return meta_service.filter_options(db)
