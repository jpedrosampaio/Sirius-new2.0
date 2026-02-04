# Guia de Migração: MongoDB para MySQL (Hostgator)

## Arquivos Criados

1. **`database.py`** - Modelos SQLAlchemy para MySQL (todas as tabelas)
2. **`convert_to_mysql.py`** - Script auxiliar de conversão
3. **`.env`** - Configurações do MySQL atualizadas

## Configuração do MySQL na Hostgator

### 1. Criar o banco de dados no cPanel da Hostgator

```
Nome do banco: dani4743_sirius
Usuário: sirius  
Senha: Xp@zend123
```

### 2. Arquivo .env para produção

```env
# MySQL Configuration
MYSQL_USER=sirius
MYSQL_PASSWORD=Xp@zend123
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=dani4743_sirius

# Google Gemini API
GOOGLE_GEMINI_API_KEY=AIzaSyCmArl1lZZ2_Zje8ERnx9TVcxMAp_QnUyI
```

### 3. Dependências Python (requirements.txt)

```
fastapi
uvicorn
sqlalchemy
aiomysql
pymysql
asyncmy
bcrypt
python-dotenv
google-genai
aiofiles
pydantic[email]
python-multipart
```

### 4. Tabelas que serão criadas automaticamente

- users
- user_sessions
- tasks
- task_instances
- habits
- habit_logs
- transactions
- budgets
- goals
- challenges
- achievements
- chat_messages
- reports
- workout_plans
- workout_logs
- notifications
- notification_logs
- body_measurements
- daily_workout_status
- credit_cards
- invoices
- projections

## Opções de Migração

### Opção 1: Migração Completa (Recomendada para produção limpa)

Como você está começando do zero na Hostgator, não precisa migrar dados.
O arquivo `server_mysql.py` será criado com as queries convertidas.

### Opção 2: Usar MongoDB Atlas (Mais simples)

Se preferir manter MongoDB, você pode usar o MongoDB Atlas (gratuito):
1. Crie uma conta em https://www.mongodb.com/atlas
2. Crie um cluster gratuito
3. Atualize MONGO_URL no .env com a connection string do Atlas

## Próximos Passos

1. **Se quiser continuar com MySQL**: Me avise e eu continuo a conversão das queries
2. **Se preferir MongoDB Atlas**: É mais rápido e não precisa alterar o código

## Observação de Segurança

⚠️ **IMPORTANTE**: Altere a senha do banco de dados depois da configuração, pois ela foi compartilhada aqui no chat.
