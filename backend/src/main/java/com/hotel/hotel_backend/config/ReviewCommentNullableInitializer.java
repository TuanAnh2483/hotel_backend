package com.hotel.hotel_backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ReviewCommentNullableInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    public ReviewCommentNullableInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!isPostgreSql() || !isCommentColumnRequired()) {
            return;
        }

        jdbcTemplate.execute("alter table hotel_reviews alter column comment drop not null");
        log.info("Reconciled hotel_reviews.comment to allow nullable review comments");
    }

    private boolean isPostgreSql() {
        String databaseProductName = jdbcTemplate.execute(
                (ConnectionCallback<String>) connection -> connection.getMetaData().getDatabaseProductName()
        );
        return databaseProductName != null && "PostgreSQL".equalsIgnoreCase(databaseProductName);
    }

    private boolean isCommentColumnRequired() {
        Boolean isRequired = jdbcTemplate.queryForObject(
                """
                select exists (
                    select 1
                    from information_schema.columns
                    where table_name = 'hotel_reviews'
                      and column_name = 'comment'
                      and is_nullable = 'NO'
                )
                """,
                Boolean.class
        );
        return Boolean.TRUE.equals(isRequired);
    }
}
