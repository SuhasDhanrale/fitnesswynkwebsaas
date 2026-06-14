const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Read the credentials
const serviceAccountPath = path.resolve(__dirname, 'firebase-key.json.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function exportMembers() {
  console.log('Fetching members from Firestore...');
  const snapshot = await db.collection('members').get();
  
  let sql = `-- Migration SQL for members collection\n`;

  let insertCount = 0;

  snapshot.forEach(doc => {
    const data = doc.data();
    
    const id = data.id || doc.id;
    const name = (data.name || '').replace(/'/g, "''");
    const phone = (data.phoneNumber || '').replace(/'/g, "''");
    const batch = (data.batch || '').replace(/'/g, "''");
    const planName = (data.planName || '').replace(/'/g, "''");
    const durationLabel = (data.durationLabel || '').replace(/'/g, "''");
    
    // Dates are stored as milliseconds timestamp in firebase, and target table expects BIGINT
    const startDate = data.startDate ? `${data.startDate}` : 'NULL';
    const expiryDate = data.expiryDate ? `${data.expiryDate}` : 'NULL';
    
    const dueAmount = data.dueAmount || 0;
    const notes = (data.notes || '').replace(/'/g, "''");

    sql += `INSERT INTO public.members (id, name, phone_number, batch, plan_name, duration_label, start_date, expiry_date, due_amount, notes) `;
    sql += `VALUES ('${id}', '${name}', '${phone}', '${batch}', '${planName}', '${durationLabel}', ${startDate}, ${expiryDate}, ${dueAmount}, '${notes}') `;
    sql += `ON CONFLICT (id) DO NOTHING;\n`;
    
    insertCount++;
  });

  const outPath = path.resolve(__dirname, 'members_migration.sql');
  fs.writeFileSync(outPath, sql);
  console.log(`Exported ${insertCount} members to members_migration.sql`);
  process.exit(0);
}

exportMembers().catch(err => {
  console.error('Error during migration:', err);
  process.exit(1);
});
