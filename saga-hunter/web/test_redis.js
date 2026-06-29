const Redis = require('ioredis');
const { execSync } = require('child_process');
const r = new Redis('redis://redis:6379/0');
r.on('message', (ch, msg) => { console.log('GOT:', ch, msg); });
r.subscribe('sagahunter:test5', () => {
  console.log('SUBSCRIBED');
  execSync('/venv/bin/python3 -c "import sys; sys.path.insert(0,\'/app/python\'); from app.redis_client import publish_event; publish_event(\'test5\',\'ping_from_python\')"', {shell: '/bin/sh'});
  console.log('PYTHON DONE');
  setTimeout(() => process.exit(0), 2000);
});
