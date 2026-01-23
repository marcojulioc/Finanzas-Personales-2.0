import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = join(__dirname, '../public/icons/icon.svg');
const outputDir = join(__dirname, '../public/icons');

async function generateIcons() {
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  for (const size of sizes) {
    const outputPath = join(outputDir, `icon-${size}x${size}.png`);

    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Generate Apple Touch Icon (180x180)
  await sharp(inputSvg)
    .resize(180, 180)
    .png()
    .toFile(join(outputDir, 'apple-touch-icon.png'));
  console.log('Generated: apple-touch-icon.png');

  // Generate favicon (32x32)
  await sharp(inputSvg)
    .resize(32, 32)
    .png()
    .toFile(join(__dirname, '../public/favicon.png'));
  console.log('Generated: favicon.png');

  // Generate favicon.ico (16x16)
  await sharp(inputSvg)
    .resize(16, 16)
    .png()
    .toFile(join(__dirname, '../public/favicon-16.png'));
  console.log('Generated: favicon-16.png');

  console.log('\nAll PWA icons generated successfully!');
}

generateIcons().catch(console.error);
