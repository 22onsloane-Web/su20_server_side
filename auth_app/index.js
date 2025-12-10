// auth_app/index.js
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
const { 
  sendInvitationEmail, 
  sendApplicationApprovalEmail, 
  sendApplicationRejectionEmail,
  sendAdminNotificationNewUser,
  sendUserApprovalNotification,
  sendUserRejectionNotification
} = require('../utils/emailService');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  // Check if running on Vercel (environment variable)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Local development - use file
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

const db = admin.firestore();
const auth = admin.auth();
// ============================================
// CONSTANTS
// ============================================
const ROLES = {
  ADMIN: 'admin',
  ADJUDICATOR: 'adjudicator',
  VIEWER: 'viewer',
  PENDING: 'pending'
};

const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// ============================================
// MIDDLEWARE FUNCTIONS
// ============================================

const verifyToken = async (req, res, next) => {
  console.log('\n=== TOKEN VERIFICATION DEBUG ===');
  console.log('1. Request URL:', req.url);
  console.log('2. Request method:', req.method);
  console.log('3. Authorization header exists?', !!req.headers.authorization);
  
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    console.log('4. ERROR: No token found in Authorization header');
    return res.status(401).json({ error: 'No token provided' });
  }

  console.log('4. Token extracted, length:', token.length);

  try {
    console.log('5. Attempting to verify token with Firebase Admin...');
    const decodedToken = await auth.verifyIdToken(token);
    console.log('6. SUCCESS - Token verified!');
    console.log('   - UID:', decodedToken.uid);
    console.log('   - Email:', decodedToken.email);
    
    req.user = decodedToken;
    
    console.log('7. Fetching user document from Firestore...');
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      console.log('8. ERROR: User document not found in Firestore');
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    req.userData = userDoc.data();
    console.log('8. SUCCESS - User data loaded');
    console.log('   - Email:', req.userData.email);
    console.log('   - Role:', req.userData.role);
    console.log('   - Status:', req.userData.status);
    console.log('=== END DEBUG ===\n');
    
    next();
  } catch (error) {
    console.log('ERROR during token verification:');
    console.log('   - Error code:', error.code);
    console.log('   - Error message:', error.message);
    console.log('   - Full error:', JSON.stringify(error, null, 2));
    console.log('   - Token length:', token ? token.length : 'no token');
    console.log('   - Token preview:', token ? token.substring(0, 30) + '...' : 'none');
    
    // Helpful hints
    if (error.code === 'auth/id-token-expired') {
      console.log('   💡 HINT: Token expired - client needs to call getIdToken(true)');
    } else if (error.code === 'auth/argument-error') {
      console.log('   💡 HINT: Invalid token format - check Bearer prefix');
    } else if (error.code === 'auth/project-not-found') {
      console.log('   💡 HINT: Firebase project mismatch - check serviceAccountKey.json');
    }
    
    console.log('=== END DEBUG ===\n');
    return res.status(401).json({ 
      error: 'Invalid token',
      errorCode: error.code,
      errorMessage: error.message
    });
  }
};

// ============================================
// USER STATUS FUNCTIONS
// ============================================

