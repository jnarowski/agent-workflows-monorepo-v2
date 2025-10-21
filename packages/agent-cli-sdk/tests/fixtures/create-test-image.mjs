#!/usr/bin/env node

/**
 * Creates a simple PNG test image with text
 * Uses canvas to generate the image
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a 400x200 canvas
const canvas = createCanvas(400, 200);
const ctx = canvas.getContext('2d');

// White background
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, 400, 200);

// Draw "Hello World" text
ctx.fillStyle = 'black';
ctx.font = 'bold 48px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('Hello World', 200, 80);

// Draw subtitle
ctx.fillStyle = 'gray';
ctx.font = '24px Arial';
ctx.fillText('Test Image for Codex', 200, 130);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
const outputPath = join(__dirname, 'test-image.png');
writeFileSync(outputPath, buffer);

console.log('✅ Test image created:', outputPath);
