package com.hotel.hotel_backend;

import com.hotel.hotel_backend.entity.DailyInventory;
import com.hotel.hotel_backend.repository.DailyInventoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * One-time startup repair: caps every DailyInventory row where availableRooms drifted
 * above Room.quantity back to max(blockedRooms, room.quantity).
 *
 * Idempotent — if no stale rows exist the run is a single COUNT query and exits immediately.
 * Safe to leave permanently; remove after confirming the first production deploy is clean.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InventoryRepairRunner implements ApplicationRunner {

    private static final int BATCH_SIZE = 500;

    private final DailyInventoryRepository dailyInventoryRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        long totalStale = dailyInventoryRepository.countStaleRows();
        if (totalStale == 0) {
            log.info("[InventoryRepair] No stale rows — skipping.");
            return;
        }

        log.warn("[InventoryRepair] {} stale DailyInventory row(s) detected. Starting repair…",
                totalStale);

        long repaired = 0;
        List<DailyInventory> batch;

        do {
            // Always fetch page 0: after saveAll() the fixed rows no longer satisfy
            // the WHERE clause, so the next query returns the next stale batch.
            batch = dailyInventoryRepository.findStaleRows(PageRequest.of(0, BATCH_SIZE));

            for (DailyInventory inv : batch) {
                // Invariant: availableRooms must not exceed room.quantity,
                // and must not fall below blockedRooms (would make net-available negative).
                int safeAvailable = Math.max(inv.getBlockedRooms(), inv.getRoom().getQuantity());
                inv.setAvailableRooms(safeAvailable);
            }

            if (!batch.isEmpty()) {
                dailyInventoryRepository.saveAll(batch);
            }

            repaired += batch.size();
        } while (batch.size() == BATCH_SIZE);

        log.info("[InventoryRepair] Done — {} row(s) repaired.", repaired);
    }
}
