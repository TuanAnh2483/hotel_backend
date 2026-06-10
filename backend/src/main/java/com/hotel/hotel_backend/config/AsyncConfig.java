package com.hotel.hotel_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Cấu hình async executor riêng cho Gemini API calls.
 *
 * Mục tiêu: tránh Gemini latency (có thể lên đến 30s) ảnh hưởng đến
 * main HTTP thread pool. Gemini calls chạy trên thread pool riêng với
 * queue giới hạn — nếu queue đầy, fallback rule-based được kích hoạt
 * thay vì chặn thêm thread.
 */
@Configuration
public class AsyncConfig {

    @Bean(name = "geminiExecutor")
    public Executor geminiExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(20);
        executor.setThreadNamePrefix("gemini-");
        executor.setKeepAliveSeconds(60);
        // CallerRunsPolicy: nếu queue đầy, task chạy trên thread gọi
        // (tức là HTTP thread) thay vì throw exception — graceful degradation.
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
