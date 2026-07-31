import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# O override=False garante que o arquivo .env do GitHub NUNCA apague a variável do Render
load_dotenv(override=False)

# Puxa a variável de ambiente (do Render primeiro, ou do .env como plano B)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Trava de segurança para avisar se estiver realmente vazio
if not SQLALCHEMY_DATABASE_URL:
    print("Variaveis disponiveis no sistema:", list(os.environ.keys()))
    raise ValueError("A variável de ambiente DATABASE_URL não foi encontrada pelo Python!")

# Correção obrigatória: O SQLAlchemy exige que a URL comece com postgresql://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()