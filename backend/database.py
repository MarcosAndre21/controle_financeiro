import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Carrega as variáveis de ambiente (do arquivo .env na sua máquina)
load_dotenv()

# Pega a URL do banco (No seu PC, ele lê o .env com a URL Externa. No Render, ele lê a configuração do painel com a URL Interna)
DATABASE_URL = os.getenv("postgresql://finance_db_wuj1_user:gr65JZ43VPSL6V8WkLy0iRnVHxH4XyFY@dpg-d9lq6dajnfac73b2caig-a.oregon-postgres.render.com/finance_db_wuj1")

# Segurança caso a URL não seja encontrada
if not DATABASE_URL:
    raise ValueError("A variável de ambiente DATABASE_URL não foi encontrada!")

# Correção obrigatória: SQLAlchemy exige 'postgresql://', mas o Render às vezes gera 'postgres://'
if DATABASE_URL.startswith("postgresql://finance_db_wuj1_user:gr65JZ43VPSL6V8WkLy0iRnVHxH4XyFY@dpg-d9lq6dajnfac73b2caig-a.oregon-postgres.render.com/finance_db_wuj1"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Cria o "motor" de conexão com o banco
engine = create_engine(DATABASE_URL)

# Configura a sessão
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe base para os modelos
Base = declarative_base()

# Função auxiliar de injeção de dependência
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()