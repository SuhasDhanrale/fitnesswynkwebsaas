const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.resolve(__dirname, 'firebase-key.json.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function exportPayments() {
  console.log('Fetching payments from Firestore...');
  const snapshot = await db.collection('payments').get();

  const docs = [];
  snapshot.forEach(doc => {
    docs.push({ id: doc.id, ...doc.data() });
  });

  console.log(`Found ${docs.length} payments`);
  console.log('Sample (first 3):');
  console.log(JSON.stringify(docs.slice(0, 3), null, 2));

  fs.writeFileSync(path.resolve(__dirname, 'payments_raw.json'), JSON.stringify(docs, null, 2));
  console.log('\nAll payments saved to payments_raw.json');
  process.exit(0);
}

exportPayments().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
