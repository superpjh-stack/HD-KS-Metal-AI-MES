from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Predict: Anomaly ──────────────────────────────────────────────

class AnomalyRequest(BaseModel):
    machineId: str
    channel:   str

class AnomalyResponse(BaseModel):
    machineId:  str
    channel:    str
    score:      float = Field(description="Reconstruction error")
    isAnomaly:  bool
    threshold:  float
    predictedAt: datetime


# ── Predict: Failure Probability ─────────────────────────────────

class FailureProbRequest(BaseModel):
    machineId: str

class ChannelFailureProb(BaseModel):
    channel:            str
    failureProbability: float = Field(ge=0.0, le=1.0)
    horizon:            str   = "24h"

class FailureProbResponse(BaseModel):
    machineId:   str
    channels:    list[ChannelFailureProb]
    predictedAt: datetime


# ── Predict: RUL ─────────────────────────────────────────────────

class RulRequest(BaseModel):
    machineId: str
    channel:   str

class RulResponse(BaseModel):
    machineId:   str
    channel:     str
    rulHours:    Optional[float] = Field(None, description="None if insufficient data")
    confidence:  float           = Field(ge=0.0, le=1.0)
    trend:       str             = Field(description="improving | stable | degrading")
    predictedAt: datetime


# ── Model Status ─────────────────────────────────────────────────

class ModelStatusItem(BaseModel):
    modelType:    str
    version:      str
    trainedAt:    Optional[datetime]
    trainSamples: int
    threshold:    Optional[float]
    isActive:     bool
    filePath:     Optional[str]


# ── Feature Vector (internal) ────────────────────────────────────

class ChannelFeatures(BaseModel):
    channel:    str
    mean_5m:    Optional[float]
    std_5m:     Optional[float]
    mean_60m:   Optional[float]
    std_60m:    Optional[float]
    min_60m:    Optional[float]
    max_60m:    Optional[float]
    trend_slope: Optional[float]

    def to_vector(self) -> list[float]:
        return [
            self.mean_5m    or 0.0,
            self.std_5m     or 0.0,
            self.mean_60m   or 0.0,
            self.std_60m    or 0.0,
            self.min_60m    or 0.0,
            self.max_60m    or 0.0,
            self.trend_slope or 0.0,
        ]
