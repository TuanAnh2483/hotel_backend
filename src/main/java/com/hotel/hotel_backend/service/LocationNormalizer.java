package com.hotel.hotel_backend.service;

import org.springframework.util.StringUtils;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

public final class LocationNormalizer {

    private static final Pattern DIACRITIC_MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern LETTER_DIGIT_BOUNDARY = Pattern.compile("(?<=\\p{L})(?=\\p{N})|(?<=\\p{N})(?=\\p{L})");
    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Pattern MULTIPLE_SPACES = Pattern.compile("\\s+");

    private static final List<String> PROVINCE_PREFIXES = List.of(
            "thanh pho",
            "tp",
            "tinh",
            "city",
            "province"
    );

    private static final List<String> DISTRICT_PREFIXES = List.of(
            "thi tran",
            "thi xa",
            "district",
            "quan",
            "huyen",
            "tt",
            "tx",
            "q",
            "h",
            "xa",
            "x"
    );

    private static final Map<String, String> PROVINCE_ALIASES = Map.ofEntries(
            Map.entry("hcm", "ho chi minh"),
            Map.entry("hcmc", "ho chi minh"),
            Map.entry("tphcm", "ho chi minh"),
            Map.entry("sai gon", "ho chi minh"),
            Map.entry("saigon", "ho chi minh"),
            Map.entry("ho chi minh city", "ho chi minh"),
            Map.entry("hn", "ha noi"),
            Map.entry("danang", "da nang")
    );

    private LocationNormalizer() {
    }

    public static String normalizeProvinceLabel(String value) {
        return normalizeHumanReadableText(value);
    }

    public static String normalizeDistrictLabel(String value) {
        return normalizeHumanReadableText(value);
    }

    public static String normalizeProvinceKey(String value) {
        String normalized = stripPrefix(normalizeSearchKey(value), PROVINCE_PREFIXES);
        return PROVINCE_ALIASES.getOrDefault(normalized, normalized);
    }

    public static String normalizeDistrictKey(String value) {
        return stripPrefix(normalizeSearchKey(value), DISTRICT_PREFIXES);
    }

    public static boolean provinceMatches(String hotelProvince, String requestedProvince) {
        return keysMatch(normalizeProvinceKey(hotelProvince), normalizeProvinceKey(requestedProvince));
    }

    public static boolean districtMatches(String hotelDistrict, String requestedDistrict) {
        if (!StringUtils.hasText(requestedDistrict)) {
            return true;
        }

        return keysMatch(normalizeDistrictKey(hotelDistrict), normalizeDistrictKey(requestedDistrict));
    }

    private static boolean keysMatch(String left, String right) {
        return StringUtils.hasText(left) && StringUtils.hasText(right) && left.equals(right);
    }

    private static String normalizeHumanReadableText(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        return MULTIPLE_SPACES.matcher(value.trim()).replaceAll(" ");
    }

    private static String normalizeSearchKey(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        String normalized = normalizeHumanReadableText(value).toLowerCase(Locale.ROOT);
        normalized = normalized.replace('đ', 'd');
        normalized = Normalizer.normalize(normalized, Normalizer.Form.NFD);
        normalized = DIACRITIC_MARKS.matcher(normalized).replaceAll("");
        normalized = LETTER_DIGIT_BOUNDARY.matcher(normalized).replaceAll(" ");
        normalized = NON_ALPHANUMERIC.matcher(normalized).replaceAll(" ");
        return MULTIPLE_SPACES.matcher(normalized).replaceAll(" ").trim();
    }

    private static String stripPrefix(String value, List<String> prefixes) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        for (String prefix : prefixes) {
            if (value.equals(prefix)) {
                return "";
            }

            String prefixedValue = prefix + " ";
            if (value.startsWith(prefixedValue)) {
                return value.substring(prefixedValue.length()).trim();
            }
        }

        return value;
    }
}
