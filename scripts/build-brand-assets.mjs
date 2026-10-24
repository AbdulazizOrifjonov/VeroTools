import sharp from 'sharp';
import fs from 'node:fs';

const SRC_IMG = 'C:/Users/Abdul/.gemini/antigravity/brain/67179704-cc59-4407-b6f0-988192149673/.user_uploaded/media_1792858824588_9877a575.jpg';
const BRAND_COLOR = '#FD8902';

const WORDMARK_PATH = 'M137.5 441L147 440.5L165 443.5L183 451.5L193 458.5L202.5 468L209.5 478L216.5 494L219.5 511L218.5 525L215.5 537L203.5 558L191 570.5L179 578.5L165 584.5L151 587.5L130 587.5L120 585.5L111 582.5L92 571.5L74.5 552L67.5 537L64.5 524L64.5 506L67.5 493L74.5 478L82.5 467L98 453.5L109 447.5L128 441.5L137 441.5ZM297.5 441L306 440.5L320 442.5L339 449.5L350 456.5L364.5 471L368.5 478L346 492.5L337 496.5L327 484.5L317 478.5L306 475.5L293 476.5L278 483.5L267.5 495L262.5 509L262.5 519L264.5 527L272.5 540L284 548.5L295 551.5L307 551.5L315 549.5L327 542.5L336 532.5L367.5 552L361.5 561L344 575.5L325 584.5L312 587.5L290 587.5L279 585.5L259 576.5L252 571.5L241.5 561L234.5 551L227.5 535L224.5 519L225.5 504L228.5 492L233.5 481L241.5 469L256 455.5L274 445.5L289 441.5L297 441.5ZM543.5 443L643 442.5L652.5 444L652.5 446L632 478.5L563.5 479L564 497.5L631.5 498L631 531.5L564 531.5L563.5 551L567 552.5L630 551.5L633.5 554L641.5 567L651.5 584L651 586.5L526.5 586L526.5 444L543 443.5ZM701.5 443L750 443.5L807.5 539L807.5 544L781 586.5L671 587.5L664.5 580L643.5 546L641.5 542L643.5 537L697.5 447L701 443.5ZM380.5 444L417.5 444L418 496.5L442 496.5L479 443.5L519.5 444L471.5 513L519.5 584L519 586.5L480 587.5L442 531.5L417.5 532L417 586.5L380.5 586L380.5 445ZM816.5 444L854 443.5L920 528.5L921.5 444L958 443.5L958.5 586L919 586.5L854 500.5L853.5 586L817 586.5L816.5 445ZM136.5 476L151 476.5L166 483.5L175.5 494L180.5 506L180.5 520L174.5 534L168 541.5L161 546.5L148 551.5L133 551.5L117 544.5L107.5 534L101.5 516L104.5 500L110.5 490L122 480.5L136 476.5ZM720.5 479L729 478.5L730.5 480L762.5 535L765.5 541L759 550.5L691 550.5L684.5 542L720.5 480Z';

function createIcoFromPngs(pngBuffers) {
  // Simple ICO builder from PNG buffers
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(numImages, 4);

  const direntries = [];
  let offset = 6 + numImages * 16;
  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset
    direntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...direntries, ...pngBuffers.map(p => p.buffer)]);
}