const checkUserStatus = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    res.json({
       uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      phoneNumber: userData.phoneNumber, // ADD THIS LINE - it was missing
      company: userData.company,
      description: userData.description,
      profilePicture: userData.profilePicture,
      role: userData.role,
      status: userData.status,
      canAccess: userData.status === USER_STATUS.APPROVED
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const checkAdmin = (req, res, next) => {
  if (req.userData?.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const checkAdjudicator = (req, res, next) => {
  if (req.userData.role !== ROLES.ADJUDICATOR && req.userData.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Adjudicator access required' });
  }
  next();
};

const checkViewer = (req, res, next) => {
  if (req.userData.role !== ROLES.VIEWER && req.userData.role !== ROLES.ADMIN) {
    return res.status(403).json({ error: 'Viewer access required' });
  }
  next();
};

// ============================================
// REGISTRATION FUNCTIONS
// ============================================

const generateRegistrationLink = async (req, res) => {
  try {
    const { expiresIn = 86400, requestedRole } = req.body;
    
    const linkToken = db.collection('registration_links').doc().id;
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));
    
    await db.collection('registration_links').doc(linkToken).set({
      token: linkToken,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      used: false,
      requestedRole: requestedRole || ROLES.VIEWER
    });
    
    const registrationUrl = `${process.env.CLIENT_URL}/auth/register?token=${linkToken}`;
    
    res.json({
      success: true,
      registrationUrl,
      token: linkToken,
      expiresAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyRegistrationLink = async (req, res) => {
  try {
    const { token } = req.params;
    
    const linkDoc = await db.collection('registration_links').doc(token).get();
    
    if (!linkDoc.exists) {
      return res.status(404).json({ error: 'Invalid registration link' });
    }
    
    const linkData = linkDoc.data();
    
    if (linkData.used) {
      return res.status(400).json({ error: 'Registration link already used' });
    }
    
    if (linkData.expiresAt.toDate() < new Date()) {
      return res.status(400).json({ error: 'Registration link expired' });
    }
    
    res.json({ 
      valid: true,
      requestedRole: linkData.requestedRole 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



/**
 * Sign up user - UPDATED to notify admins
 */
const signUpUser = async (req, res) => {
  try {
    const { email, password, displayName, registrationToken, phoneNumber, company, description, profilePicture } = req.body;
    
    // Verify registration link
    const linkDoc = await db.collection('registration_links').doc(registrationToken).get();
    
    if (!linkDoc.exists || linkDoc.data().used || 
        linkDoc.data().expiresAt.toDate() < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired registration link' });
    }

    const linkData = linkDoc.data();
    
    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      phoneNumber: phoneNumber || null
    });
    
    // Get admin who created the link
    const adminDoc = await db.collection('users').doc(linkData.createdBy).get();
    const adminName = adminDoc.exists ? adminDoc.data().displayName : 'Unknown Admin';
    
    // Create user document with profile picture
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      phoneNumber: phoneNumber || '',
      company: company || '',
      description: description || '',
      profilePicture: profilePicture || '',
      role: ROLES.PENDING,
      requestedRole: linkData.requestedRole,
      status: USER_STATUS.PENDING,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      dateJoined: admin.firestore.FieldValue.serverTimestamp(),
      addedBy: linkData.createdBy,
      addedByName: adminName,
      approvedBy: null,
      approvedAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Mark registration link as used
    await db.collection('registration_links').doc(registrationToken).update({
      used: true,
      usedBy: userRecord.uid,
      usedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role: ROLES.PENDING,
      status: USER_STATUS.PENDING
    });

    // **NEW: Send notification to all admins**
    try {
      const adminsSnapshot = await db.collection('users')
        .where('role', '==', 'admin')
        .where('status', '==', 'approved')
        .get();
      
      const registrationDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const emailPromises = adminsSnapshot.docs.map(adminDoc => {
        const admin = adminDoc.data();
        return sendAdminNotificationNewUser({
          adminEmail: admin.email,
          adminName: admin.displayName,
          newUserName: displayName,
          newUserEmail: email,
          newUserRole: linkData.requestedRole,
          registrationDate: registrationDate
        }).catch(err => {
          console.error(`Failed to send email to ${admin.email}:`, err);
          return null;
        });
      });

      await Promise.all(emailPromises);
      console.log(`Sent notifications to ${adminsSnapshot.size} admin(s)`);
    } catch (emailError) {
      console.error('Error sending admin notifications:', emailError);
      // Don't fail registration if email fails
    }
    
    res.json({
      success: true,
      message: 'Account created successfully. Awaiting admin approval.',
      uid: userRecord.uid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};





// ============================================
// ADMIN FUNCTIONS
// ============================================

const assignRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    await db.collection('users').doc(userId).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user.uid
    });
    
    await auth.setCustomUserClaims(userId, { role });
    
    res.json({ success: true, message: 'Role assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const snapshot = await db.collection('activity_logs')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// ADJUDICATOR FUNCTIONS
// ============================================

const getPendingApplications = async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('status', '==', USER_STATUS.PENDING)
      .get();
    
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ applications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Approve application - Send notification to user
 */
const approveApplication = async (req, res) => {
  try {
    const { userId } = req.body;
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    await db.collection('users').doc(userId).update({
      status: USER_STATUS.APPROVED,
      role: userData.requestedRole,
      approvedBy: req.user.uid,
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await auth.setCustomUserClaims(userId, {
      role: userData.requestedRole,
      status: USER_STATUS.APPROVED
    });
    
    // Log activity
    await db.collection('activity_logs').add({
      action: 'application_approved',
      userId: userId,
      approvedBy: req.user.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send approval notification to user
    try {
      await sendUserApprovalNotification({
        userEmail: userData.email,
        userName: userData.displayName,
        userRole: userData.requestedRole
      });
      console.log(`Approval notification sent to ${userData.email}`);
    } catch (emailError) {
      console.error('Error sending user approval notification:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: 'Application approved successfully and user notified' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reject application - Send notification to user
 */
const rejectApplication = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    await db.collection('users').doc(userId).update({
      status: USER_STATUS.REJECTED,
      rejectedBy: req.user.uid,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejectionReason: reason
    });
    
    await auth.setCustomUserClaims(userId, {
      status: USER_STATUS.REJECTED
    });
    
    // Log activity
    await db.collection('activity_logs').add({
      action: 'application_rejected',
      userId: userId,
      rejectedBy: req.user.uid,
      reason: reason,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send rejection notification to user
    try {
      await sendUserRejectionNotification({
        userEmail: userData.email,
        userName: userData.displayName,
        rejectionReason: reason || 'No specific reason provided'
      });
      console.log(`Rejection notification sent to ${userData.email}`);
    } catch (emailError) {
      console.error('Error sending user rejection notification:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: 'Application rejected and user notified' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// VIEWER FUNCTIONS
// ============================================

const getAdjudicationData = async (req, res) => {
  try {
    const snapshot = await db.collection('adjudications').get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get user profile
 */
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.uid !== userId && req.userData.role !== ROLES.ADMIN) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ profile: userDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update user profile
 */
const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, phoneNumber, company, description } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (displayName) updateData.displayName = displayName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (company !== undefined) updateData.company = company;
    if (description !== undefined) updateData.description = description;
    
    await db.collection('users').doc(userId).update(updateData);
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Upload profile picture
 */
const uploadProfilePicture = async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageData } = req.body;
    
    if (req.user.uid !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.collection('users').doc(userId).update({
      profilePicture: imageData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ success: true, message: 'Profile picture updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Send invitation email
 */

const sendInviteEmail = async (req, res) => {
  try {
    const { email, registrationUrl, role } = req.body;
    
    if (!email || !registrationUrl || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Get admin info
    const adminDoc = await db.collection('users').doc(req.user.uid).get();
    const adminName = adminDoc.exists ? adminDoc.data().displayName : 'Admin';

    // Send email
    await sendInvitationEmail({
      email,
      registrationUrl,
      role,
      adminName
    });

    // Store invitation record
    await db.collection('invitations').add({
      email,
      registrationUrl,
      role,
      sentBy: req.user.uid,
      sentByName: adminName,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent'
    });

    res.json({ 
      success: true, 
      message: 'Invitation sent successfully' 
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ 
      error: 'Failed to send invitation email',
      details: error.message 
    });
  }
};

// ============================================
// ADJUDICATION FUNCTIONS (NEW)
// ============================================


/**
 * Submit adjudicator review for an application with scoring
 */
const submitAdjudicatorReview = async (req, res) => {
  try {
    const { applicationId, decision, comments, scores } = req.body;
    
    if (!applicationId || !decision || !comments) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['approved', 'rejected'].includes(decision.toLowerCase())) {
      return res.status(400).json({ error: 'Decision must be either "approved" or "rejected"' });
    }

    // Validate scores if provided
    if (scores) {
      const requiredCriteria = [
        'technologyReadiness',
        'innovationProblemSolving',
        'businessPerformance',
        'socialEconomicImpact',
        'resilienceAdaptability'
      ];

      for (const criterion of requiredCriteria) {
        if (!scores[criterion] || scores[criterion] < 1 || scores[criterion] > 5) {
          return res.status(400).json({ 
            error: `Invalid score for ${criterion}. Must be between 1 and 5` 
          });
        }
      }
    }

     const adjudicatorId = req.user.uid;
    const adjudicatorData = req.userData;

    // Calculate total score and percentage
    let totalScore = 0;
    let scorePercentage = 0;
    
    if (scores) {
  totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  scorePercentage = Math.round((totalScore / 25) * 100); // <-- ADDED Math.round()
}

    const existingReview = await db.collection('adjudications')
      .where('applicationId', '==', applicationId)
      .where('adjudicatorId', '==', adjudicatorId)
      .get();

    const reviewData = {
      applicationId: applicationId,
      adjudicatorId: adjudicatorId,
      adjudicatorName: adjudicatorData.displayName,
      adjudicatorEmail: adjudicatorData.email,
      adjudicatorProfilePicture: adjudicatorData.profilePicture || '', // ADD THIS
      decision: decision.toLowerCase(),
      comments: comments,
      scores: scores || null,
      totalScore: totalScore,
      scorePercentage: scorePercentage,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (!existingReview.empty) {
      // Update existing review
      const reviewDoc = existingReview.docs[0];
      await db.collection('adjudications').doc(reviewDoc.id).update(reviewData);

      return res.json({
        success: true,
        message: 'Review updated successfully',
        reviewId: reviewDoc.id,
        scorePercentage: scorePercentage
      });
    }

    // Create new review
    reviewData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    const reviewRef = await db.collection('adjudications').add(reviewData);

    res.json({
      success: true,
      message: 'Review submitted successfully',
      reviewId: reviewRef.id,
      scorePercentage: scorePercentage
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get adjudicator's own reviews
 */
const getMyReviews = async (req, res) => {
  try {
    const adjudicatorId = req.user.uid;

    const snapshot = await db.collection('adjudications')
      .where('adjudicatorId', '==', adjudicatorId)
      .orderBy('reviewedAt', 'desc')
      .get();

    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      reviewedAt: doc.data().reviewedAt?.toDate()
    }));

    res.json({
      success: true,
      reviews: reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all reviews for a specific application (Admin only)
 */
/**
 * Get all reviews for a specific application (Admin only)
 */
const getApplicationReviews = async (req, res) => {
  try {
    const { applicationId } = req.params;

    console.log('Fetching reviews for application:', applicationId);

    const snapshot = await db.collection('adjudications')
      .where('applicationId', '==', applicationId)
      .get();

    console.log('Found reviews:', snapshot.size);

    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        reviewedAt: data.reviewedAt?.toDate ? data.reviewedAt.toDate() : data.reviewedAt
      };
    });

    console.log('Processed reviews:', reviews);

    // Calculate summary
    const summary = {
      total: reviews.length,
      approved: reviews.filter(r => r.decision === 'approved').length,
      rejected: reviews.filter(r => r.decision === 'rejected').length
    };

    res.json({
      success: true,
      reviews: reviews,
      summary: summary
    });
  } catch (error) {
    console.error('Error fetching application reviews:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      reviews: []
    });
  }
};

/**
 * Get adjudicator's review for specific application
 */
const getMyReviewForApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const adjudicatorId = req.user.uid;

    const snapshot = await db.collection('adjudications')
      .where('applicationId', '==', applicationId)
      .where('adjudicatorId', '==', adjudicatorId)
      .get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        review: null
      });
    }

    const reviewDoc = snapshot.docs[0];
    const review = {
      id: reviewDoc.id,
      ...reviewDoc.data(),
      reviewedAt: reviewDoc.data().reviewedAt?.toDate()
    };

    res.json({
      success: true,
      review: review
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * Admin final approval of application
 */
const adminFinalApproval = async (req, res) => {
  try {
    const { applicationId, applicantEmail, applicantName, companyName } = req.body;

    if (!applicationId || !applicantEmail || !applicantName || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store final decision in Firestore
    await db.collection('final_decisions').doc(applicationId).set({
      applicationId: applicationId,
      decision: 'approved',
      decidedBy: req.user.uid,
      decidedByName: req.userData.displayName,
      decidedAt: admin.firestore.FieldValue.serverTimestamp(),
      applicantEmail: applicantEmail,
      applicantName: applicantName,
      companyName: companyName
    });

    // Send approval email

    await sendApplicationApprovalEmail({
      email: applicantEmail,
      applicantName: applicantName,
      companyName: companyName
    });

    res.json({
      success: true,
      message: 'Application approved and notification sent'
    });
  } catch (error) {
    console.error('Error in admin final approval:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Admin final rejection of application
 */
const adminFinalRejection = async (req, res) => {
  try {
    const { applicationId, applicantEmail, applicantName, companyName, reason } = req.body;

    if (!applicationId || !applicantEmail || !applicantName || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store final decision in Firestore
    await db.collection('final_decisions').doc(applicationId).set({
      applicationId: applicationId,
      decision: 'rejected',
      decidedBy: req.user.uid,
      decidedByName: req.userData.displayName,
      decidedAt: admin.firestore.FieldValue.serverTimestamp(),
      applicantEmail: applicantEmail,
      applicantName: applicantName,
      companyName: companyName,
      rejectionReason: reason || 'Not specified'
    });

    // Send rejection email

    await sendApplicationRejectionEmail({
      email: applicantEmail,
      applicantName: applicantName,
      companyName: companyName,
      reason: reason
    });

    res.json({
      success: true,
      message: 'Application rejected and notification sent'
    });
  } catch (error) {
    console.error('Error in admin final rejection:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get final decision for application
 */
const getFinalDecision = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const decisionDoc = await db.collection('final_decisions').doc(applicationId).get();

    if (!decisionDoc.exists) {
      return res.json({
        success: true,
        decision: null
      });
    }

    res.json({
      success: true,
      decision: {
        id: decisionDoc.id,
        ...decisionDoc.data(),
        decidedAt: decisionDoc.data().decidedAt?.toDate()
      }
    });
  } catch (error) {
    console.error('Error fetching final decision:', error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * Get total number of adjudicators
 */
const getTotalAdjudicators = async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'adjudicator')
      .where('status', '==', 'approved')
      .get();
    
    res.json({
      success: true,
      total: snapshot.size
    });
  } catch (error) {
    console.error('Error fetching total adjudicators:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get review counts for all applications
 */
const getAllReviewCounts = async (req, res) => {
  try {
    const snapshot = await db.collection('adjudications').get();
    
    const counts = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const appId = data.applicationId;
      counts[appId] = (counts[appId] || 0) + 1;
    });
    
    res.json({
      success: true,
      counts: counts
    });
    } catch (error) {
    console.error('Error fetching review counts:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all final decisions
 */
const getAllFinalDecisions = async (req, res) => {
  try {
    const snapshot = await db.collection('final_decisions').get();
    
    const decisions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      decidedAt: doc.data().decidedAt?.toDate()
    }));
    
    res.json({
      success: true,
      decisions: decisions
    });
  } catch (error) {
    console.error('Error fetching all final decisions:', error);
    res.status(500).json({ error: error.message });
  }
};



// ============================================
// EXPORTS
// ============================================


module.exports = {
  // Initialize
  //initializeFirebase,
  
  // Constants
  ROLES,
  USER_STATUS,
  
  // Middleware
  verifyToken,
  checkApproved,
  checkAdmin,
  checkAdjudicator,
  checkViewer,
  
  // Registration
  generateRegistrationLink,
  verifyRegistrationLink,
  signUpUser,
  
  // User Status
  checkUserStatus,
  
  // Admin Functions
  assignRole,
  getAllUsers,
  getActivityLogs,
  
  // Adjudicator Functions
  getPendingApplications,
  approveApplication,
  rejectApplication,

  // Profile management
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  
  // Viewer Functions
  getAdjudicationData,
  sendInviteEmail,

  // Firebase instances


  // ============================================
// ADJUDICATION FUNCTIONS (NEW)
// ============================================
  submitAdjudicatorReview,
  getMyReviews,
  getApplicationReviews,
  getMyReviewForApplication,

   // Admin Final Decision Functions
  adminFinalApproval,
  adminFinalRejection,
  getFinalDecision,

   getTotalAdjudicators,
  getAllReviewCounts,
  getAllFinalDecisions,
    


  db,
  auth,
  admin

};