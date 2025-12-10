// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./form_data/startup20');
const competitionDataRouter = require('./form_data');
const authApp = require('./auth_app');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['https://msme-awards-adjudication-admin.vercel.app', 'http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Initialize data on startup
console.log('Initializing server...');
testConnection();

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'MSME Awards API Server',
    status: 'running',
    version: '3.0'
  });
});

// Existing routes
app.use('/api/competition-data', competitionDataRouter);

// AUTH PUBLIC ROUTES
app.get('/api/verify-registration-link/:token', authApp.verifyRegistrationLink);
app.post('/api/signup', authApp.signUpUser);

// AUTH AUTHENTICATED ROUTES
app.post('/api/check-user-status', authApp.verifyToken, authApp.checkUserStatus);

// AUTH ADMIN ROUTES
app.post('/api/admin/generate-registration-link', authApp.verifyToken, authApp.checkApproved, authApp.checkAdmin, authApp.generateRegistrationLink);
app.post('/api/admin/assign-role', authApp.verifyToken, authApp.checkApproved, authApp.checkAdmin, authApp.assignRole);
app.get('/api/admin/users', authApp.verifyToken, authApp.checkApproved, authApp.checkAdmin, authApp.getAllUsers);
app.get('/api/admin/activity-logs', authApp.verifyToken, authApp.checkApproved, authApp.checkAdmin, authApp.getActivityLogs);

// AUTH ADJUDICATOR ROUTES
app.get('/api/adjudicator/applications', authApp.verifyToken, authApp.checkApproved, authApp.checkAdjudicator, authApp.getPendingApplications);
app.post('/api/adjudicator/approve-application', authApp.verifyToken, authApp.checkApproved, authApp.checkAdjudicator, authApp.approveApplication);
app.post('/api/adjudicator/reject-application', authApp.verifyToken, authApp.checkApproved, authApp.checkAdjudicator, authApp.rejectApplication);

// AUTH VIEWER ROUTES
app.get('/api/viewer/adjudication-data', authApp.verifyToken, authApp.checkApproved, authApp.checkViewer, authApp.getAdjudicationData);

// INVITATION ROUTES
app.post('/api/admin/send-invite', authApp.verifyToken, authApp.checkApproved, authApp.checkAdmin, authApp.sendInviteEmail);

// ADJUDICATION ROUTES (NEW)
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

app.get('/api/admin/application-reviews/:applicationId', 
  authApp.verifyToken, 
  authApp.checkApproved, 
  authApp.checkAdmin, 
  authApp.getApplicationReviews
);

// ADMIN FINAL DECISION ROUTES
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

// Add these routes with the other admin routes
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

// PROFILE ROUTES (add after auth routes)
app.get('/api/profile/:userId', authApp.verifyToken, authApp.checkApproved, authApp.getUserProfile);
app.put('/api/profile/:userId', authApp.verifyToken, authApp.checkApproved, authApp.updateUserProfile);
app.post('/api/profile/:userId/picture', authApp.verifyToken, authApp.checkApproved, authApp.uploadProfilePicture);
// Error handlers
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log('📊 API: /api/competition-data');
  console.log('🔐 Auth: /api/admin, /api/adjudicator, /api/viewer\n');
});

