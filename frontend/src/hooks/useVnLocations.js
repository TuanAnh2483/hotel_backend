import { useMemo } from "react";
import { useVietnamProvinces, useVietnamDistricts } from "./useVietnamAdmin";
import { stripProvincePrefix, nfc } from "../services/vnAdminService";

/** Remove Vietnamese accents (and đ/Đ) for accent-insensitive matching. */
function removeAccents(str = "") {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

const viCollator = new Intl.Collator("vi");

/**
 * Shared location data for the hotel create/edit forms.
 *
 * Sources the official Vietnamese administrative list (provinces.open-api.vn)
 * so every hotel stores a consistent, canonical province/district name.
 *
 * @param {string} provinceName  Currently selected province (short name, e.g. "Hồ Chí Minh").
 * @returns {{
 *   provinceOptions: { code: number, name: string }[],
 *   provinceCode: number | null,
 *   districtOptions: string[],
 *   loadingProvinces: boolean,
 *   loadingDistricts: boolean,
 * }}
 */
export function useVnLocations(provinceName) {
  const { data: adminProvinces, isLoading: loadingProvinces } = useVietnamProvinces();

  const provinceOptions = useMemo(() => {
    if (!Array.isArray(adminProvinces)) return [];
    return adminProvinces
      .map((p) => ({ code: p.code, name: stripProvincePrefix(p.name) }))
      .sort((a, b) => viCollator.compare(a.name, b.name));
  }, [adminProvinces]);

  // Resolve the admin code for the selected province (accent-insensitive so that
  // legacy values such as "Ho Chi Minh" still load districts).
  const provinceCode = useMemo(() => {
    if (!provinceName || provinceOptions.length === 0) return null;
    const target = removeAccents(provinceName);
    const match = provinceOptions.find((p) => removeAccents(p.name) === target);
    return match ? match.code : null;
  }, [provinceName, provinceOptions]);

  const { data: adminDistricts, isLoading: loadingDistricts } = useVietnamDistricts(provinceCode);

  const districtOptions = useMemo(() => {
    if (!Array.isArray(adminDistricts)) return [];
    return adminDistricts
      .map((d) => nfc(d.name))
      .sort((a, b) => viCollator.compare(a, b));
  }, [adminDistricts]);

  return {
    provinceOptions,
    provinceCode,
    districtOptions,
    loadingProvinces,
    loadingDistricts: provinceCode != null && loadingDistricts,
  };
}
