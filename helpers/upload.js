// F-6.5: X-Ray / Document Attachment Uploader (Extra)
// Stores uploaded X-rays / lab reports on local disk under /uploads/xrays.
// Files are served back via express.static('/uploads') (see index.js).
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(process.cwd(), 'uploads', 'xrays');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    }
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom'];

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Unsupported file type. Only JPEG, PNG, WEBP, PDF, or DICOM files are allowed.'));
    }
});

module.exports = { upload, uploadDir };
