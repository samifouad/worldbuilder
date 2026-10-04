const { chromium } = require('playwright');
const errors = [];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto('http://localhost:8642', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'shots/1-pov.png' });

  const counts = () => page.evaluate(() => ({ props: window.__scene.environment.props.length, cams: window.__scene.cameras.length }));

  // --- placement: ghost, invalid-deny, commit ---
  await page.mouse.click(640, 450, { button: 'middle' });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'shots/5-menu.png' });
  await page.click('#ctxmenu [data-act="streetlamp"]');
  await page.waitForTimeout(150);
  await page.mouse.move(500, 520);            // open ground
  await page.waitForTimeout(150);
  const ghostFree = await page.evaluate(() => window.__ghost);
  const dumpsterXY = await page.evaluate(() => window.__project(3.1, 0.5, -6));
  await page.mouse.move(dumpsterXY[0], dumpsterXY[1]);   // over the dumpster
  await page.waitForTimeout(150);
  const ghostBad = await page.evaluate(() => window.__ghost);
  await page.screenshot({ path: 'shots/6-red.png' });
  await page.mouse.click(dumpsterXY[0], dumpsterXY[1]);  // left-click on red: must NOT commit
  await page.waitForTimeout(150);
  const afterDeny = await counts();
  await page.keyboard.press('Escape');                   // cancel
  await page.waitForTimeout(150);
  const afterCancel = await counts();

  // --- placement commit on free ground ---
  await page.mouse.click(640, 450, { button: 'middle' });
  await page.waitForTimeout(150);
  await page.click('#ctxmenu [data-act="streetlamp"]');
  await page.mouse.move(480, 520);
  await page.waitForTimeout(150);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(150);
  const afterCommit = await counts();
  await page.screenshot({ path: 'shots/7-placed.png' });

  // --- move the first crate by dragging it ---
  // face the crate deterministically: stand at origin, look at it
  await page.evaluate(() => { const p = window.__player; p.pos.set(0, 1.7, 0); p.yaw = 2.38; p.pitch = -0.3; });
  await page.waitForTimeout(200);
  const crateBefore = await page.evaluate(() => [...window.__scene.environment.props[4].position]);
  const crateXY = await page.evaluate(() => window.__project(-2.9, 0.34, 3));
  const dstXY = await page.evaluate(() => window.__project(-1.6, 0, 5));  // open ground
  await page.mouse.move(crateXY[0], crateXY[1]);
  await page.mouse.down();
  await page.mouse.move(dstXY[0], dstXY[1], { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const crateAfter = await page.evaluate(() => [...window.__scene.environment.props[4].position]);
  await page.screenshot({ path: 'shots/8-moved.png' });

  // --- rotate + raise the crate (it's still selected after the drag) ---
  await page.keyboard.press('KeyE');
  await page.keyboard.press('KeyE');
  await page.mouse.wheel(0, -240);   // scroll up = raise
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(150);
  const crateAdjusted = await page.evaluate(() => window.__scene.environment.props[4]);

  // --- right-click a wall: menu should offer only camera + neon sign ---
  await page.evaluate(() => { const p = window.__player; p.pos.set(0, 1.7, -8); p.yaw = Math.PI / 2; p.pitch = 0; });
  await page.waitForTimeout(200);
  const wallXY = await page.evaluate(() => window.__project(-4.4, 2.6, -8.5));
  await page.mouse.click(wallXY[0], wallXY[1], { button: 'middle' });
  await page.waitForTimeout(200);
  const wallMenu = await page.evaluate(() =>
    [...document.querySelectorAll('#ctxmenu [data-act]')].filter(el => el.style.display !== 'none').map(el => el.dataset.act));
  await page.screenshot({ path: 'shots/10-wallmenu.png' });
  await page.click('#ctxmenu [data-act="neonSign"]');
  await page.waitForTimeout(150);
  const wallXY2 = await page.evaluate(() => window.__project(-4.4, 3.2, -7));
  await page.mouse.move(wallXY2[0], wallXY2[1]);
  await page.waitForTimeout(150);
  const wallGhost = await page.evaluate(() => window.__ghost);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(150);
  const afterWall = await page.evaluate(() => {
    const p = window.__scene.environment.props.at(-1);
    return { count: window.__scene.environment.props.length, wall: p.wall, pos: p.position };
  });
  await page.screenshot({ path: 'shots/11-wallsign.png' });

  // --- add a camera, look through it ---
  await page.evaluate(() => { const p = window.__player; p.pos.set(0, 1.7, 6); p.yaw = 0; p.pitch = -0.15; });
  await page.waitForTimeout(200);
  await page.mouse.click(640, 700, { button: 'middle' });
  await page.waitForTimeout(300);
  await page.waitForTimeout(150);
  await page.click('#ctxmenu [data-act="camera"]');
  await page.waitForTimeout(200);
  const afterCam = await counts();
  await page.click('#cam-4');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/9-newcam.png' });

  // --- recorder still works ---
  await page.click('#cam-2');
  await page.waitForTimeout(400);
  await page.click('#rec');
  await page.waitForTimeout(2500);
  await page.click('#rec');
  await page.waitForTimeout(800);
  const takes = await page.evaluate(() => window.__takes);

  console.log(JSON.stringify({ errors, ghostFree, ghostBad, afterDeny, afterCancel, afterCommit, crateBefore, crateAfter, crateAdjusted, wallMenu, wallGhost, afterWall, afterCam, takes }, null, 2));
  await browser.close();
})().catch(async e => { console.error('FATAL:', e.message, '\npage errors:', errors); process.exit(1); });
