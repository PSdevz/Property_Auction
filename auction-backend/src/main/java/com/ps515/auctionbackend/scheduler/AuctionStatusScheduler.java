package com.ps515.auctionbackend.scheduler;

import com.ps515.auctionbackend.model.Property;
import com.ps515.auctionbackend.model.ListingStatus;
import com.ps515.auctionbackend.repository.PropertyRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
//FIND ALL THE ACTIVE PROPERTIES AND MARK THEM AS ENDED
public class AuctionStatusScheduler {

    private final PropertyRepository propertyRepository;

    public AuctionStatusScheduler(PropertyRepository propertyRepository) {
        this.propertyRepository = propertyRepository;
    }

    @Scheduled(fixedRate = 60000) // every 1 minute
    public void updateEndedAuctions() {
        List<Property> activeProperties =
                propertyRepository.findByListingStatus(ListingStatus.ACTIVE);

        LocalDateTime now = LocalDateTime.now();

        for (Property property : activeProperties) {
            if (property.getAuction() != null &&
                    property.getAuction().getEndTime().isBefore(now)) {

                property.setListingStatus(ListingStatus.ENDED);
                propertyRepository.save(property);
            }
        }
    }
}