CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO items (name, description) VALUES
    ('Sample Item 1', 'This is a demo item created on init'),
    ('Sample Item 2', 'Another demo item for testing'),
    ('Sample Item 3', 'Third item to show the list works');
