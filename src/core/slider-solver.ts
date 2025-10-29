import sharp from 'sharp';
import { ICaptchaContent, ITile, ITileInfo } from '../types';

export class SliderCaptchaSolver {
  private readonly DEFAULT_TILE_COUNT = 5;
  private readonly DEFAULT_MAX_STEPS = 50;

  public async solve(
    content: ICaptchaContent,
  ): Promise<{ stepCount: number; selectedSwaps: number[] }> {
    const { image: base64Image, steps: rawSteps } = content;

    if (!base64Image || !Array.isArray(rawSteps) || rawSteps.length === 0) {
      return { stepCount: 0, selectedSwaps: [] };
    }

    const stepsForProcessing = rawSteps.length > 1 ? rawSteps.slice(1) : [];

    const imageBuffer = Buffer.from(base64Image, 'base64');
    const originalImage = sharp(imageBuffer);

    const { bestStep, bestSwaps } = await this.findOptimalStepCount(
      originalImage,
      stepsForProcessing,
      this.DEFAULT_MAX_STEPS,
      this.DEFAULT_TILE_COUNT,
      content.extension,
    );

    return {
      stepCount: bestStep,
      selectedSwaps: bestSwaps,
    };
  }

  private computeTileLayout(imageWidth: number, imageHeight: number, tileCount: number): ITileInfo {
    const verticalLines = Array.from({ length: tileCount + 1 }, (_, i) =>
      Math.round((i * imageWidth) / tileCount),
    );
    const horizontalLines = Array.from({ length: tileCount + 1 }, (_, i) =>
      Math.round((i * imageHeight) / tileCount),
    );

    const tiles: ITile[] = [];
    for (let row = 0; row < tileCount; row++) {
      for (let col = 0; col < tileCount; col++) {
        const x = verticalLines[col];
        const y = horizontalLines[row];
        const width = verticalLines[col + 1] - x;
        const height = horizontalLines[row + 1] - y;
        tiles.push({ x, y, width, height });
      }
    }

    return {
      tiles,
      grid: {
        vertical: verticalLines,
        horizontal: horizontalLines,
      },
    };
  }

  private async calculateSeamScore(imageBuffer: Buffer, tileCount: number): Promise<number> {
    const image = sharp(imageBuffer);
    const { width, height } = await image.metadata();
    if (!width || !height) throw new Error('Invalid image dimensions');

    const { grid } = this.computeTileLayout(width, height, tileCount);
    const { data } = await image.raw().toBuffer({ resolveWithObject: true });

    let totalDiff = 0;

    // Vertical seams
    for (let row = 0; row < tileCount; row++) {
      const yStart = grid.horizontal[row];
      const yEnd = grid.horizontal[row + 1];
      for (let col = 1; col < tileCount; col++) {
        const seamX = grid.vertical[col];
        for (let y = yStart; y < yEnd; y++) {
          const leftIdx = (y * width + seamX - 1) * 3;
          const rightIdx = (y * width + seamX) * 3;
          totalDiff += Math.abs(data[leftIdx] - data[rightIdx]);
          totalDiff += Math.abs(data[leftIdx + 1] - data[rightIdx + 1]);
          totalDiff += Math.abs(data[leftIdx + 2] - data[rightIdx + 2]);
        }
      }
    }

    // Horizontal seams
    for (let col = 0; col < tileCount; col++) {
      const xStart = grid.vertical[col];
      const xEnd = grid.vertical[col + 1];
      for (let row = 1; row < tileCount; row++) {
        const seamY = grid.horizontal[row];
        for (let x = xStart; x < xEnd; x++) {
          const topIdx = ((seamY - 1) * width + x) * 3;
          const bottomIdx = (seamY * width + x) * 3;
          totalDiff += Math.abs(data[topIdx] - data[bottomIdx]);
          totalDiff += Math.abs(data[topIdx + 1] - data[bottomIdx + 1]);
          totalDiff += Math.abs(data[topIdx + 2] - data[bottomIdx + 2]);
        }
      }
    }

    return Math.round(totalDiff);
  }

  private async applyTilePermutation(
    sourceImage: sharp.Sharp,
    tileLayout: ITileInfo,
    permutation: number[],
    outputWidth: number,
    outputHeight: number,
    extension: ICaptchaContent['extension'],
  ): Promise<Buffer> {
    const operations = [];
    const tileCount = Math.sqrt(permutation.length);
    let tileIndex = 0;

    for (let row = 0; row < tileCount; row++) {
      for (let col = 0; col < tileCount; col++) {
        const destX = tileLayout.grid.vertical[col];
        const destY = tileLayout.grid.horizontal[row];
        const destW = tileLayout.grid.vertical[col + 1] - destX;
        const destH = tileLayout.grid.horizontal[row + 1] - destY;

        const srcTile = tileLayout.tiles[permutation[tileIndex]];
        const tileBuffer = await sourceImage
          .clone()
          .extract({
            left: srcTile.x,
            top: srcTile.y,
            width: srcTile.width,
            height: srcTile.height,
          })
          .resize(destW, destH, { fit: 'fill', kernel: 'nearest' })
          .toBuffer();

        operations.push({ input: tileBuffer, left: destX, top: destY });
        tileIndex++;
      }
    }

    return sharp({
      create: {
        width: outputWidth,
        height: outputHeight,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite(operations)
      [extension]()
      .toBuffer();
  }

  private async findOptimalStepCount(
    originalImage: sharp.Sharp,
    swapSequence: number[],
    maxSteps: number,
    tileCount: number,
    extension: ICaptchaContent['extension'],
  ): Promise<{ bestStep: number; bestSwaps: number[] }> {
    const metadata = await originalImage.metadata();
    const width = metadata.width!;
    const height = metadata.height!;
    const tileLayout = this.computeTileLayout(width, height, tileCount);

    let currentPermutation = Array.from({ length: tileCount * tileCount }, (_, i) => i);
    let bestScore = Infinity;
    let bestStep = 0;
    let bestSwaps: number[] = [];

    const originalBuffer = await originalImage.clone().toBuffer();

    for (let step = 0; step < maxSteps; step++) {
      const swapIndex = step * 2;
      if (swapIndex + 1 >= swapSequence.length) break;

      const a = swapSequence[swapIndex];
      const b = swapSequence[swapIndex + 1];
      if (a >= 0 && a < currentPermutation.length && b >= 0 && b < currentPermutation.length) {
        [currentPermutation[a], currentPermutation[b]] = [
          currentPermutation[b],
          currentPermutation[a],
        ];
      }

      const permutedImage = await this.applyTilePermutation(
        sharp(originalBuffer),
        tileLayout,
        currentPermutation,
        width,
        height,
        extension,
      );

      const score = await this.calculateSeamScore(permutedImage, tileCount);

      if (score < bestScore) {
        bestScore = score;
        bestStep = step + 1;
        bestSwaps = swapSequence.slice(0, (step + 1) * 2);
      }
    }

    return { bestStep, bestSwaps };
  }
}
