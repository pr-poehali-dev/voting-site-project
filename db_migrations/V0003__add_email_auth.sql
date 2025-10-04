-- Добавляем поле email в таблицу users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Создаем уникальный индекс для email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Обновляем существующего владельца
UPDATE users 
SET email = 'snovi6423@gmail.com', 
    email_verified = true 
WHERE phone = '+79999999999';
