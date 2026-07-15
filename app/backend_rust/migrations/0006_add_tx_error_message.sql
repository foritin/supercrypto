-- 0006: Add error_message column to transaction_audit
-- Frontend updateTransactionStatus sends effective_gas_price and error_message;
-- gas_price column already exists for effective_gas_price, but error_message is new.

ALTER TABLE transaction_audit ADD COLUMN error_message TEXT;
