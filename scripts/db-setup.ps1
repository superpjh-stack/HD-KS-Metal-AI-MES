# 로컬 PostgreSQL에 ks_mes 데이터베이스 생성
# 실행: .\scripts\db-setup.ps1

param(
  [string]$PgUser = "postgres",
  [string]$PgHost = "localhost",
  [string]$PgPort = "5432"
)

Write-Host "=== 광성정밀 AI-MES 로컬 DB 설정 ===" -ForegroundColor Cyan

# psql 경로 확인
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  Write-Host "ERROR: psql이 PATH에 없습니다." -ForegroundColor Red
  Write-Host "PostgreSQL 설치 후 PATH에 추가하세요."
  Write-Host "  예: C:\Program Files\PostgreSQL\16\bin"
  exit 1
}

Write-Host "PostgreSQL 위치: $($psql.Source)" -ForegroundColor Green

# ks_mes 데이터베이스 생성
Write-Host "`nks_mes 데이터베이스 생성 중..." -ForegroundColor Yellow
psql -U $PgUser -h $PgHost -p $PgPort -c "CREATE DATABASE ks_mes ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0;" 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "  (이미 존재하거나 권한 문제 — 계속 진행)" -ForegroundColor DarkYellow
}

# uuid-ossp 확장 활성화
Write-Host "uuid-ossp 확장 활성화..." -ForegroundColor Yellow
psql -U $PgUser -h $PgHost -p $PgPort -d ks_mes -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 2>&1

Write-Host "`n=== 완료 ===" -ForegroundColor Green
Write-Host "다음 명령으로 마이그레이션을 실행하세요:"
Write-Host "  pnpm db:migrate" -ForegroundColor Cyan
