-- =============================================================================
-- V1__initial_schema.sql
-- Schema khởi tạo cho VLU Hotel Hub
--
-- Lưu ý triển khai:
--   - Với DB đã tồn tại: Flyway baseline-on-migrate=true sẽ đánh dấu V1 là
--     đã áp dụng mà không thực thi — schema hiện tại được giữ nguyên.
--   - Với DB mới (Docker fresh start): script này tạo toàn bộ schema.
-- =============================================================================

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
    id                BIGSERIAL    PRIMARY KEY,
    user_type         VARCHAR(20)  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    email             VARCHAR(255) NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMPTZ,
    token_version     BIGINT       NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ  NOT NULL,
    updated_at        TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uk_users_email UNIQUE (email)
);

CREATE TABLE user_profiles (
    id                    BIGSERIAL    PRIMARY KEY,
    user_id               BIGINT       NOT NULL,
    full_name             VARCHAR(120),
    contact_email         VARCHAR(255),
    phone                 VARCHAR(30),
    address               VARCHAR(255),
    date_of_birth         DATE,
    bio                   VARCHAR(2000),
    avatar_url            VARCHAR(2000),
    brand_name            VARCHAR(160),
    tax_code              VARCHAR(50),
    representative_name   VARCHAR(120),
    business_type         VARCHAR(120),
    founded_date          DATE,
    website               VARCHAR(255),
    login_alert_enabled   BOOLEAN      NOT NULL DEFAULT TRUE,
    booking_update_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
    password_changed_at   TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL,
    updated_at            TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uk_user_profiles_user_id UNIQUE (user_id),
    CONSTRAINT fk_user_profiles_user    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE refresh_tokens (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_refresh_tokens_hash  UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE email_verification_tokens (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_email_verification_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_email_verification_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE password_reset_tokens (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    token      VARCHAR(120) NOT NULL,
    expires_at TIMESTAMPTZ  NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uk_password_reset_token_value UNIQUE (token),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ============================================================
-- HOTELS & ROOMS
-- ============================================================

CREATE TABLE hotels (
    id                  BIGSERIAL    PRIMARY KEY,
    owner_id            BIGINT       NOT NULL,
    name                VARCHAR(255) NOT NULL,
    address             VARCHAR(500),
    province            VARCHAR(255),
    district            VARCHAR(255),
    description         TEXT,
    hotel_type          VARCHAR(255) NOT NULL DEFAULT 'HOTEL',
    booking_mode        VARCHAR(255) NOT NULL DEFAULT 'BY_ROOM',
    cover_image_url     VARCHAR(1000),
    rating_avg          NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count        INTEGER      NOT NULL DEFAULT 0,
    cancellation_policy VARCHAR(255) NOT NULL DEFAULT 'MODERATE',
    status              VARCHAR(255)           DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ,
    CONSTRAINT fk_hotels_owner FOREIGN KEY (owner_id) REFERENCES users (id)
);

CREATE TABLE hotel_amenities (
    hotel_id BIGINT       NOT NULL,
    amenity  VARCHAR(255) NOT NULL,
    CONSTRAINT fk_hotel_amenities_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id)
);

CREATE TABLE hotel_custom_amenities (
    hotel_id BIGINT      NOT NULL,
    amenity  VARCHAR(100) NOT NULL,
    CONSTRAINT fk_hotel_custom_amenities_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id)
);

CREATE TABLE hotel_images (
    hotel_id   BIGINT        NOT NULL,
    image_url  VARCHAR(1000) NOT NULL,
    sort_order INTEGER       NOT NULL,
    CONSTRAINT fk_hotel_images_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id)
);

CREATE TABLE rooms (
    id              BIGSERIAL    PRIMARY KEY,
    hotel_id        BIGINT       NOT NULL,
    name            VARCHAR(255) NOT NULL,
    price           BIGINT       NOT NULL,
    capacity        INTEGER      NOT NULL,
    quantity        INTEGER      NOT NULL,
    room_category   VARCHAR(255) NOT NULL DEFAULT 'STANDARD',
    bed_type        VARCHAR(255) NOT NULL DEFAULT 'DOUBLE',
    description     TEXT,
    cover_image_url VARCHAR(1000),
    status          VARCHAR(255) NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    CONSTRAINT fk_rooms_hotel FOREIGN KEY (hotel_id) REFERENCES hotels (id)
);

CREATE TABLE room_amenities (
    room_id BIGINT       NOT NULL,
    amenity VARCHAR(255) NOT NULL,
    CONSTRAINT fk_room_amenities_room FOREIGN KEY (room_id) REFERENCES rooms (id)
);

CREATE TABLE room_custom_amenities (
    room_id BIGINT      NOT NULL,
    amenity VARCHAR(100) NOT NULL,
    CONSTRAINT fk_room_custom_amenities_room FOREIGN KEY (room_id) REFERENCES rooms (id)
);

CREATE TABLE room_images (
    room_id    BIGINT      NOT NULL,
    image_url  VARCHAR(255) NOT NULL,
    sort_order INTEGER      NOT NULL,
    CONSTRAINT fk_room_images_room FOREIGN KEY (room_id) REFERENCES rooms (id)
);

CREATE TABLE room_units (
    id              BIGSERIAL    PRIMARY KEY,
    room_id         BIGINT       NOT NULL,
    room_number     VARCHAR(20),
    floor           INTEGER,
    status          VARCHAR(20)  NOT NULL DEFAULT 'AVAILABLE',
    notes           VARCHAR(500),
    guest_name      VARCHAR(200),
    cover_image_url VARCHAR(1000),
    auto_generated  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    CONSTRAINT uq_room_unit_number UNIQUE (room_id, room_number),
    CONSTRAINT fk_room_units_room  FOREIGN KEY (room_id) REFERENCES rooms (id)
);

-- ============================================================
-- PRICING & INVENTORY
-- ============================================================

CREATE TABLE daily_rates (
    room_id      BIGINT       NOT NULL,
    date         DATE         NOT NULL,
    price        BIGINT       NOT NULL,
    min_stay     INTEGER,
    is_closed    BOOLEAN      NOT NULL DEFAULT FALSE,
    close_reason VARCHAR(255),
    PRIMARY KEY (room_id, date),
    CONSTRAINT fk_daily_rates_room FOREIGN KEY (room_id) REFERENCES rooms (id)
);

CREATE TABLE daily_inventory (
    room_id         BIGINT  NOT NULL,
    date            DATE    NOT NULL,
    available_rooms INTEGER NOT NULL,
    blocked_rooms   INTEGER NOT NULL,
    version         INTEGER,
    PRIMARY KEY (room_id, date),
    CONSTRAINT fk_daily_inventory_room FOREIGN KEY (room_id) REFERENCES rooms (id)
);

-- Mô hình AI pricing mỗi phòng — học từ lịch sử booking + phản hồi partner
CREATE TABLE pricing_model (
    room_id                  BIGINT           PRIMARY KEY,
    weekday_boost            DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    weekend_boost            DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    minor_holiday_boost      DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    major_holiday_boost      DOUBLE PRECISION NOT NULL DEFAULT 0.55,
    price_aggressiveness     DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    partner_price_adjustment DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    avg_weekday_occ          DOUBLE PRECISION,
    avg_weekend_occ          DOUBLE PRECISION,
    training_data_points     INTEGER          NOT NULL DEFAULT 0,
    last_acceptance_rate     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    training_round           INTEGER          NOT NULL DEFAULT 0,
    last_trained_at          TIMESTAMP,
    has_sufficient_data      BOOLEAN          NOT NULL DEFAULT FALSE,
    -- Logistic Regression weights: P(partner chấp nhận giá)
    lr_w0                    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    lr_w1                    DOUBLE PRECISION NOT NULL DEFAULT -2.0,
    lr_w2                    DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    lr_w3                    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    lr_w4                    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    lr_w5                    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    lr_w6                    DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    lr_w7                    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    lr_training_samples      INTEGER          NOT NULL DEFAULT 0,
    lr_last_loss             DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    lr_ready                 BOOLEAN          NOT NULL DEFAULT FALSE
);

-- Phản hồi của partner về giá AI đề xuất — dữ liệu huấn luyện model
CREATE TABLE price_feedback (
    id               BIGSERIAL        PRIMARY KEY,
    room_id          BIGINT           NOT NULL,
    date             VARCHAR(255)     NOT NULL,
    suggested_price  BIGINT           NOT NULL,
    applied_price    BIGINT,
    outcome          VARCHAR(255)     NOT NULL,
    partner_id       BIGINT           NOT NULL,
    competitor_price DOUBLE PRECISION,
    created_at       TIMESTAMP        NOT NULL
);

CREATE TABLE public_holiday (
    id   BIGSERIAL    PRIMARY KEY,
    date VARCHAR(10)  NOT NULL,
    name VARCHAR(120) NOT NULL,
    tier VARCHAR(10)  NOT NULL,
    CONSTRAINT uk_public_holiday_date UNIQUE (date)
);

-- ============================================================
-- BOOKINGS & PAYMENTS
-- ============================================================

CREATE TABLE bookings (
    id             BIGSERIAL    PRIMARY KEY,
    user_id        BIGINT       NOT NULL,
    check_in       DATE         NOT NULL,
    check_out      DATE         NOT NULL,
    total_price    BIGINT       NOT NULL,
    guests         INTEGER,
    status         VARCHAR(255) NOT NULL,
    created_at     TIMESTAMP,
    updated_at     TIMESTAMP,
    expires_at     TIMESTAMP,
    checked_in_at  TIMESTAMP,
    checked_out_at TIMESTAMP
);

CREATE TABLE booking_items (
    id           BIGSERIAL PRIMARY KEY,
    booking_id   BIGINT    NOT NULL,
    room_type_id BIGINT    NOT NULL,
    quantity     INTEGER   NOT NULL,
    price        BIGINT    NOT NULL,
    created_at   TIMESTAMP,
    updated_at   TIMESTAMP,
    CONSTRAINT fk_booking_items_booking FOREIGN KEY (booking_id)   REFERENCES bookings (id),
    CONSTRAINT fk_booking_items_room    FOREIGN KEY (room_type_id) REFERENCES rooms (id)
);

-- JoinColumn(name = "bookings") theo entity BookingContact
CREATE TABLE booking_contact (
    id         BIGSERIAL    PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    phone      VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    note       VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    bookings   BIGINT REFERENCES bookings (id)
);

CREATE TABLE payment_transactions (
    id                     BIGSERIAL    PRIMARY KEY,
    booking_id             BIGINT       NOT NULL,
    payment_method         VARCHAR(255) NOT NULL,
    status                 VARCHAR(255) NOT NULL,
    amount                 BIGINT       NOT NULL,
    provider_reference     VARCHAR(100) NOT NULL,
    failure_reason         TEXT,
    created_at             TIMESTAMP    NOT NULL,
    client_request_id      VARCHAR(100) NOT NULL,
    payment_code           VARCHAR(50),
    gateway                VARCHAR(50),
    gateway_transaction_id VARCHAR(100),
    gateway_reference_code VARCHAR(100),
    paid_at                TIMESTAMP,
    expires_at             TIMESTAMP,
    raw_payload            TEXT,
    CONSTRAINT uk_payment_transaction_booking_request     UNIQUE (booking_id, client_request_id),
    CONSTRAINT uk_payment_transaction_payment_code        UNIQUE (payment_code),
    CONSTRAINT uk_payment_transaction_gateway_transaction UNIQUE (gateway_transaction_id),
    CONSTRAINT fk_payment_transactions_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
    -- Chỉ cho phép enum values đã biết — giúp phát hiện lỗi sớm
    CONSTRAINT payment_transactions_payment_method_check
        CHECK (payment_method IN ('SIMULATED', 'VIETQR_SEPAY')),
    CONSTRAINT payment_transactions_status_check
        CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED'))
);

CREATE TABLE refund_requests (
    id            BIGSERIAL    PRIMARY KEY,
    booking_id    BIGINT       NOT NULL,
    user_id       BIGINT       NOT NULL,
    hotel_id      BIGINT       NOT NULL,
    amount        BIGINT       NOT NULL,
    reason        VARCHAR(255) NOT NULL,
    note          VARCHAR(2000),
    status        VARCHAR(30)  NOT NULL DEFAULT 'PENDING',
    reviewed_by   BIGINT,
    requested_at  TIMESTAMP    NOT NULL,
    reviewed_at   TIMESTAMP,
    transfer_note VARCHAR(500),
    CONSTRAINT uk_refund_requests_booking       UNIQUE (booking_id),
    CONSTRAINT fk_refund_requests_booking       FOREIGN KEY (booking_id)  REFERENCES bookings (id),
    CONSTRAINT fk_refund_requests_user          FOREIGN KEY (user_id)     REFERENCES users (id),
    CONSTRAINT fk_refund_requests_hotel         FOREIGN KEY (hotel_id)    REFERENCES hotels (id),
    CONSTRAINT fk_refund_requests_reviewed_by   FOREIGN KEY (reviewed_by) REFERENCES users (id)
);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE hotel_reviews (
    id                 BIGSERIAL    PRIMARY KEY,
    booking_id         BIGINT       NOT NULL,
    hotel_id           BIGINT       NOT NULL,
    user_id            BIGINT       NOT NULL,
    rating             INTEGER      NOT NULL,
    comment            VARCHAR(1000),
    partner_reply      VARCHAR(1000),
    partner_replied_at TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL,
    updated_at         TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uk_hotel_review_booking  UNIQUE (booking_id),
    CONSTRAINT fk_hotel_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
    CONSTRAINT fk_hotel_reviews_hotel   FOREIGN KEY (hotel_id)   REFERENCES hotels (id),
    CONSTRAINT fk_hotel_reviews_user    FOREIGN KEY (user_id)    REFERENCES users (id)
);

-- ============================================================
-- PARTNER ONBOARDING
-- ============================================================

CREATE TABLE partner_application (
    id                  BIGSERIAL    PRIMARY KEY,
    user_id             BIGINT       NOT NULL,
    email               VARCHAR(255) NOT NULL,
    business_name       VARCHAR(255),
    phone               VARCHAR(255),
    tax_code            VARCHAR(255),
    verification_status VARCHAR(255),
    status              VARCHAR(255),
    property_type       VARCHAR(255),
    reject_reason       TEXT,
    created_at          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ,
    CONSTRAINT fk_partner_application_user FOREIGN KEY (user_id) REFERENCES users (id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE user_notifications (
    id         BIGSERIAL     PRIMARY KEY,
    user_id    BIGINT        NOT NULL,
    type       VARCHAR(40)   NOT NULL,
    title      VARCHAR(180)  NOT NULL,
    message    VARCHAR(1000) NOT NULL,
    booking_id BIGINT,
    action_url VARCHAR(500),
    created_at TIMESTAMPTZ   NOT NULL,
    read_at    TIMESTAMPTZ,
    -- NULL booking_id được phép nên dùng partial unique để tránh nhiều NULL = khác nhau
    CONSTRAINT uk_user_notification_booking_type UNIQUE (user_id, type, booking_id)
);
