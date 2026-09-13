import React, { useState, useEffect } from 'react';
import { BANNER_IMAGES } from '../../constants';

interface ImageBannerProps {
    className?: string;
}

const ImageBanner: React.FC<ImageBannerProps> = ({ className = '' }) => {
    // Images from public/images folder (excluding company-logo.jpeg)
    const images = BANNER_IMAGES;

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsTransitioning(true);
            
            // After fade out, change image
            setTimeout(() => {
                setCurrentImageIndex((prevIndex) => 
                    prevIndex === images.length - 1 ? 0 : prevIndex + 1
                );
                setIsTransitioning(false);
            }, 300); // Half transition duration
            
        }, 4000); // 4 seconds interval

        return () => clearInterval(interval);
    }, [images.length]);

    const goToImage = (index: number) => {
        if (index !== currentImageIndex) {
            setIsTransitioning(true);
            setTimeout(() => {
                setCurrentImageIndex(index);
                setIsTransitioning(false);
            }, 300);
        }
    };

    const nextImage = () => {
        goToImage(currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1);
    };

    const prevImage = () => {
        goToImage(currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1);
    };

    return (
        <div 
            className={`relative w-full rounded-xl overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-800 transition-all duration-300 ${className}`} 
            style={{ height: '48vh', minHeight: '260px', maxHeight: '480px' }}
        >
            {/* Main Image */}
            <div className="relative w-full h-full">
                <img
                    src={images[currentImageIndex]}
                    alt={`Banner ${currentImageIndex + 1}`}
                    className={`w-full h-full object-cover object-center transition-opacity duration-600 ${
                        isTransitioning ? 'opacity-0' : 'opacity-100'
                    }`}
                    onError={(e) => {
                        // Fallback to default image if current image fails to load
                        e.currentTarget.src = '/images/Zahran-mission.webp';
                    }}
                />
                
                {/* Soft Edge Blending & Ambient Vignette - Integrates banner naturally into the dashboard */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15 pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none"></div>
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/65 backdrop-blur-sm text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200"
                aria-label="Previous image"
            >
                <i className="fas fa-chevron-left text-sm"></i>
            </button>
            
            <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/65 backdrop-blur-sm text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200"
                aria-label="Next image"
            >
                <i className="fas fa-chevron-right text-sm"></i>
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
                {images.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToImage(index)}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                            index === currentImageIndex
                                ? 'bg-white shadow-md scale-110'
                                : 'bg-white/50 hover:bg-white/80'
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                    />
                ))}
            </div>

            {/* Image counter */}
            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium z-10">
                {currentImageIndex + 1} / {images.length}
            </div>
        </div>
    );
};

export default ImageBanner;