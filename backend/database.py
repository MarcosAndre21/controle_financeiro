# Arquivo: backend/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import urllib.parse # Importação necessária para lidar com senhas complexas

# 1. Defina seus dados de acesso separadamente
USUARIO = "postgres"
SENHA = "VrPost@Server" # Pode colocar sua senha real, mesmo com @
SERVIDOR = "localhost:8745"
BANCO_DE_DADOS = "finance_db"

# 2. Codifica a senha para evitar erros com caracteres especiais
senha_codificada = urllib.parse.quote_plus(SENHA)

# 3. Monta a URL de forma segura
SQLALCHEMY_DATABASE_URL = f"postgresql://{USUARIO}:{senha_codificada}@{SERVIDOR}/{BANCO_DE_DADOS}"

# Cria o "motor" de conexão com o banco
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Configura a sessão que será usada para realizar as consultas
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe base que usaremos para criar os modelos das tabelas
Base = declarative_base()

# Função auxiliar para injetar o banco de dados nas rotas da API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()