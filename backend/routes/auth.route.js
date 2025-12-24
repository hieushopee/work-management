import { Router } from "express"
import { 
  createNewAccessCode, 
  editProfile, 
  getProfile, 
  logout, 
  refreshAccessToken, 
  validateAccessCode,
  login,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  changePassword,
  getCurrentUser,
  registerAdmin
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { IMAGEKIT_URL_ENDPOINT } from "../config/env.js";
import { imagekit, isImageKitConfigured } from "../config/imagekit.js";

const router = Router();

// Public routes
router.get("/imagekit-config", (req, res) => {
  res.json({
    urlEndpoint: IMAGEKIT_URL_ENDPOINT || null,
  });
});

// Get banner images from ImageKit folder "New"
router.get("/imagekit-banners", async (req, res) => {
  try {
    if (!isImageKitConfigured || !imagekit || !IMAGEKIT_URL_ENDPOINT) {
      return res.json({
        success: false,
        banners: [],
        message: 'ImageKit is not configured',
      });
    }

    // List files in the "New" folder using ImageKit SDK
    const files = await imagekit.listFiles({
      path: '/New',
      type: 'file',
    });

    // Build full URLs for each file
    const banners = files
      .filter(file => {
        // Only include image files
        const name = file.name || '';
        const filePath = file.filePath || '';
        const fileName = name || filePath.split('/').pop() || '';
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
      })
      .map(file => {
        // Build full URL: urlEndpoint/New/filename
        const name = file.name || '';
        const filePath = file.filePath || '';
        const fileName = name || filePath.split('/').pop() || '';
        
        // Use file.url if available, otherwise build from endpoint
        if (file.url) {
          return file.url;
        }
        
        return `${IMAGEKIT_URL_ENDPOINT}/New/${fileName}`;
      })
      .filter(url => url); // Remove any empty URLs

    res.json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error('Error fetching ImageKit banners:', error);
    res.json({
      success: false,
      banners: [],
      message: error.message || 'Failed to fetch banners',
    });
  }
});
router.post("/create-new-access-code", createNewAccessCode);
router.post("/validate-access-code", validateAccessCode);
router.post("/login", login);
router.post("/register-admin", registerAdmin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

// Protected routes
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);
router.get("/profile", protectRoute, getProfile);
router.post("/edit", protectRoute, editProfile);
router.get('/me', protectRoute, getCurrentUser);
router.post("/change-password", protectRoute, changePassword);

export default router;