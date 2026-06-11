package com.hotel.hotel_backend.service.chat;

import java.util.List;
import java.util.Map;

import static com.hotel.hotel_backend.service.chat.ChatJsonUtil.obj;

/**
 * Khai báo function declarations gửi cho Gemini (metadata JSON, không chứa logic).
 * Partner tools KHÔNG khai báo propertyId/ownerId — backend tự lấy từ JWT.
 */
final class ChatTools {

    private ChatTools() {
    }

    static final List<Map<String, Object>> CUSTOMER_TOOLS = List.of(
            decl("search_rooms",
                    "Tìm kiếm phòng còn trống theo tiêu chí của khách. Hỗ trợ lọc theo địa điểm "
                            + "(tỉnh/thành phố hoặc quận/huyện) qua tham số location.",
                    obj("type", "object",
                            "properties", obj(
                                    "checkIn", str("Ngày nhận phòng, định dạng yyyy-MM-dd"),
                                    "checkOut", str("Ngày trả phòng, định dạng yyyy-MM-dd"),
                                    "guests", integer("Số người ở"),
                                    "location", str("Địa điểm khách muốn ở: tên tỉnh/thành phố hoặc quận/huyện "
                                            + "(ví dụ: Hồ Chí Minh, Đà Nẵng, Quận 1). Tuỳ chọn."),
                                    "maxPrice", number("Giá tối đa mỗi đêm (VND), tuỳ chọn"),
                                    "hotelId", integer("ID khách sạn cụ thể nếu khách hỏi đích danh, tuỳ chọn")
                            ),
                            "required", List.of("checkIn", "checkOut", "guests"))),

            decl("get_booking_status",
                    "Tra cứu trạng thái booking theo mã đặt phòng",
                    obj("type", "object",
                            "properties", obj("bookingCode", integer("Mã booking (id)")),
                            "required", List.of("bookingCode"))),

            decl("find_booking_by_contact",
                    "Tra cứu các booking của khách theo email hoặc số điện thoại đã dùng khi đặt phòng "
                            + "(dùng khi khách không nhớ mã booking). Phải có ít nhất email hoặc phone.",
                    obj("type", "object",
                            "properties", obj(
                                    "email", str("Email đã dùng khi đặt phòng, tuỳ chọn"),
                                    "phone", str("Số điện thoại đã dùng khi đặt phòng, tuỳ chọn")
                            ),
                            "required", List.of())),

            decl("suggest_hotels",
                    "Gợi ý khách sạn nổi bật (rating cao) hoặc giá rẻ, có thể lọc theo địa điểm. "
                            + "Dùng khi khách hỏi chung chung chưa có ngày cụ thể.",
                    obj("type", "object",
                            "properties", obj(
                                    "location", str("Tỉnh/thành phố hoặc quận/huyện muốn lọc, tuỳ chọn"),
                                    "sortBy", enumStr("Tiêu chí xếp hạng: rating (mặc định) hoặc price",
                                            List.of("rating", "price"))
                            ),
                            "required", List.of())),

            decl("get_hotel_faq",
                    "Trả lời câu hỏi thường gặp về chính sách khách sạn (huỷ phòng, nhận/trả phòng, tiện nghi, thanh toán)",
                    obj("type", "object",
                            "properties", obj(
                                    "topic", enumStr("Chủ đề câu hỏi",
                                            List.of("cancellation", "checkin", "checkout", "amenities", "payment", "general")),
                                    "hotelId", integer("ID khách sạn nếu hỏi về khách sạn cụ thể, tuỳ chọn")
                            ),
                            "required", List.of("topic"))),

            decl("get_nearby_attractions",
                    "Gợi ý địa điểm tham quan, ăn uống gần khách sạn",
                    obj("type", "object",
                            "properties", obj(
                                    "hotelId", integer("ID khách sạn"),
                                    "category", enumStr("Loại địa điểm, tuỳ chọn",
                                            List.of("food", "entertainment", "shopping", "nature", "all"))
                            ),
                            "required", List.of("hotelId")))
    );

    static final List<Map<String, Object>> PARTNER_TOOLS = List.of(
            decl("get_available_rooms",
                    "Xem danh sách phòng còn trống của đối tác trong khoảng thời gian",
                    obj("type", "object",
                            "properties", obj(
                                    "dateFrom", str("Ngày bắt đầu, định dạng yyyy-MM-dd"),
                                    "dateTo", str("Ngày kết thúc, định dạng yyyy-MM-dd")
                            ),
                            "required", List.of("dateFrom", "dateTo"))),

            decl("get_revenue_stats",
                    "Xem thống kê doanh thu theo tháng của đối tác",
                    obj("type", "object",
                            "properties", obj(
                                    "month", integer("Tháng, 1-12"),
                                    "year", integer("Năm, ví dụ 2026")
                            ),
                            "required", List.of("month", "year"))),

            decl("get_upcoming_checkins",
                    "Xem danh sách booking sắp check-in hoặc chưa xác nhận",
                    obj("type", "object",
                            "properties", obj(
                                    "days", integer("Số ngày tới cần xem, mặc định 3"),
                                    "status", enumStr("Lọc trạng thái, mặc định all",
                                            List.of("pending", "confirmed", "all"))
                            ),
                            "required", List.of())),

            decl("block_room",
                    "Block hoặc unblock phòng trong khoảng thời gian. PHẢI xác nhận với người dùng trước khi gọi tool này.",
                    obj("type", "object",
                            "properties", obj(
                                    "roomId", integer("ID loại phòng"),
                                    "dateFrom", str("Ngày bắt đầu, định dạng yyyy-MM-dd"),
                                    "dateTo", str("Ngày kết thúc, định dạng yyyy-MM-dd"),
                                    "action", enumStr("Hành động", List.of("block", "unblock")),
                                    "reason", str("Lý do block, tuỳ chọn")
                            ),
                            "required", List.of("roomId", "dateFrom", "dateTo", "action")))
    );

    private static Map<String, Object> decl(String name, String description, Map<String, Object> parameters) {
        return obj("name", name, "description", description, "parameters", parameters);
    }

    private static Map<String, Object> str(String description) {
        return obj("type", "string", "description", description);
    }

    private static Map<String, Object> integer(String description) {
        return obj("type", "integer", "description", description);
    }

    private static Map<String, Object> number(String description) {
        return obj("type", "number", "description", description);
    }

    private static Map<String, Object> enumStr(String description, List<String> values) {
        return obj("type", "string", "description", description, "enum", values);
    }
}
