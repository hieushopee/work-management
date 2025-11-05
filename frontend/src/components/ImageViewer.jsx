import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const ImageViewer = ({ images, initialUrl, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const initialIndex = images.findIndex(img => img === initialUrl);
    if (initialIndex !== -1) {
      setCurrentIndex(initialIndex);
    }
  }, [images, initialUrl]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  }, [images.length]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleNext, handlePrev, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const currentImage = images[currentIndex];

  if (!currentImage) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-end items-center p-4 text-white z-30">
        <div className="flex items-center gap-4">
          <a
            href={currentImage}
            download
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Download image"
          >
            <Download size={24} />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close viewer"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Prev Button */}
        {images.length > 1 && (
          <button
            type='button'
            onClick={handlePrev}
            className="absolute top-16 bottom-24 left-0 w-20 sm:w-24 flex items-center justify-start pl-4 text-white transition-colors z-10 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 cursor-pointer"
            aria-label="Previous image"
          >
            <ChevronLeft size={36} className="drop-shadow-lg" />
          </button>
        )}

        {/* Image Display */}
        <div className="max-w-full max-h-full flex items-center justify-center">
            <img
                src={currentImage}
                alt={`Image ${currentIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
            />
        </div>


        {/* Next Button */}
        {images.length > 1 && (
          <button
            type='button'
            onClick={handleNext}
            className="absolute top-16 bottom-24 right-0 w-20 sm:w-24 flex items-center justify-end pr-4 text-white transition-colors z-10 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 cursor-pointer"
            aria-label="Next image"
          >
            <ChevronRight size={36} className="drop-shadow-lg" />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 p-4 overflow-x-auto z-30">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-16 h-16 rounded-md overflow-hidden shrink-0 ${
                index === currentIndex ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageViewer;
