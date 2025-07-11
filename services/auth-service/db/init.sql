CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, 
    description TEXT
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE jwt_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT,
    issued_at TIMESTAMP,
    expires_at TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE
);

-- Seed roles
INSERT INTO roles (name, description)
VALUES 
  ('user', 'Default role for new users'),
  ('admin', 'Administrator role'),
  ('user_admin', 'Handles User management'),
  ('finance_admin', 'Handles payments and wallets'),
  ('audit_admin', 'Can read logs and trace activity');

-- Seed super admin user
INSERT INTO users (id, email, password_hash, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'admin@zerotrust.io',
  '$2b$10$hzODBBpp.IN193g.fvrT4eeLfe7CI6qB/Sgj7B.MXD/uI/R6TtRJe', -- 'AdminPass123!'
  'active'
);

-- Assign admin roles to super admin
INSERT INTO user_roles (user_id, role_id)
SELECT '11111111-1111-1111-1111-111111111111', id
FROM roles
WHERE name IN ('admin', 'user_admin', 'finance_admin', 'audit_admin');
