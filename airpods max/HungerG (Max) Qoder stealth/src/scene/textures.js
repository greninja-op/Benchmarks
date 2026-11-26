import * as THREE from 'three';

const cache = new Map();

function seededRandom(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function canvasTexture(key, size, painter, color = false) {
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  painter(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

export function createKnitTextures() {
  const map = canvasTexture('knit-map', 512, (context, size) => {
    context.fillStyle = '#f4f3ef';
    context.fillRect(0, 0, size, size);
    const step = 16;
    context.lineWidth = 3.2;
    for (let y = -step; y < size + step; y += step) {
      for (let x = -step; x < size + step; x += step) {
        const offset = ((y / step) & 1) * (step / 2);
        context.strokeStyle = '#b7b6b1';
        context.beginPath();
        context.moveTo(x + offset, y);
        context.lineTo(x + offset + step / 2, y + step / 2);
        context.lineTo(x + offset, y + step);
        context.stroke();
        context.strokeStyle = '#ffffff';
        context.lineWidth = 1.4;
        context.beginPath();
        context.moveTo(x + offset + 3, y + 1);
        context.lineTo(x + offset + step / 2 + 1, y + step / 2);
        context.lineTo(x + offset + 3, y + step - 1);
        context.stroke();
        context.lineWidth = 3.2;
      }
    }
    const random = seededRandom(44);
    for (let i = 0; i < 9000; i += 1) {
      const shade = 190 + Math.floor(random() * 60);
      context.fillStyle = `rgba(${shade},${shade},${shade},0.16)`;
      context.fillRect(random() * size, random() * size, 1, 1);
    }
  }, true);

  const bump = canvasTexture('knit-bump', 512, (context, size) => {
    context.fillStyle = '#777';
    context.fillRect(0, 0, size, size);
    const step = 16;
    context.lineWidth = 5;
    for (let y = -step; y < size + step; y += step) {
      for (let x = -step; x < size + step; x += step) {
        const offset = ((y / step) & 1) * (step / 2);
        const gradient = context.createLinearGradient(x, y, x + step / 2, y + step / 2);
        gradient.addColorStop(0, '#999');
        gradient.addColorStop(0.5, '#444');
        gradient.addColorStop(1, '#aaa');
        context.strokeStyle = gradient;
        context.beginPath();
        context.moveTo(x + offset, y);
        context.lineTo(x + offset + step / 2, y + step / 2);
        context.lineTo(x + offset, y + step);
        context.stroke();
      }
    }
  });

  const alpha = canvasTexture('knit-alpha', 256, (context, size) => {
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size, size);
    const step = 8;
    context.fillStyle = '#161616';
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        if ((x / step + y / step) % 2 === 0) {
          context.beginPath();
          context.ellipse(x + step / 2, y + step / 2, 1.25, 2.1, -0.6, 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  });

  return { map, bump, alpha };
}

export function createMicroNormalTexture(seed = 7, strength = 0.2) {
  return canvasTexture(`micro-normal-${seed}-${strength}`, 256, (context, size) => {
    const image = context.createImageData(size, size);
    const random = seededRandom(seed);
    for (let i = 0; i < image.data.length; i += 4) {
      const dx = (random() - 0.5) * strength;
      const dy = (random() - 0.5) * strength;
      const length = Math.sqrt(dx * dx + dy * dy + 1);
      image.data[i] = Math.round((dx / length * 0.5 + 0.5) * 255);
      image.data[i + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
      image.data[i + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  });
}

export function createCaseTextures() {
  const map = canvasTexture('case-map', 512, (context, size) => {
    const random = seededRandom(93);
    context.fillStyle = '#f4f2ed';
    context.fillRect(0, 0, size, size);
    for (let i = 0; i < 32000; i += 1) {
      const shade = 120 + Math.floor(random() * 110);
      context.fillStyle = `rgba(${shade},${shade},${shade},${0.04 + random() * 0.09})`;
      context.fillRect(random() * size, random() * size, 1 + random(), 1 + random());
    }
  }, true);
  return { map, normal: createMicroNormalTexture(29, 0.34) };
}

export function createAcousticTexture(letter) {
  return canvasTexture(`acoustic-${letter}`, 512, (context, size) => {
    context.fillStyle = '#26282a';
    context.fillRect(0, 0, size, size);
    const step = 9;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const gradient = context.createRadialGradient(x + 4, y + 3, 0, x + 4, y + 4, 4);
        gradient.addColorStop(0, '#090a0b');
        gradient.addColorStop(0.55, '#111315');
        gradient.addColorStop(0.75, '#62666a');
        gradient.addColorStop(1, '#272a2d');
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x + ((y / step) % 2) * 3, y + 4, 2.3, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.fillStyle = 'rgba(155,160,164,0.34)';
    context.font = '500 210px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(letter, size / 2, size / 2 + 12);
  }, true);
}

export function createGrilleTexture() {
  const map = canvasTexture('grille-map', 512, (context, size) => {
    context.fillStyle = '#3e4245';
    context.fillRect(0, 0, size, size);
    const spacing = 18;
    for (let y = -spacing; y < size + spacing; y += spacing) {
      for (let x = -spacing; x < size + spacing; x += spacing) {
        const offset = ((y / spacing) & 1) * (spacing / 2);
        const gradient = context.createRadialGradient(x + offset, y, 1, x + offset, y, 6.5);
        gradient.addColorStop(0, '#050607');
        gradient.addColorStop(0.62, '#08090a');
        gradient.addColorStop(0.78, '#83888c');
        gradient.addColorStop(1, '#3a3e41');
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x + offset, y, 6.4, 0, Math.PI * 2);
        context.fill();
      }
    }
  }, true);
  return { map, bump: map };
}
