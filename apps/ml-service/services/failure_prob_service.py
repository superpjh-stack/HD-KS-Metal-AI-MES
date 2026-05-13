"""
XGBoost 고장 확률 추론 서비스 (PDM-04).
"""
import json
import logging
import pickle
from pathlib import Path

import numpy as np

from config import settings

log = logging.getLogger(__name__)

_model = None


def load_model(version: str | None = None) -> bool:
    global _model

    if version is None:
        latest_path = Path(settings.MODEL_DIR) / "latest.json"
        if not latest_path.exists():
            return False
        version = json.loads(latest_path.read_text()).get("failure_prob")
        if not version:
            return False

    pkl = Path(settings.MODEL_DIR) / f"failure-prob_v{version}.pkl"
    if not pkl.exists():
        log.warning("FailureProb 모델 파일 없음: %s", pkl)
        return False

    with open(pkl, "rb") as f:
        _model = pickle.load(f)

    log.info("FailureProb v%s 로드 완료", version)
    return True


def predict(feature_vector: np.ndarray) -> float:
    """
    feature_vector: (6,) float32
    반환: 고장 확률 0.0~1.0 (모델 미로드 시 0.0)
    """
    if _model is None:
        return 0.0
    X = feature_vector.reshape(1, -1)
    prob = float(_model.predict_proba(X)[0, 1])
    return round(prob, 4)


def is_model_loaded() -> bool:
    return _model is not None
