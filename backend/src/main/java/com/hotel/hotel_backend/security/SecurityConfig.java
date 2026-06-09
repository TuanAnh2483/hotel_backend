package com.hotel.hotel_backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.security.autoconfigure.web.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import java.util.List;

import org.springframework.security.config.Customizer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * SecurityConfig: nơi cấu hình Spring Security.
 *
 * Mục tiêu:
 * - Chỉ mở public đúng các route cần thiết
 * - /api/health : public
 * - còn lại: phải login (JWT)
 *
 * Và quan trọng:
 * - Chưa login / token sai => 401 JSON
 * - Login rồi nhưng không đủ quyền => 403 JSON
 */
@Configuration
@EnableMethodSecurity // để @PreAuthorize hoạt động
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;


    /**
     * PasswordEncoder: dùng để hash password lúc register và check lúc login.
     * BCrypt là chuẩn thông dụng.
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

//    //cấu hình deploy
//    ấu hình này cho phép:
//
//    Local frontend: http://localhost:5173
//    Cloudflare production: https://hotel-backend.pages.dev
//    Cloudflare preview deployments: https://<hash>.hotel-backend.pages.dev
    @Bean
    UrlBasedCorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOriginPatterns(allowedOrigins);

        config.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "PATCH",
                "OPTIONS"
        ));

        config.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin",
                "X-Requested-With"
        ));

        config.setExposedHeaders(List.of(
                "Authorization"
        ));

        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * SecurityFilterChain: pipeline security chạy trước controller.
     * - disable csrf vì API stateless
     * - stateless session vì dùng JWT
     * - config route nào public/route nào cần login
     * - add JwtAuthFilter vào trước UsernamePasswordAuthenticationFilter
     * - custom handler trả JSON cho 401/403
     */
    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthFilter jwtAuthFilter,
            RestAuthEntryPoint restAuthEntryPoint,
            RestAccessDeniedHandler restAccessDeniedHandler
    ) throws Exception {

        return http
                .cors(Customizer.withDefaults())
                // ❌ Không dùng CSRF vì API stateless
                .csrf(csrf -> csrf.disable())
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(formLogin -> formLogin.disable())
                // ❌ Không dùng session
                .sessionManagement(sm ->
                        sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // ✅ CẤU HÌNH ROUTE PUBLIC / ROUTE CẦN LOGIN
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(PathRequest.toStaticResources().atCommonLocations()).permitAll()
                        // public API
                        // Auth — v1 + backward-compat legacy paths
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/v1/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/v1/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/google", "/api/v1/auth/google").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register-partner", "/api/v1/auth/register-partner").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/refresh", "/api/v1/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/forgot-password", "/api/v1/auth/forgot-password").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/reset-password", "/api/v1/auth/reset-password").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/verify-email", "/api/v1/auth/verify-email").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/resend-verification", "/api/v1/auth/resend-verification").permitAll()
                        // Webhook SePay — v1 + legacy
                        .requestMatchers(HttpMethod.POST, "/api/payments/webhooks/sepay", "/api/v1/payments/webhooks/sepay").permitAll()
                        .requestMatchers(HttpMethod.GET, "/auth-demo.html").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health", "/api/v1/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/payments/**").permitAll()
                        // Hotels — v1 + legacy
                        .requestMatchers(HttpMethod.GET, "/api/hotels/search", "/api/v1/hotels/search").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/hotels/*", "/api/v1/hotels/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/hotels/*/reviews", "/api/v1/hotels/*/reviews").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/hotels/*/available-rooms", "/api/v1/hotels/*/available-rooms").permitAll()
                        // Catalog — v1 + legacy
                        .requestMatchers(HttpMethod.GET, "/api/catalog/**", "/api/v1/catalog/**").permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/",
                                "/index.html",
                                "/assets/**",
                                "/favicon.svg",
                                "/icons.svg",
                                "/login",
                                "/register",
                                "/forgot-password",
                                "/reset-password",
                                "/verify-email",
                                "/hotels",
                                "/hotels/*",
                                "/book",
                                "/profile",
                                "/become-partner",
                                "/unauthorized",
                                "/customer",
                                "/customer/**",
                                "/partner",
                                "/partner/**",
                                "/admin",
                                "/admin/**",
                                "/payment/**"
                        ).permitAll()
                        .requestMatchers("/error").permitAll()
                        // Swagger UI
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()

                        // còn lại bắt buộc phải login
                        .anyRequest().authenticated()
                )

                // ✅ XỬ LÝ 401 / 403
                .exceptionHandling(ex -> ex
                        // 401: chưa login / token sai
                        .authenticationEntryPoint(restAuthEntryPoint)

                        // 403: đã login nhưng thiếu quyền
                        .accessDeniedHandler(restAccessDeniedHandler)
                )

                // ✅ Add JWT filter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

                .build();
    }
}
