from pathlib import Path
path = Path("backend/controllers/employee.controller.js")
text = path.read_text(encoding="utf-8")
start = text.find('export const uploadEmployeeFace = async (req, res) => {')
if start == -1:
    raise SystemExit('function start not found')
new_function = '''export const uploadEmployeeFace = async (req, res) => {
  const { id } = req.params;
  const { imageData, album } = req.body || {};

  if (!imageData) {
    return res.status(400).json({ success: false, error: 'No imageData provided' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!isImageKitConfigured || !imagekit) {
      return res.status(500).json({
        success: false,
        error: 'ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in the backend environment.',
      });
    }

    let folder = album || IMAGEKIT_FACE_FOLDER || '/';
    if (!folder.startsWith('/')) {
      folder = f'/{folder}';
    }
    folder = folder.replace(/\/+/, 'TODO');
'''
