-- 🧾 WALLET TABLE
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD', 
    balance NUMERIC(18, 4) NOT NULL DEFAULT 0, 
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trigger to update updated_at on wallet changes
CREATE OR REPLACE FUNCTION update_wallet_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_updated_at();

-- 📜 TRANSACTION TABLE (ledger-style)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0), -- positive amounts only
    balance_snapshot NUMERIC(18, 4) NOT NULL, -- post-transaction balance
    reference_id VARCHAR(100), -- Optional: to link to external system, with reasonable length
    performed_by UUID NOT NULL, -- from JWT
    role VARCHAR(50) NOT NULL,
    metadata JSONB, -- for extensibility: notes, origin, tags
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 📌 INDEX for fast lookup by wallet + recent transactions
CREATE INDEX idx_transactions_wallet_created_at
    ON transactions (wallet_id, created_at DESC);