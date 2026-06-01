package com.hotel.hotel_backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class PaymentTransactionSchemaInitializer implements ApplicationRunner {

    private static final String PAYMENT_METHOD_CHECK = "payment_transactions_payment_method_check";
    private static final String PAYMENT_STATUS_CHECK = "payment_transactions_status_check";

    private final JdbcTemplate jdbcTemplate;

    public PaymentTransactionSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!isPostgreSql() || !paymentTransactionsTableExists()) {
            return;
        }

        if (columnExists("payment_code")) {
            jdbcTemplate.execute("alter table payment_transactions alter column payment_code type varchar(50)");
        }
        if (columnExists("gateway_transaction_id")) {
            jdbcTemplate.execute("alter table payment_transactions alter column gateway_transaction_id type varchar(100)");
        }
        if (columnExists("gateway_reference_code")) {
            jdbcTemplate.execute("alter table payment_transactions alter column gateway_reference_code type varchar(100)");
        }

        /*
         * Local PostgreSQL schema cũ được Hibernate tạo check constraint theo enum lúc
         * PaymentMethod chỉ có SIMULATED và PaymentTransactionStatus chưa có PENDING.
         * Khi thêm VietQR/SePay, constraint cũ sẽ chặn insert VIETQR_SEPAY/PENDING.
         */
        jdbcTemplate.execute("alter table payment_transactions drop constraint if exists " + PAYMENT_METHOD_CHECK);
        jdbcTemplate.execute("""
                alter table payment_transactions
                add constraint payment_transactions_payment_method_check
                check (payment_method in ('SIMULATED', 'VIETQR_SEPAY'))
                """);
        jdbcTemplate.execute("alter table payment_transactions drop constraint if exists " + PAYMENT_STATUS_CHECK);
        jdbcTemplate.execute("""
                alter table payment_transactions
                add constraint payment_transactions_status_check
                check (status in ('PENDING', 'SUCCESS', 'FAILED'))
                """);

        jdbcTemplate.execute("""
                create unique index if not exists uk_payment_transaction_payment_code
                on payment_transactions(payment_code)
                where payment_code is not null
                """);
        jdbcTemplate.execute("""
                create unique index if not exists uk_payment_transaction_gateway_transaction
                on payment_transactions(gateway_transaction_id)
                where gateway_transaction_id is not null
                """);

        log.info("Reconciled payment_transactions gateway columns/indexes");
    }

    private boolean isPostgreSql() {
        String databaseProductName = jdbcTemplate.execute(
                (ConnectionCallback<String>) connection -> connection.getMetaData().getDatabaseProductName()
        );
        return databaseProductName != null && "PostgreSQL".equalsIgnoreCase(databaseProductName);
    }

    private boolean paymentTransactionsTableExists() {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                select exists (
                    select 1
                    from information_schema.tables
                    where table_name = 'payment_transactions'
                )
                """,
                Boolean.class
        );
        return Boolean.TRUE.equals(exists);
    }

    private boolean columnExists(String columnName) {
        Boolean exists = jdbcTemplate.queryForObject(
                """
                select exists (
                    select 1
                    from information_schema.columns
                    where table_name = 'payment_transactions'
                      and column_name = ?
                )
                """,
                Boolean.class,
                columnName
        );
        return Boolean.TRUE.equals(exists);
    }
}
