-- Parents no longer need email (QR registration only needs name)
ALTER TABLE parents ALTER COLUMN email DROP NOT NULL;
