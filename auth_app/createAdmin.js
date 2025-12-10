// scripts/createAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const createFirstAdmin = async () => {
  try {
    const email = 'admin@example.com';
    const password = 'SecurePassword123!';
    const displayName = 'System Admin';
    
    // Create user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName
    });
    
    // Create Firestore document
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role: 'admin',
      status: 'approved',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: 'system',
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'admin',
      status: 'approved'
    });
    
    console.log('Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('UID:', userRecord.uid);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createFirstAdmin();