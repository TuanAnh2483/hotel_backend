package com.hotel.hotel_backend.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ImageStorageProvider {

    String providerKey();

    List<String> storeHotelImages(Long hotelId, List<MultipartFile> files);

    List<String> storeRoomImages(Long roomId, List<MultipartFile> files);

    boolean manages(String imageUrl);

    void deleteImage(String imageUrl);
}
