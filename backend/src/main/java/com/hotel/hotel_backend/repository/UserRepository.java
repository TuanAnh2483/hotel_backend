package com.hotel.hotel_backend.repository;

import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByUserType(UserType userType);

    @Query(value = "SELECT * FROM users ORDER BY id DESC", nativeQuery = true)
    List<User> findAllByOrderByIdDesc();

}
