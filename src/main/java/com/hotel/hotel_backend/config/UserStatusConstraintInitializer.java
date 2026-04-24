package com.hotel.hotel_backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class UserStatusConstraintInitializer implements ApplicationRunner {

    private static final String USERS_STATUS_CHECK = "users_status_check";

    private final JdbcTemplate jdbcTemplate;

    public UserStatusConstraintInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!isPostgreSql()) {
            return;
        }

        // Only older local PostgreSQL schemas still need this one-time cleanup.
        if (!needsReconciliation()) {
            return;
        }

        jdbcTemplate.update("update users set status = 'ACTIVE' where status = 'PENDING_VERIFICATION'");
        jdbcTemplate.execute("alter table users drop constraint if exists " + USERS_STATUS_CHECK);
        jdbcTemplate.execute("""
                alter table users
                add constraint users_status_check
                check (status in ('ACTIVE', 'LOCKED', 'DISABLED'))
                """);

        log.info("Reconciled {} after removing PENDING_VERIFICATION", USERS_STATUS_CHECK);
    }

    private boolean isPostgreSql() {
        String databaseProductName = jdbcTemplate.execute(
                (ConnectionCallback<String>) connection -> connection.getMetaData().getDatabaseProductName()
        );
        return databaseProductName != null && "PostgreSQL".equalsIgnoreCase(databaseProductName);
    }

    private boolean needsReconciliation() {
        Boolean legacyRowsExist = jdbcTemplate.queryForObject(
                "select exists (select 1 from users where status = 'PENDING_VERIFICATION')",
                Boolean.class
        );
        Boolean legacyConstraintExists = jdbcTemplate.queryForObject(
                """
                select exists (
                    select 1
                    from pg_constraint con
                    join pg_class rel on rel.oid = con.conrelid
                    where rel.relname = 'users'
                      and con.conname = 'users_status_check'
                      and pg_get_constraintdef(con.oid) like '%PENDING_VERIFICATION%'
                )
                """,
                Boolean.class
        );
        return Boolean.TRUE.equals(legacyRowsExist) || Boolean.TRUE.equals(legacyConstraintExists);
    }
}
