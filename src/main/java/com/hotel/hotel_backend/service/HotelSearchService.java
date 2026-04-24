package com.hotel.hotel_backend.service;


import com.hotel.hotel_backend.dto.response.HotelSearchPageResponse;
import com.hotel.hotel_backend.dto.response.HotelSearchItemResponse;
import com.hotel.hotel_backend.entity.Hotel;
import com.hotel.hotel_backend.mapper.HotelSearchMapper;
import com.hotel.hotel_backend.service.search.HotelAvailabilityService;
import com.hotel.hotel_backend.service.search.HotelCandidateQueryService;
import com.hotel.hotel_backend.service.search.HotelSearchCriteria;
import com.hotel.hotel_backend.service.search.HotelSearchSort;
import com.hotel.hotel_backend.service.search.HotelStayCriteria;
import com.hotel.hotel_backend.service.search.HotelSearchUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HotelSearchService implements HotelSearchUseCase {

    private final HotelCandidateQueryService hotelCandidateQueryService;
    private final HotelAvailabilityService hotelAvailabilityService;
    private final HotelSearchMapper hotelSearchMapper;


    @Override
    public HotelSearchPageResponse search(HotelSearchCriteria criteria) {
        HotelStayCriteria stayCriteria = new HotelStayCriteria(
                criteria.checkIn(),
                criteria.checkOut(),
                criteria.adults(),
                criteria.rooms(),
                criteria.roomCategories(),
                criteria.bedTypes(),
                criteria.roomAmenities()
        );

        List<Hotel> candidateHotels = hotelCandidateQueryService.findCandidates(criteria);
        Map<Long, Long> minPricesByHotelId = hotelAvailabilityService.findAvailableHotelMinPrices(candidateHotels, stayCriteria);

        List<HotelSearchItemResponse> sortedItems = candidateHotels.stream()
                .filter(hotel -> minPricesByHotelId.containsKey(hotel.getId()))
                .map(hotel -> hotelSearchMapper.toItem(
                        hotel,minPricesByHotelId.get(hotel.getId())
                ))
                .toList();

        sortedItems = sortItems(sortedItems, criteria.sort());

        long totalItems = sortedItems.size();
        int totalPages = totalItems == 0 ? 0 : (int) Math.ceil((double) totalItems / criteria.size());
        int fromIndex = Math.min((criteria.page() - 1) * criteria.size(), sortedItems.size());
        int toIndex = Math.min(fromIndex + criteria.size(), sortedItems.size());

        List<HotelSearchItemResponse> pageItems = sortedItems.subList(fromIndex, toIndex);

        return new HotelSearchPageResponse(
                pageItems,
                criteria.page(),
                criteria.size(),
                totalItems,
                totalPages,
                criteria.page() < totalPages,
                criteria.sort().value()
        );
    }

    private List<HotelSearchItemResponse> sortItems(List<HotelSearchItemResponse> items, HotelSearchSort sort) {
        // Sort hien tai nen di theo comparator don gian hay can ranking list-level cho recommended?
        if (sort == HotelSearchSort.RECOMMENDED) {
            return sortByRecommended(items);
        }

        return items.stream()
                .sorted(buildSortComparator(sort))
                .toList();
    }

    private Comparator<HotelSearchItemResponse> buildSortComparator(HotelSearchSort sort) {
        // Voi cac sort co quy tac don gian, comparator nao phan anh dung contract product?
        return switch (sort) {
            case PRICE_ASC -> Comparator
                    .comparing(HotelSearchItemResponse::minPrice, Comparator.nullsLast(Long::compareTo))
                    .thenComparing(HotelSearchItemResponse::hotelId);
            case PRICE_DESC -> Comparator
                    .comparing(HotelSearchItemResponse::minPrice, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(HotelSearchItemResponse::hotelId);
            case RATING_DESC -> Comparator
                    .comparing(HotelSearchItemResponse::ratingAvg, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(HotelSearchItemResponse::hotelId);
            case RECOMMENDED -> throw new IllegalArgumentException("Recommended sort requires list-level scoring");
        };
    }

    private List<HotelSearchItemResponse> sortByRecommended(List<HotelSearchItemResponse> items) {
        // Lam sao xep hang hotel theo cach can bang chat luong, do tin cay review va gia?
        if (items.isEmpty()) {
            return List.of();
        }

        long cheapestPrice = items.stream()
                .map(HotelSearchItemResponse::minPrice)
                .filter(Objects::nonNull)  // loại bỏ giá null
                .min(Long::compareTo)   // lấy giá lớn nhất
                .orElse(0L);   //nnếu không có giá nào → mặc định là 0
        long mostExpensivePrice = items.stream()
                .map(HotelSearchItemResponse::minPrice)
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(cheapestPrice);

        // Recommended uu tien hotel co chat luong review tot, co do tin cay review,
        // va van giu gia o muc canh tranh trong tap ket qua hien tai.
        return items.stream()
                .sorted(
                        //Score cao → trước
                        Comparator.comparingDouble(
                                        (HotelSearchItemResponse item) -> recommendedScore(item, cheapestPrice, mostExpensivePrice)
                                )
                                .reversed()
                        //Nếu score bằng nhau → rating cao → trước
                                .thenComparing(
                                        HotelSearchItemResponse::ratingAvg,
                                        Comparator.nullsLast(Comparator.reverseOrder())
                                        //giá thấp → đứnng trước
                                       // giá null → xuống cuối
                                )

                                //giữ thứ tự ổn định
                                //tránh random order khi tất cả bằng nhau
                                .thenComparing(HotelSearchItemResponse::minPrice, Comparator.nullsLast(Long::compareTo))
                                .thenComparing(HotelSearchItemResponse::hotelId)
                )
                .toList();
    }

    private double recommendedScore(
            HotelSearchItemResponse item,
            long cheapestPrice,
            long mostExpensivePrice
    ) {
        // Moi hotel nen duoc cham diem tong hop the nao de ra thu tu recommended?
        double ratingScore = normalizeRating(item.ratingAvg());
        double reviewConfidenceScore = normalizeReviewConfidence(item.ratingCount());
        double priceScore = normalizePrice(item.minPrice(), cheapestPrice, mostExpensivePrice);

        return (ratingScore * 0.55)
                + (reviewConfidenceScore * 0.15)
                + (priceScore * 0.30);
    }

    private double normalizeRating(BigDecimal ratingAvg) {
        // Rating trung binh 0..5 can dua ve cung thang diem nao de co the cong voi cac signal khac?
        if (ratingAvg == null) {
            return 0.0;
        }

        return Math.max(0.0, Math.min(1.0, ratingAvg.doubleValue() / 5.0));
    }

    private double normalizeReviewConfidence(Integer ratingCount) {
        // So luong review can duoc quy doi ra sao de biet rating nay dang dang tin toi muc nao?
        if (ratingCount == null || ratingCount <= 0) {
            return 0.0;
        }

        return 1.0 - Math.exp(-ratingCount / 10.0);
    }
    //
    private double normalizePrice(Long minPrice, long cheapestPrice, long mostExpensivePrice) {
        //Minprice; giá hotel thấp nhất
        // cheapestPrice ;; giá rẻ nhát trong list
        // mostExpensivePrice: giá cao nhất trong list


        // Min price cua tung hotel can chuan hoa the nao de so sanh cong bang trong cung tap ket qua?
        if (minPrice == null) {
            return 0.0;
        }

        if (mostExpensivePrice <= cheapestPrice) {
            return 1.0;
        }

        double normalized = 1.0 - ((double) (minPrice - cheapestPrice) / (mostExpensivePrice - cheapestPrice));
        return Math.max(0.0, Math.min(1.0, normalized));
    }

}
