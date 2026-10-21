module.exports.run = async (page, base, shot) => {
  const out = [];
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  await page.waitForFunction(() => document.querySelector('#st-model').textContent === 'hands 21-pt', {timeout: 180000});
  out.push(['mediapipe hands loaded (vendored wasm)', true]);
  const cases = [
    ['sample-fist.jpg', 'fist'],
    ['sample-thumbsup2.jpg', 'thumbs up'],
  ];
  for (const [file, want] of cases) {
    await page.click(`[data-s="${file}"]`);
    await page.waitForFunction(() => document.querySelector('#st-ms').textContent !== '-', {timeout: 120000});
    await sleep(4000); // allow the send loop to finish on stills
    const hands = await page.$eval('#st-hands', e => +e.textContent);
    const g = await page.$eval('#st-gesture', e => e.textContent);
    out.push([file + ' hands=' + hands + ' gesture="' + g + '" (want ' + want + ')', hands >= 1 && g === want]);
  }
  // re-run thumbs up to check panels in a known state
  await page.click('[data-s="sample-thumbsup2.jpg"]');
  await sleep(6000);
  const fingers = await page.$$eval('#fingers .frow', r => r.length);
  out.push(['finger state rows: ' + fingers, fingers === 5]);
  const active = await page.$eval('.gtag.on', e => e ? e.textContent : 'none').catch(() => 'none');
  out.push(['gesture tag highlighted: ' + active, active === 'thumbs up']);
  if (shot) await page.screenshot({path: shot});
  return out;
};
