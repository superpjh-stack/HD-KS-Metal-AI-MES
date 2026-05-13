-- Keycloak 전용 DB 생성 (Keycloak이 같은 PostgreSQL 인스턴스를 공유)
CREATE DATABASE keycloak
  WITH OWNER = mes_app_user
  ENCODING = 'UTF8'
  LC_COLLATE = 'C'
  LC_CTYPE = 'C'
  TEMPLATE = template0;
