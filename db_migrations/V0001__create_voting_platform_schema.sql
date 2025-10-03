-- Create users table with roles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'user')),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create polls table
CREATE TABLE polls (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create poll options table
CREATE TABLE poll_options (
    id SERIAL PRIMARY KEY,
    poll_id INTEGER REFERENCES polls(id),
    option_text VARCHAR(500) NOT NULL,
    votes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create votes table
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    poll_id INTEGER REFERENCES polls(id),
    option_id INTEGER REFERENCES poll_options(id),
    user_id INTEGER REFERENCES users(id),
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, user_id)
);

-- Insert owner user
INSERT INTO users (email, name, role) VALUES 
('snovi6423@gmail.com', 'Owner', 'owner');

-- Create sample polls
INSERT INTO polls (title, description, created_by, status) VALUES 
('Любимый язык программирования?', 'Выберите ваш любимый язык для веб-разработки', 1, 'active'),
('Лучшее время для встреч команды?', 'Когда вам удобнее проводить командные встречи?', 1, 'active'),
('Новая функция платформы', 'Какую функцию добавить в первую очередь?', 1, 'active');

-- Insert poll options for first poll
INSERT INTO poll_options (poll_id, option_text, votes_count) VALUES 
(1, 'TypeScript', 45),
(1, 'Python', 38),
(1, 'JavaScript', 52),
(1, 'Go', 23);

-- Insert poll options for second poll
INSERT INTO poll_options (poll_id, option_text, votes_count) VALUES 
(2, 'Утро (9:00-11:00)', 28),
(2, 'День (14:00-16:00)', 42),
(2, 'Вечер (18:00-20:00)', 19);

-- Insert poll options for third poll
INSERT INTO poll_options (poll_id, option_text, votes_count) VALUES 
(3, 'Экспорт результатов в Excel', 31),
(3, 'Анонимное голосование', 47),
(3, 'Голосование с комментариями', 25),
(3, 'Автоматическое закрытие голосований', 18);

-- Create indexes for performance
CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);