async function generate() {
  console.log('Generating OCKEAN brand assets from', SRC_IMG);

  // SVGs
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${BRAND_COLOR}"/>
  <path fill="#000000" fill-rule="evenodd" d="${WORDMARK_PATH}"/>
</svg>`;

  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" rx="220" fill="${BRAND_COLOR}"/>
  <path fill="#000000" fill-rule="evenodd" d="${WORDMARK_PATH}"/>
</svg>`;

  const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="64 440 895 148" width="895" height="148">
  <path fill="currentColor" fill-rule="evenodd" d="${WORDMARK_PATH}"/>
</svg>`;

  // Write SVGs to packages/config/brand
  fs.writeFileSync('packages/config/brand/logo.svg', logoSvg);
  fs.writeFileSync('packages/config/brand/wordmark.svg', wordmarkSvg);

  // Web and Admin SVGs
  fs.writeFileSync('apps/web/public/favicon.svg', faviconSvg);
  fs.writeFileSync('apps/admin/public/favicon.svg', faviconSvg);

  // Copy original
  fs.copyFileSync(SRC_IMG, 'packages/config/brand/logo-original.png');

  // Generate PNG sizes
  const sizes = [1024, 512, 256, 192, 180, 128, 64, 48, 32, 16];
  const pngCache = {};
  for (const s of sizes) {
    pngCache[s] = await sharp(SRC_IMG).resize(s, s).png({ quality: 100 }).toBuffer();
  }

  // Packages/config/brand PNGs
  fs.writeFileSync('packages/config/brand/logo-1024.png', pngCache[1024]);
  fs.writeFileSync('packages/config/brand/logo-512.png', pngCache[512]);
  fs.writeFileSync('packages/config/brand/logo-256.png', pngCache[256]);
  fs.writeFileSync('packages/config/brand/logo-192.png', pngCache[192]);
  fs.writeFileSync('packages/config/brand/logo-128.png', pngCache[128]);
  fs.writeFileSync('packages/config/brand/logo-64.png', pngCache[64]);
  fs.writeFileSync('packages/config/brand/app-icon.png', pngCache[1024]);
  fs.writeFileSync('packages/config/brand/adaptive-icon.png', pngCache[1024]);
  fs.writeFileSync('packages/config/brand/splash-icon.png', pngCache[512]);
  fs.writeFileSync('packages/config/brand/apple-touch-icon.png', pngCache[180]);

  // Favicon.ico (contains 16, 32, 48)
  const icoBuffer = createIcoFromPngs([
    { width: 48, height: 48, buffer: pngCache[48] },
    { width: 32, height: 32, buffer: pngCache[32] },
    { width: 16, height: 16, buffer: pngCache[16] },
  ]);
  fs.writeFileSync('packages/config/brand/favicon.ico', icoBuffer);
  fs.writeFileSync('apps/web/public/favicon.ico', icoBuffer);
  fs.writeFileSync('apps/admin/public/favicon.ico', icoBuffer);

  // Apps/web/public
  fs.writeFileSync('apps/web/public/logo-192.png', pngCache[192]);
  fs.writeFileSync('apps/web/public/logo-512.png', pngCache[512]);
  fs.writeFileSync('apps/web/public/apple-touch-icon.png', pngCache[180]);

  // Apps/admin/public
  fs.writeFileSync('apps/admin/public/logo-192.png', pngCache[192]);
  fs.writeFileSync('apps/admin/public/logo-512.png', pngCache[512]);
  fs.writeFileSync('apps/admin/public/apple-touch-icon.png', pngCache[180]);

  // Apps/api/assets
  fs.mkdirSync('apps/api/assets', { recursive: true });
  fs.writeFileSync('apps/api/assets/logo.png', pngCache[512]);

  // Apps/mobile/assets
  fs.mkdirSync('apps/mobile/assets', { recursive: true });
  fs.writeFileSync('apps/mobile/assets/logo.png', pngCache[512]);
  fs.writeFileSync('apps/mobile/assets/icon.png', pngCache[1024]);
  fs.writeFileSync('apps/mobile/assets/adaptive-icon.png', pngCache[1024]);
  fs.writeFileSync('apps/mobile/assets/splash-icon.png', pngCache[512]);
  fs.writeFileSync('apps/mobile/assets/favicon.png', pngCache[48]);

  // OG Image (1200 x 630 with orange background and logo in center)
  const ogCenterLogo = await sharp(SRC_IMG).resize(450, 450).toBuffer();
  const ogImage = await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 253, g: 137, b: 2, alpha: 1 },
    },
  })
    .composite([{ input: ogCenterLogo, left: Math.round((1200 - 450) / 2), top: Math.round((630 - 450) / 2) }])
    .png()
    .toBuffer();

  fs.writeFileSync('packages/config/brand/og-image.png', ogImage);
  fs.writeFileSync('apps/web/public/og-image.png', ogImage);

  // Mobile Splash Screen (1284 x 2778)
  const splashCenterLogo = await sharp(SRC_IMG).resize(600, 600).toBuffer();
  const mobileSplash = await sharp({
    create: {
      width: 1284,
      height: 2778,
      channels: 4,
      background: { r: 253, g: 137, b: 2, alpha: 1 },
    },
  })
    .composite([{ input: splashCenterLogo, left: Math.round((1284 - 600) / 2), top: Math.round((2778 - 600) / 2) }])
    .png()
    .toBuffer();

  fs.writeFileSync('apps/mobile/assets/splash.png', mobileSplash);

  // Mobile notification icon (96x96 transparent monochrome)
  const notifSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="64 440 895 148" width="96" height="16">
    <path fill="#FFFFFF" fill-rule="evenodd" d="${WORDMARK_PATH}"/>
  </svg>`;
  const notifBuffer = await sharp(Buffer.from(notifSvg)).resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  fs.writeFileSync('apps/mobile/assets/notification-icon.png', notifBuffer);

  const monochromeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    <path fill="#FFFFFF" fill-rule="evenodd" d="${WORDMARK_PATH}"/>
  </svg>`;
  const monochromeBuffer = await sharp(Buffer.from(monochromeSvg)).png().toBuffer();
  fs.writeFileSync('apps/mobile/assets/adaptive-icon-monochrome.png', monochromeBuffer);

  console.log('✅ ALL OCKEAN brand assets generated successfully!');
}

generate().catch(console.error);
