# Manual Schema Update Checklist

## 1. Xac dinh thay doi

Phan loai thay doi:
- An toan voi `ddl-auto=update`: them bang moi, them cot `NULL`, them quan he moi khong bat buoc.
- Khong an toan: them cot `NOT NULL`, them unique, doi ten cot, doi ten bang, doi type, xoa cot, xoa bang.

Neu thay doi thuoc nhom khong an toan, phai chay SQL tay truoc.

## 2. Quy trinh cho DB dang co data

1. Backup DB.
2. Viet SQL tay.
3. Chay SQL tren DB.
4. Dat `JPA_DDL_AUTO=validate`.
5. Chay app va test API.
6. Neu on dinh, co the de local tro lai `JPA_DDL_AUTO=update`.

## 3. Mau SQL hay dung

### Them cot moi `NOT NULL`

```sql
ALTER TABLE your_table ADD COLUMN IF NOT EXISTS new_column VARCHAR(255) DEFAULT 'default_value';
UPDATE your_table SET new_column = 'default_value' WHERE new_column IS NULL;
ALTER TABLE your_table ALTER COLUMN new_column SET NOT NULL;
```

### Them cot so `NOT NULL`

```sql
ALTER TABLE your_table ADD COLUMN IF NOT EXISTS counter BIGINT DEFAULT 0;
UPDATE your_table SET counter = 0 WHERE counter IS NULL;
ALTER TABLE your_table ALTER COLUMN counter SET NOT NULL;
```

### Them unique index

```sql
UPDATE your_table
SET email = LOWER(TRIM(email))
WHERE email <> LOWER(TRIM(email));

CREATE UNIQUE INDEX IF NOT EXISTS uq_your_table_email_lower
ON your_table (LOWER(email));
```

### Doi ten cot

```sql
ALTER TABLE your_table RENAME COLUMN old_name TO new_name;
```

Khong nen trong cho Hibernate tu map lai ten cot cu -> moi.

## 4. Rule khi code entity

- Cot moi ma `nullable = false` nen co default o DB neu hop ly.
- Voi enum/trang thai/bo dem, uu tien them `@ColumnDefault`.
- Khong doi ten field/entity table tuy tien neu DB da co data ma chua co SQL tay di kem.
- SQL cu trong `docs/db` chi la tham khao, khong tu dong duoc ap dung.

## 5. Dot auth hien tai

Neu DB cu chua co 2 cot moi trong `users`, chay:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'ACTIVE';
UPDATE users SET status = 'ACTIVE' WHERE status IS NULL;
ALTER TABLE users ALTER COLUMN status SET NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version BIGINT DEFAULT 0;
UPDATE users SET token_version = 0 WHERE token_version IS NULL;
ALTER TABLE users ALTER COLUMN token_version SET NOT NULL;
```
