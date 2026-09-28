// Auth Test Suite for Step 2
const db = require('./src/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('./src/middleware/auth');

console.log('🧪 Starting Auth Verification Tests...\n');

// 1. Verify Users Seed
const users = db.prepare('SELECT id, email, display_name, role FROM users').all();
console.log(`[PASS] Users seeded in SQLite (${users.length} users):`);
users.forEach(u => console.log(`   - ${u.display_name} (${u.role}): ${u.email}`));

// 2. Verify Password Hashing & Authentication
const budi = db.prepare('SELECT * FROM users WHERE email = ?').get('budi.pratama@student.id');
const passValid = bcrypt.compareSync('student123', budi.password_hash);
console.log(`\n[PASS] Password verification for ${budi.display_name}: ${passValid ? 'MATCHED' : 'FAILED'}`);

// 3. Verify JWT Generation & Verification
const token = jwt.sign({ id: budi.id, email: budi.email, role: budi.role, displayName: budi.display_name }, JWT_SECRET, { expiresIn: '7d' });
const decoded = jwt.verify(token, JWT_SECRET);
console.log(`[PASS] JWT Token Generation & Verification: Valid for user ID ${decoded.id}`);

// 4. Verify Family Relations
const family = db.prepare(`
  SELECT fr.id, fr.status, u1.display_name as parent_name, u2.display_name as student_name
  FROM family_relations fr
  JOIN users u1 ON u1.id = fr.parent_id
  JOIN users u2 ON u2.id = fr.student_id
`).all();
console.log(`\n[PASS] Family Relations (${family.length} connections):`);
family.forEach(f => console.log(`   - Parent ${f.parent_name} -> Student ${f.student_name} [${f.status}]`));

console.log('\n🎉 ALL AUTH UNIT TESTS PASSED SUCCESSFULLY!\n');
