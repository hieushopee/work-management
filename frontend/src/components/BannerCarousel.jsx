import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BannerCarousel = ({ images, autoPlayInterval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);

  // Auto-play functionality
  useEffect(() => {
    if (images.length <= 1 || isPaused) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, autoPlayInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [images.length, autoPlayInterval, isPaused]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000); // Resume after 3 seconds
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000); // Resume after 3 seconds
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000); // Resume after 3 seconds
  };

  if (!images || images.length === 0) {
    return null;
  }

  // If only one image, show it without carousel controls
  if (images.length === 1) {
    return (
      <div className='relative h-[450px] w-full overflow-hidden rounded-2xl'>
        <img
          src={images[0]}
          alt='Banner'
          className='absolute inset-0 h-full w-full object-cover'
          onError={(e) => {
            e.target.src = '/banner-figma.png';
          }}
        />
      </div>
    );
  }

  return (
    <div
      className='relative h-[450px] w-full overflow-hidden rounded-2xl'
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Images */}
      <div className='relative h-full w-full'>
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={`Banner ${index + 1}`}
              className='h-full w-full object-cover'
              onError={(e) => {
                e.target.src = '/banner-figma.png';
              }}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className='absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg transition-all hover:bg-white hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary'
        aria-label='Previous banner'
      >
        <ChevronLeft className='h-6 w-6 text-text-main' />
      </button>

      <button
        onClick={goToNext}
        className='absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-lg transition-all hover:bg-white hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary'
        aria-label='Next banner'
      >
        <ChevronRight className='h-6 w-6 text-text-main' />
      </button>

      {/* Dots Indicator */}
      <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2'>
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'w-8 bg-primary'
                : 'w-2 bg-white/60 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default BannerCarousel;

