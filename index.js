const pg = require('pg');
const QueryStream = require('pg-query-stream');

const pool = new pg.Pool({
  user:  'jubilant',
  password: 'jubilant',
  poolSize: 1,
  connectionTimeoutMillis: 400,
  statement_timeout: 400,
});

(async () => {
  console.log('Starting...');
  const query = new QueryStream('SELECT * FROM GENERATE_SERIES(0, 100000)');
  console.log('Querying...');
  const client = await pool.connect();
  const stream = await client.query(query);
  console.log('Got stream');

  console.log('Running simple query (which should time out)...');
  try {
    const res = await pool.query('SELECT TRUE');
    throw new Error(`Unexpected res (should have failed): ${JSON.stringify(res, null, 2)}`);
  } catch(err) {
    if(err.message !== 'timeout exceeded when trying to connect') throw new Error(`Unexpected failure: ${err}`);
    console.log('Failed as expected.');
  }

  await stream.destroy(); // without this, next attempt at pool.query() will hang
  await client.release();
  console.log('Destroyed.');

  console.log('Querying again...');
  const res = await pool.query('SELECT TRUE AS val');
  if(res.rows.length !== 1 || res.rows[0].val !== true) {
    throw new Error(`Unexpected res: ${JSON.stringify(res.rows)}`);
  } else {
    console.log('Got expected result.');
  }
  console.log('Completed OK.');
})();
