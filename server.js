// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./form_data/startup20');
const competitionDataRouter = require('./form_data');
const authApp = require('./auth_app');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CORS CONFIGURATION - VERCEL COMPATIBLE
// ============================================
const allowedOrigins = [
  'https://msme-awards-adjudication-admin.vercel.app',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

// CORS Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow requests with no origin (like mobile apps, curl, Postman)
  if (!origin) {
    return next();
  }
  
  // Check if origin is allowed
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  } else {
    console.log('❌ CORS blocked origin:', origin);
  }
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Body parser middleware
app.use(express.json());

// Request logging (helpful for debugging)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Initialize data on startup
console.log('Initializing server...');
testConnection();

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'MSME Awards API Server',
    status: 'running',
    version: '3.0',
    timestamp: new Date().toISOString()
  });
});

// Competition data routes
app.use('/api/competition-data', competitionDataRouter);

// ============================================
// AUTH PUBLIC ROUTES
// ============================================
app.get('/api/verify-registration-link/:token', authApp.verifyRegistrationLink);
app.post('/api/signup', authApp.signUpUser);

// ============================================
// AUTH AUTHENTICATED ROUTES
// ============================================
app.post('/api/check-user-status', authApp.verifyToken, authApp.checkUserStatus);

// ============================================
// AUTH ADMIN ROUTES
// ============================================
app.post('/api/admin/generate-registration-link', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdmin, 
  authApp.generateRegistrationLink
);

app.post('/api/admin/assign-role', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdmin, 
  authApp.assignRole
);

app.get('/api/admin/users', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdmin, 
  authApp.getAllUsers
);

app.get('/api/admin/activity-logs', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdmin, 
  authApp.getActivityLogs
);

app.get('/api/admin/total-adjudicators',
  authApp.verifyToken,
  authApp.checkApproved,
  authApp.checkAdmin,
  authApp.getTotalAdjudicators
);

app.get('/api/admin/all-review-counts',
  authApp.verifyToken,
  authApp.checkApproved,
  authApp.checkAdmin,
  authApp.getAllReviewCounts
);

app.get('/api/admin/all-final-decisions',
  authApp.verifyToken,
  authApp.checkApproved,
  authApp.checkAdmin,
  authApp.getAllFinalDecisions
);

app.get('/api/admin/application-reviews/:applicationId', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdmin, 
  authApp.getApplicationReviews
);

// ============================================
// AUTH ADJUDICATOR ROUTES
// ============================================
app.get('/api/adjudicator/applications', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdjudicator, 
  authApp.getPendingApplications
);

app.post('/api/adjudicator/approve-application', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdjudicator, 
  authApp.approveApplication
);

app.post('/api/adjudicator/reject-application', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdjudicator, 
  authApp.rejectApplication
);

app.post('/api/adjudicator/submit-review', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdjudicator, 
  authApp.submitAdjudicatorReview
);

app.get('/api/adjudicator/my-reviews', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdjudicator, 
  authApp.getMyReviews
);

app.get('/api/adjudicator/my-review/:applicationId', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdjudicator, 
  authApp.getMyReviewForApplication
);

// ============================================
// AUTH VIEWER ROUTES
// ============================================
app.get('/api/viewer/adjudication-data', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkViewer, 
  authApp.getAdjudicationData
);

// ============================================
// INVITATION ROUTES
// ============================================
app.post('/api/admin/send-invite', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdmin, 
  authApp.sendInviteEmail
);

// ============================================
// ADMIN FINAL DECISION ROUTES
// ============================================
app.post('/api/admin/final-approval',
  authApp.verifyToken,
  authApp.checkApproved,
  authApp.checkAdmin,
  authApp.adminFinalApproval
);

app.post('/api/admin/final-rejection',
  authApp.verifyToken,
  authApp.checkApproved,
  authApp.checkAdmin,
  authApp.adminFinalRejection
);

app.get('/api/admin/final-decision/:applicationId',
  authApp.verifyToken,
  authApp.checkApproved,
  authApp.checkAdmin,
  authApp.getFinalDecision
);

// ============================================
// PROFILE ROUTES
// ============================================
app.get('/api/profile/:userId', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.getUserProfile
);

app.put('/api/profile/:userId', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.updateUserProfile
);

app.post('/api/profile/:userId/picture', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.uploadProfilePicture
);

// ============================================
// ERROR HANDLERS
// ============================================

// 404 handler - must be after all routes
app.use((req, res) => {
  console.log('404 - Route not found:', req.method, req.url);
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    path: req.url,
    method: req.method
  });
});

// Error handler - must be last
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(err.status || 500).json({ 
    success: false, 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// START SERVER
// ============================================
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log('📊 API: /api/competition-data');
    console.log('🔐 Auth: /api/admin, /api/adjudicator, /api/viewer');
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
    console.log('✅ CORS enabled for:');
    allowedOrigins.forEach(origin => console.log(`   - ${origin}`));
    console.log('');
  });
}

// Export for Vercel
module.exports = app;