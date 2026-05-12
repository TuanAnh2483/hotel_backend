# Search Frontend Integration Checklist

## Muc tieu

- Dung lai contract search V1 hien tai, khong mo rong backend them nua.
- Giu backend default la `price_asc`, nhung frontend gui `sort` ro rang de UX on dinh.
- Co mot checklist de frontend team hoac chinh ban test theo thu tu, tranh bo sot flow.

## Thu tu tich hop

1. Goi `GET /api/catalog/options` khi man hinh search duoc mo.
2. Dung catalog response de render filter options cho:
   - `hotelTypes`
   - `roomCategories`
   - `bedTypes`
   - `hotelAmenities`
   - `roomAmenities`
3. Tao search form state voi cac field:
   - `province`
   - `district`
   - `checkIn`
   - `checkOut`
   - `adults`
   - `rooms`
   - `page`
   - `size`
   - `sort`
   - `hotelTypes`
   - `roomCategories`
   - `bedTypes`
   - `hotelAmenities`
   - `roomAmenities`
4. Khi user bam search, goi `GET /api/hotels/search` va gui day du query params can thiet.
5. Khi user bam vao 1 hotel, goi:
   - `GET /api/hotels/{id}` de lay thong tin tinh
   - `GET /api/hotels/{id}/available-rooms` de lay room book duoc theo stay

## Rule cho frontend

- Luon gui `sort` ro rang, khong nen de frontend phu thuoc vao default ngat cua backend.
- O giai doan nay, sort nen dat mac dinh o UI la `recommended`.
- Moi lan user doi filter hoac doi sort, reset `page = 1`.
- `district` la optional. Neu user chua chon district thi khong gui field nay.
- Multi-select filters duoc gui dang comma-separated, vi du:
  - `hotelTypes=RESORT,VILLA`
  - `roomAmenities=BALCONY,BATHTUB`
- Neu search tra:
  - `success = true` va `items = []`: show empty state, khong show error
  - `success = false` va `error.code = VALIDATION_ERROR`: map `error.details[field]` vao dung input

## Sort options nen render

- `recommended`: De xuat
- `price_asc`: Gia thap den cao
- `price_desc`: Gia cao den thap
- `rating_desc`: Danh gia cao nhat

## Query mapping

- `province`: text input hoac select, bat buoc
- `district`: text input hoac select, optional
- `checkIn`, `checkOut`: date picker, format `yyyy-MM-dd`
- `adults`, `rooms`: quantity stepper, toi thieu `1`
- `page`: state phan trang
- `size`: page size, hien tai nen giu cac muc nhu `10`, `20`, `30`
- `sort`: select box
- `hotelTypes`, `roomCategories`, `bedTypes`, `hotelAmenities`, `roomAmenities`: checkbox group hoac multi-select

## Search request mau

```text
GET /api/hotels/search?province=Bangkok&district=District%201&checkIn=2026-04-25&checkOut=2026-04-27&adults=2&rooms=1&page=1&size=10&sort=recommended&hotelTypes=RESORT&roomAmenities=BALCONY
```

## Commands de test nhanh

### 1. Lay catalog options

```powershell
curl.exe "http://localhost:8080/api/catalog/options"
```

### 2. Search co sort recommended

```powershell
curl.exe "http://localhost:8080/api/hotels/search?province=Bangkok&district=District%201&checkIn=2026-04-25&checkOut=2026-04-27&adults=2&rooms=1&page=1&size=10&sort=recommended"
```

### 3. Search phan trang trang 2

```powershell
curl.exe "http://localhost:8080/api/hotels/search?province=Bangkok&district=District%201&checkIn=2026-04-25&checkOut=2026-04-27&adults=2&rooms=1&page=2&size=10&sort=recommended"
```

### 4. Search voi room filters

```powershell
curl.exe "http://localhost:8080/api/hotels/search?province=Bangkok&checkIn=2026-04-25&checkOut=2026-04-27&adults=2&rooms=1&sort=recommended&roomCategories=SUITE&bedTypes=DOUBLE&roomAmenities=BALCONY"
```

### 5. Lay hotel detail

```powershell
curl.exe "http://localhost:8080/api/hotels/1"
```

### 6. Lay available rooms theo stay

```powershell
curl.exe "http://localhost:8080/api/hotels/1/available-rooms?checkIn=2026-04-25&checkOut=2026-04-27&adults=2&rooms=1"
```

## Smoke test checklist

### Search list

- [ ] Search voi `province + district + stay` tra ve list hotel hop le
- [ ] Search bo trong `district` van tra ket qua theo `province`
- [ ] Sort mac dinh tren UI la `recommended`
- [ ] Doi sang `price_asc` thi item re hon len truoc
- [ ] Doi sang `price_desc` thi item dat hon len truoc
- [ ] Doi sang `rating_desc` thi hotel rating cao len truoc
- [ ] Doi page thi metadata `page/size/totalPages/hasNext` tren UI update dung
- [ ] Doi sort hoac filter thi page reset ve `1`

### Filters

- [ ] `hotelTypes` loc dung o muc hotel
- [ ] `hotelAmenities` dung semantics AND
- [ ] `roomCategories`, `bedTypes`, `roomAmenities` loc dung room pool truoc pricing
- [ ] `minPrice` tren UI doi theo room filter, khong lay gia cua room bi loai

### Empty + validation

- [ ] Search khong co ket qua hien empty state, khong hien popup loi
- [ ] Thieu `checkIn/checkOut` thi UI map loi dung field
- [ ] `checkOut <= checkIn` thi UI map loi dung field
- [ ] `page < 1` hoac `size > 50` thi UI map loi theo `error.details`

### Detail flow

- [ ] Bam vao hotel card goi `GET /api/hotels/{id}` va render thong tin tinh
- [ ] Cung stay params do, goi `GET /api/hotels/{id}/available-rooms`
- [ ] Danh sach room chi hien room con book duoc
- [ ] `stayPrice` room tren detail khop voi stay dang search

## Ket luan cho phuong an B

- Khong doi them backend feature luc nay.
- Frontend can uu tien goi `sort=recommended` mot cach explicit.
- Sau khi UI smoke test xong, moi quyet dinh co doi default backend tu `price_asc` sang `recommended` hay khong.
