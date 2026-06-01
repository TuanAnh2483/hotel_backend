# Manual Database Workflow

Project nay khong dung Flyway. Nguon su that cua schema hien tai la entity JPA.

Quy uoc lam viec:
- DB moi, khong co data: cho Hibernate tao/cap nhat schema voi `JPA_DDL_AUTO=update`.
- DB dang co data: khong tin `ddl-auto=update` cho cac thay doi pha vo nhu them cot `NOT NULL`, doi ten cot, doi type, them unique index. Phai chay SQL tay truoc.
- Sau khi chay SQL tay, chay app voi `JPA_DDL_AUTO=validate` de kiem tra mapping.

File trong thu muc nay:
- `legacy-bootstrap-postgres.sql`: SQL cu de khoi tao schema tham khao. Khong duoc app tu dong chay.
- `manual-auth-hardening.sql`: SQL tay cho dot thay doi auth `users.status` va `users.token_version`.
- `manual-schema-update-checklist.md`: checklist de update schema an toan khi khong dung migration tool.

Khuyen nghi:
- Local dev: `JPA_DDL_AUTO=update`
- Staging/production: `JPA_DDL_AUTO=validate`
