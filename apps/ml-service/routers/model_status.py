import json
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from models.schemas import ModelStatusItem
from config import settings

router = APIRouter(prefix="/model", tags=["model"])

MODEL_TYPES = ["AUTOENCODER", "FAILURE_PROB", "RUL"]


def _load_latest_index() -> dict:
    path = Path(settings.MODEL_DIR) / "latest.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}


def _load_meta(model_type: str, version: str) -> dict:
    slug = model_type.lower().replace("_", "-")
    path = Path(settings.MODEL_DIR) / f"{slug}_v{version}.meta.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}


@router.get("/status", response_model=list[ModelStatusItem])
async def get_model_status() -> list[ModelStatusItem]:
    latest = _load_latest_index()
    result: list[ModelStatusItem] = []

    for mt in MODEL_TYPES:
        version = latest.get(mt.lower())
        if version:
            meta = _load_meta(mt, version)
            result.append(ModelStatusItem(
                modelType    =mt,
                version      =version,
                trainedAt    =meta.get("trainedAt"),
                trainSamples =meta.get("trainSamples", 0),
                threshold    =meta.get("threshold"),
                isActive     =True,
                filePath     =meta.get("filePath"),
            ))
        else:
            result.append(ModelStatusItem(
                modelType    =mt,
                version      ="none",
                trainedAt    =None,
                trainSamples =0,
                threshold    =None,
                isActive     =False,
                filePath     =None,
            ))

    return result
