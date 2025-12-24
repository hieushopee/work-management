// ImageKit Configuration
// Update IMAGEKIT_URL_ENDPOINT with your ImageKit URL endpoint
// You can find this in your ImageKit dashboard or backend .env file
// Format: https://ik.imagekit.io/[your-imagekit-id]

export const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || null;

// Banner image filenames in ImageKit folder "New"
// Add more filenames here to show multiple banners
// These images will automatically rotate in the carousel
export const BANNER_FILENAMES = [
  'contact-us-banner.png',
  // Add your actual banner filenames from ImageKit folder "New" here
  // Example:
  // 'banner-1.jpg',
  // 'banner-2.jpg',
  // 'banner-3.jpg',
];

// Build full banner URLs
export const getBannerUrls = () => {
  if (IMAGEKIT_URL_ENDPOINT) {
    return BANNER_FILENAMES
      .filter(filename => filename && filename.trim())
      .map(filename => `${IMAGEKIT_URL_ENDPOINT}/New/${filename.trim()}`);
  }
  return [];
};

// Legacy function for single banner (backward compatibility)
export const BANNER_FILENAME = BANNER_FILENAMES[0] || 'contact-us-banner.png';
export const getBannerUrl = () => {
  const urls = getBannerUrls();
  return urls[0] || null;
};

