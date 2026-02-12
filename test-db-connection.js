// Test PostgreSQL connection
const { Client } = require('pg');

// URL-encoded password: %5Btjxowl29%40%28%5D
const connectionStrings = [
  'postgresql://postgres:%5Btjxowl29%40%28%5D@db.xianrhwkdarupnvaumti.supabase.co:5432/postgres',
  'postgresql://postgres:%5Btjxowl29%40%28%5D@db.xianrhwkdarupnvaumti.supabase.co:6543/postgres?pgbouncer=true',
];

console.log('Testing connection to Supabase PostgreSQL...');

async function testConnection(connectionString, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${label}`);
  console.log(`Connection: ${connectionString.replace(/:[^@]+@/, ':****@')}`);
  console.log('='.repeat(60));

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✓ Successfully connected to database!');

    // Test a simple query
    const result = await client.query('SELECT version()');
    console.log('✓ Query test successful!');
    console.log('PostgreSQL version:', result.rows[0].version.split(',')[0]);

    // Get table count
    const tables = await client.query(`
      SELECT count(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log('Public tables count:', tables.rows[0].count);

    await client.end();
    console.log('✓ Connection test completed successfully!\n');
    return true;
  } catch (error) {
    console.error('✗ Connection failed!');
    console.error('Error:', error.message);
    console.error('Error code:', error.code);
    if (client._connected) {
      await client.end().catch(() => {});
    }
    return false;
  }
}

async function runTests() {
  console.log('Testing Supabase PostgreSQL connection with different configurations...');

  let success = false;

  // Test direct connection (port 5432)
  success = await testConnection(connectionStrings[0], 'Direct connection (port 5432)');

  if (!success) {
    // Test pooler connection (port 6543)
    success = await testConnection(connectionStrings[1], 'Pooler connection (port 6543)');
  }

  if (success) {
    console.log('\n🎉 At least one connection method worked!');
    process.exit(0);
  } else {
    console.log('\n❌ All connection attempts failed.');
    console.log('\nPossible issues:');
    console.log('1. Incorrect password or credentials');
    console.log('2. Database host not reachable (firewall/network)');
    console.log('3. IPv6 connectivity issues');
    console.log('4. Database project might be paused or deleted');
    console.log('\nCheck your Supabase dashboard for the correct connection string.');
    process.exit(1);
  }
}

runTests();
