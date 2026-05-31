-- =========================================
-- V1__init.sql (PostgreSQL)
-- Hotel Booking Marketplace MVP (v0.26)
-- =========================================

-- (Optional) extension for case-insensitive email
-- CREATE EXTENSION IF NOT EXISTS citext;

-- ---------- ENUM TYPES ----------
DO $$ BEGIN
CREATE TYPE user_type_enum AS ENUM ('CUSTOMER', 'PARTNER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE TYPE partner_role_enum AS ENUM ('OWNER', 'STAFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE TYPE booking_status_enum AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE TYPE payment_status_enum AS ENUM ('INIT', 'SUCCESS', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- CORE TABLES ----------

CREATE TABLE IF NOT EXISTS users (
                                     id              BIGSERIAL PRIMARY KEY,
                                     user_type       user_type_enum NOT NULL DEFAULT 'CUSTOMER',
                                     email           VARCHAR(255) NOT NULL ,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email)
    );

-- 1-1 profile table (PK = FK) => truly one-to-one
CREATE TABLE IF NOT EXISTS user_info (
                                         user_id     BIGINT PRIMARY KEY,
                                         name        VARCHAR(255),
    phone       VARCHAR(50),
    address     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_user_info_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Partner company/entity
CREATE TABLE IF NOT EXISTS partner_info (
    partner_id  BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    address     TEXT,
    phone       VARCHAR(50),
    status      VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

-- N-N users <-> partner_info with role
CREATE TABLE IF NOT EXISTS partner_users (
                                             partner_id    BIGINT NOT NULL,
                                             user_id       BIGINT NOT NULL,
                                             partner_role  partner_role_enum NOT NULL DEFAULT 'STAFF',
                                             created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (partner_id, user_id),
    CONSTRAINT fk_partner_users_partner
    FOREIGN KEY (partner_id) REFERENCES partner_info(partner_id) ON DELETE CASCADE,
    CONSTRAINT fk_partner_users_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Hotels
CREATE TABLE IF NOT EXISTS hotels (
                                      id            BIGSERIAL PRIMARY KEY,
                                      partner_id    BIGINT NOT NULL,
                                      name          VARCHAR(255) NOT NULL,
    address       TEXT,
    status        VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    extinfo       JSONB,
    rating_count  INT NOT NULL DEFAULT 0,
    rating_avg    NUMERIC(3,2) NOT NULL DEFAULT 0,
    province      VARCHAR(100),
    district      VARCHAR(100),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_hotels_partner
    FOREIGN KEY (partner_id) REFERENCES partner_info(partner_id) ON DELETE RESTRICT
    );

-- Room types (inventory sold by type)
CREATE TABLE IF NOT EXISTS room_type (
                                         id            BIGSERIAL PRIMARY KEY,
                                         hotel_id      BIGINT NOT NULL,
                                         name          VARCHAR(255) NOT NULL,
    code          VARCHAR(100),
    status        VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    bed_info      VARCHAR(255),
    max_adult     INT NOT NULL DEFAULT 2,
    max_children  INT NOT NULL DEFAULT 0,
    extinfo       JSONB,
    base_price    BIGINT NOT NULL DEFAULT 0,     -- VND integer
    image         TEXT,
    total_rooms   INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_room_type_hotel
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
    );

-- Daily rates (per room_type per date)
CREATE TABLE IF NOT EXISTS daily_rates (
                                           room_type_id  BIGINT NOT NULL,
                                           date          DATE NOT NULL,
                                           price         BIGINT NOT NULL,              -- VND integer
                                           min_stay      INT NOT NULL DEFAULT 1,
                                           is_closed     BOOLEAN NOT NULL DEFAULT FALSE,
                                           created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_type_id, date),
    CONSTRAINT fk_daily_rates_room_type
    FOREIGN KEY (room_type_id) REFERENCES room_type(id) ON DELETE CASCADE,
    CONSTRAINT ck_daily_rates_price_nonneg CHECK (price >= 0),
    CONSTRAINT ck_daily_rates_min_stay CHECK (min_stay >= 1)
    );

-- Daily inventory (per room_type per date)
CREATE TABLE IF NOT EXISTS daily_inventory (
                                               room_type_id     BIGINT NOT NULL,
                                               date             DATE NOT NULL,
                                               available_rooms  INT NOT NULL DEFAULT 0,
                                               blocked_rooms    INT NOT NULL DEFAULT 0,
                                               created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_type_id, date),
    CONSTRAINT fk_daily_inventory_room_type
    FOREIGN KEY (room_type_id) REFERENCES room_type(id) ON DELETE CASCADE,
    CONSTRAINT ck_inventory_nonneg CHECK (available_rooms >= 0 AND blocked_rooms >= 0)
    );

-- Bookings (customer orders)
CREATE TABLE IF NOT EXISTS bookings (
                                        id             BIGSERIAL PRIMARY KEY,
                                        hotel_id       BIGINT NOT NULL,
                                        customer_id    BIGINT NOT NULL,            -- FK -> users.id (NOT user_info)
                                        check_in_date  DATE NOT NULL,
                                        check_out_date DATE NOT NULL,
                                        booking_code   VARCHAR(50) NOT NULL,
    total_amount   BIGINT NOT NULL DEFAULT 0,  -- VND integer
    number_people  INT NOT NULL DEFAULT 1,
    cancel_reason  TEXT,
    cancelled_at   TIMESTAMPTZ,
    status         booking_status_enum NOT NULL DEFAULT 'PENDING_PAYMENT',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_bookings_hotel
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_customer
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_bookings_code UNIQUE (booking_code),
    CONSTRAINT ck_booking_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT ck_booking_people CHECK (number_people >= 1),
    CONSTRAINT ck_booking_amount_nonneg CHECK (total_amount >= 0)
    );

-- Booking items (lines)
CREATE TABLE IF NOT EXISTS booking_items (
                                             id           BIGSERIAL PRIMARY KEY,
                                             booking_id   BIGINT NOT NULL,
                                             room_type_id BIGINT NOT NULL,
                                             quantity     INT NOT NULL DEFAULT 1,
                                             unit_price   BIGINT NOT NULL DEFAULT 0,
                                             line_total   BIGINT NOT NULL DEFAULT 0,
                                             created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_booking_items_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_items_room_type
    FOREIGN KEY (room_type_id) REFERENCES room_type(id) ON DELETE RESTRICT,
    CONSTRAINT uq_booking_items_booking_room_type UNIQUE (booking_id, room_type_id),
    CONSTRAINT ck_booking_items_qty CHECK (quantity >= 1),
    CONSTRAINT ck_booking_items_prices CHECK (unit_price >= 0 AND line_total >= 0)
    );

-- Payments (MVP: one payment per booking)
CREATE TABLE IF NOT EXISTS payments (
                                        id              BIGSERIAL PRIMARY KEY,
                                        booking_id      BIGINT NOT NULL,
                                        method          VARCHAR(50) NOT NULL DEFAULT 'MOCK',
    status          payment_status_enum NOT NULL DEFAULT 'INIT',
    amount          BIGINT NOT NULL DEFAULT 0,
    paid_at         TIMESTAMPTZ,
    transaction_ref VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT uq_payments_booking UNIQUE (booking_id),
    CONSTRAINT ck_payments_amount_nonneg CHECK (amount >= 0)
    );

-- Reviews (MVP: one review per booking)
CREATE TABLE IF NOT EXISTS reviews (
                                       id          BIGSERIAL PRIMARY KEY,
                                       hotel_id    BIGINT NOT NULL,
                                       user_id     BIGINT NOT NULL,
                                       booking_id  BIGINT NOT NULL,
                                       rating      INT NOT NULL,
                                       comment     TEXT,
                                       created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_reviews_hotel
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reviews_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT uq_reviews_booking UNIQUE (booking_id),
    CONSTRAINT ck_reviews_rating CHECK (rating BETWEEN 1 AND 5)
    );

-- Audit log (optional but useful)
CREATE TABLE IF NOT EXISTS audit_log (
                                         id               BIGSERIAL PRIMARY KEY,
                                         actor_user_id    BIGINT,
                                         action           VARCHAR(100) NOT NULL,
    text_before_data JSONB,
    text_after_data  JSONB,
    entity_type      VARCHAR(100),
    entity_id        BIGINT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_audit_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

-- ---------- INDEXES (minimal for MVP) ----------
CREATE INDEX IF NOT EXISTS idx_hotels_location ON hotels (province, district);
CREATE INDEX IF NOT EXISTS idx_room_type_hotel_id ON room_type (hotel_id);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_created ON bookings (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_created ON bookings (hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created ON bookings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON booking_items (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_room_type_id ON booking_items (room_type_id);

CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments (paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_hotel_created ON reviews (hotel_id, created_at DESC);

-- Daily tables already have PK(room_type_id, date) which is a good index for queries by room_type+range.

-- Done.
