package com.hotel.hotel_backend.service.price;

import com.hotel.hotel_backend.entity.BookingItem;
import com.hotel.hotel_backend.entity.BookingStatus;
import com.hotel.hotel_backend.entity.PriceFeedback;
import com.hotel.hotel_backend.entity.PricingModel;
import com.hotel.hotel_backend.entity.Room;
import com.hotel.hotel_backend.repository.BookingItemRepository;
import com.hotel.hotel_backend.repository.PriceFeedbackRepository;
import com.hotel.hotel_backend.repository.PricingModelRepository;
import com.hotel.hotel_backend.repository.RoomRepository;
import com.hotel.hotel_backend.service.search.HolidayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.DoubleSummaryStatistics;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;

@Service
@RequiredArgsConstructor
@Slf4j
public class
ModelTrainingService {

    private static final int MIN_FEEDBACK   = 5;
    private static final int HISTORY_DAYS   = 90;
    private static final int OCC_WEEKS      = 8;
    private static final int MIN_OCC_POINTS = 3;

    private final PricingModelRepository  modelRepository;
    private final PriceFeedbackRepository feedbackRepository;
    private final BookingItemRepository   bookingItemRepository;
    private final RoomRepository          roomRepository;
    private final HolidayService          holidayService;

    // ── Scheduled training ───────────────────────────────────────────────────

    @Scheduled(cron = "0 0 2 * * *")
    public void trainAllRooms() {
        log.info("[AI Training] Bắt đầu huấn luyện nightly...");
        List<Room> rooms = roomRepository.findAll();
        int trained = 0;
        for (Room room : rooms) {
            try {
                if (trainForRoom(room.getId())) trained++;
            } catch (Exception e) {
                log.error("[AI Training] Lỗi phòng {}: {}", room.getId(), e.getMessage());
            }
        }
        log.info("[AI Training] Hoàn thành: {}/{} phòng đã cập nhật", trained, rooms.size());
    }

    // ── Public API ───────────────────────────────────────────────────────────

    public boolean trainForRoom(Long roomId) {
        Room room = roomRepository.findById(roomId).orElse(null);
        if (room == null) return false;

        PricingModel model = modelRepository.findById(roomId)
                .orElseGet(() -> {
                    PricingModel m = new PricingModel();
                    m.setRoomId(roomId);
                    return m;
                });

        phase2HistoricalOccupancy(model, roomId, room.getQuantity());

        LocalDateTime since = LocalDateTime.now().minusDays(HISTORY_DAYS);
        List<PriceFeedback> feedbacks =
                feedbackRepository.findByRoomIdAndCreatedAtAfterOrderByCreatedAtDesc(roomId, since);

        if (feedbacks.size() < MIN_FEEDBACK) {
            model.setHasSufficientData(false);
            model.setLastTrainedAt(LocalDateTime.now());
            modelRepository.save(model);
            return false;
        }

        phase1FeedbackLearning(model, feedbacks);
        phase3LogisticRegression(model, feedbacks, room.getPrice());

        model.setHasSufficientData(true);
        model.setTrainingDataPoints(feedbacks.size());
        model.setTrainingRound(model.getTrainingRound() + 1);
        model.setLastTrainedAt(LocalDateTime.now());
        modelRepository.save(model);

        log.info("[AI Training] Phòng {} | round={} | acceptance={}% | agg={} | partnerAdj={}",
                roomId, model.getTrainingRound(),
                String.format("%.1f", model.getLastAcceptanceRate() * 100),
                String.format("%.3f", model.getPriceAggressiveness()),
                String.format("%.3f", model.getPartnerPriceAdjustment()));
        return true;
    }

    @Transactional(readOnly = true)
    public PricingModel getOrDefault(Long roomId) {
        return modelRepository.findById(roomId).orElseGet(() -> {
            PricingModel m = new PricingModel();
            m.setRoomId(roomId);
            return m;
        });
    }

    @Transactional(readOnly = true)
    public List<PricingModel> getAllModels() {
        return modelRepository.findAll();
    }

    // ── Pha 1: Học từ phản hồi partner ──────────────────────────────────────

    private void phase1FeedbackLearning(PricingModel model, List<PriceFeedback> feedbacks) {
        long accepted = feedbacks.stream()
                .filter(f -> f.getOutcome().startsWith("APPLIED"))
                .count();
        double acceptanceRate = (double) accepted / feedbacks.size();
        model.setLastAcceptanceRate(acceptanceRate);

        double agg = model.getPriceAggressiveness();
        if (acceptanceRate < 0.40) {
            agg *= 0.95;
        } else if (acceptanceRate > 0.75) {
            agg *= 1.03;
        }
        agg = Math.max(0.75, Math.min(1.25, agg));
        model.setPriceAggressiveness(agg);

        OptionalDouble avgRatio = feedbacks.stream()
                .filter(f -> f.getAppliedPrice() != null && f.getSuggestedPrice() > 0
                          && f.getOutcome().startsWith("APPLIED"))
                .mapToDouble(f -> (double) f.getAppliedPrice() / f.getSuggestedPrice())
                .average();

        if (avgRatio.isPresent()) {
            double observed = Math.max(0.88, Math.min(1.00, avgRatio.getAsDouble()));
            double newAdj = 0.70 * model.getPartnerPriceAdjustment() + 0.30 * observed;
            model.setPartnerPriceAdjustment(newAdj);
        }
    }

    // ── Pha 2: Học công suất lịch sử từ booking thực tế ────────────────────

    private void phase2HistoricalOccupancy(PricingModel model, Long roomId, int totalRooms) {
        if (totalRooms <= 0) return;

        LocalDate today    = LocalDate.now();
        LocalDate histFrom = today.minusWeeks(OCC_WEEKS);

        List<BookingItem> items = bookingItemRepository.findCoveringRange(
                roomId, histFrom, today);

        if (items.isEmpty()) return;

        Map<LocalDate, Integer> occupiedByDate = new HashMap<>();
        for (BookingItem bi : items) {
            LocalDate checkIn  = bi.getBooking().getCheckIn();
            LocalDate checkOut = bi.getBooking().getCheckOut();
            for (LocalDate d = checkIn; d.isBefore(checkOut); d = d.plusDays(1)) {
                if (!d.isBefore(histFrom) && d.isBefore(today)) {
                    occupiedByDate.merge(d, bi.getQuantity(), Integer::sum);
                }
            }
        }

        if (occupiedByDate.isEmpty()) return;

        DoubleSummaryStatistics weekdayStats = occupiedByDate.entrySet().stream()
                .filter(e -> isWeekday(e.getKey()))
                .mapToDouble(e -> Math.min(1.0, (double) e.getValue() / totalRooms))
                .summaryStatistics();

        DoubleSummaryStatistics weekendStats = occupiedByDate.entrySet().stream()
                .filter(e -> isWeekend(e.getKey()))
                .mapToDouble(e -> Math.min(1.0, (double) e.getValue() / totalRooms))
                .summaryStatistics();

        if (weekdayStats.getCount() >= MIN_OCC_POINTS)
            model.setAvgWeekdayOcc(weekdayStats.getAverage());
        if (weekendStats.getCount() >= MIN_OCC_POINTS)
            model.setAvgWeekendOcc(weekendStats.getAverage());

        if (model.getAvgWeekdayOcc() != null && model.getAvgWeekendOcc() != null) {
            double wkdOcc = model.getAvgWeekdayOcc();
            double wkdEnd = model.getAvgWeekendOcc();
            double observedLift = wkdEnd - wkdOcc;
            if (observedLift > 0 && observedLift < 0.6) {
                double learnedBoost = 0.60 * observedLift + 0.40 * 0.18;
                model.setWeekendBoost(Math.max(0.05, Math.min(0.40, learnedBoost)));
            }
            if (wkdOcc > 0 && wkdOcc < 0.85) {
                model.setWeekdayBoost(Math.max(0.02, Math.min(0.15, wkdOcc * 0.10)));
            }
        }
    }

    // ── Pha 3: Logistic Regression ───────────────────────────────────────────
    // Feature vector: [1, priceUplift, isWeekend, isHoliday, sin(dow), cos(dow)]
    // Loss: binary cross-entropy | Optimizer: gradient descent + L2 regularization

    private void phase3LogisticRegression(PricingModel model, List<PriceFeedback> feedbacks, long basePrice) {
        if (feedbacks.size() < MIN_FEEDBACK || basePrice <= 0) return;

        List<double[]> X = new ArrayList<>();
        List<Integer>  y = new ArrayList<>();
        for (PriceFeedback fb : feedbacks) {
            X.add(buildFeatures(fb.getSuggestedPrice(), basePrice, fb.getDate()));
            y.add(fb.getOutcome().startsWith("APPLIED") ? 1 : 0);
        }

        int    n      = X.size();
        double lr     = 0.05;
        double lambda = 0.01;
        int    epochs = 300;

        double[] w = { model.getLrW0(), model.getLrW1(), model.getLrW2(),
                       model.getLrW3(), model.getLrW4(), model.getLrW5() };

        double finalLoss = 1.0;
        for (int epoch = 0; epoch < epochs; epoch++) {
            double[] grad = new double[6];
            double   loss = 0.0;
            for (int i = 0; i < n; i++) {
                double p   = sigmoid(dot(w, X.get(i)));
                double err = p - y.get(i);
                loss += -y.get(i) * Math.log(p + 1e-9)
                        - (1 - y.get(i)) * Math.log(1 - p + 1e-9);
                for (int j = 0; j < 6; j++) grad[j] += err * X.get(i)[j];
            }
            for (int j = 0; j < 6; j++) {
                double reg = (j > 0) ? lambda * w[j] : 0.0;
                w[j] -= lr * (grad[j] / n + reg);
            }
            finalLoss = loss / n;
        }

        model.setLrW0(w[0]); model.setLrW1(w[1]); model.setLrW2(w[2]);
        model.setLrW3(w[3]); model.setLrW4(w[4]); model.setLrW5(w[5]);
        model.setLrTrainingSamples(n);
        model.setLrLastLoss(finalLoss);
        model.setLrReady(true);

        log.info("[LR] room={} | loss={}", model.getRoomId(), String.format("%.4f", finalLoss));
    }

    // ── Tối ưu giá bằng argmax(price × P(accept)) ───────────────────────────

    public Long optimizePrice(PricingModel model, long basePrice,
                              String dateIso, boolean isWeekend, boolean isHoliday) {
        if (!model.isLrReady() || basePrice <= 0) return null;

        double[] w = { model.getLrW0(), model.getLrW1(), model.getLrW2(),
                       model.getLrW3(), model.getLrW4(), model.getLrW5() };

        LocalDate date = LocalDate.parse(dateIso);
        int    dow    = date.getDayOfWeek().getValue();
        double dowSin = Math.sin(2 * Math.PI * dow / 7.0);
        double dowCos = Math.cos(2 * Math.PI * dow / 7.0);

        double bestExpRev = 0;
        Long   bestPrice  = null;

        for (int pct = 75; pct <= 150; pct += 5) {
            long   candidate   = Math.round((double) basePrice * pct / 100.0 / 1000) * 1000L;
            double priceUplift = (double) candidate / basePrice - 1.0;
            double[] x = { 1.0, priceUplift, isWeekend ? 1.0 : 0.0,
                           isHoliday ? 1.0 : 0.0, dowSin, dowCos };
            double pAccept = sigmoid(dot(w, x));
            double expRev  = candidate * pAccept;
            if (expRev > bestExpRev) { bestExpRev = expRev; bestPrice = candidate; }
        }
        return bestPrice;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private double[] buildFeatures(long suggestedPrice, long basePrice, String dateIso) {
        double priceUplift = (double) suggestedPrice / basePrice - 1.0;
        LocalDate date = LocalDate.parse(dateIso);
        int    dow    = date.getDayOfWeek().getValue();
        boolean wkend = dow >= 6;
        boolean hol   = holidayService.getHolidayMap().containsKey(dateIso);
        double  dowSin = Math.sin(2 * Math.PI * dow / 7.0);
        double  dowCos = Math.cos(2 * Math.PI * dow / 7.0);
        return new double[]{ 1.0, priceUplift, wkend ? 1.0 : 0.0,
                             hol ? 1.0 : 0.0, dowSin, dowCos };
    }

    private static double sigmoid(double z) { return 1.0 / (1.0 + Math.exp(-z)); }

    private static double dot(double[] w, double[] x) {
        double s = 0;
        for (int i = 0; i < w.length; i++) s += w[i] * x[i];
        return s;
    }

    private boolean isWeekday(LocalDate d) {
        DayOfWeek dow = d.getDayOfWeek();
        return dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY;
    }

    private boolean isWeekend(LocalDate d) {
        DayOfWeek dow = d.getDayOfWeek();
        return dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY;
    }
}