import { Random } from './random';
import SimplexNoise from 'simplex-noise';

const TAU = 2 * Math.PI;

export class PerlinWorldGenerator {

  private random: Random;
  private simplex: SimplexNoise;
  private width: number;
  private height: number;

  constructor(seed: number, width: number, height: number) {
    this.random = new Random(seed);
    this.simplex = new SimplexNoise(this.random.randFloat);
    this.width = width;
    this.height = height;
  }

  getTile(elevation: number, temp: number): string {
    if (elevation < 35) {
      return 'ocean';
    } else if (elevation < 45) {
      return 'river';
    } else if (elevation < 50) {
      return 'plains'; // lowlands
    } else if (elevation < 90) {
      if (temp < 70) {
        return 'plains';
      } else {
        return 'desert';
      }
    } else {
      return 'mountain';
    }
  }

  getElevation(x: number, y: number): number {
    const mapScale = 0.015;
    const freq1 = (mapScale * 1) * this.width;
    const noise1 = this.ridgenoise(x / this.width, y / this.width, freq1);
    const freq2 = (mapScale * 2) * this.width;
    const noise2 = 0.5 * this.ridgenoise(x / this.width, y / this.width, freq2) * noise1;
    const freq3 = (mapScale * 4) * this.width;
    const noise3 = 0.25 * this.ridgenoise(x / this.width, y / this.width, freq3) * (noise1 + noise2);
    const noiseVal = noise1 + noise2 + noise3;
    return Math.pow(noiseVal, 1) / 1.75 * 100;
  }

  getTemp(x: number, y: number): number {
    const mapScale = 0.01;
    const freq1 = (mapScale * 1) * this.width;
    const noise1 = this.cylindernoise(x / this.width, y / this.width, freq1);
    const freq2 = (mapScale * 2) * this.width;
    const noise2 = 0.5 * this.cylindernoise(x / this.width, y / this.width, freq2) * noise1;
    const noiseVal = noise1 + noise2;
    return noiseVal / 1.5 * 100;
  }

  ridgenoise(nx: number, ny: number, freq: number): number {
    return 2 * (0.5 - Math.abs(0.5 - this.cylindernoise(nx, ny, freq)));
  }

  cylindernoise(nx: number, ny: number, freq: number): number {
    const angle_x = TAU * nx;
    return (this.simplex.noise3D(
        Math.cos(angle_x) / TAU * freq,
        Math.sin(angle_x) / TAU * freq,
        ny * freq
    ) + 1) / 2;
  }

  generate(): [string[], number[]] {
    const { width, height } = this;
    const tiles: string[] = [];
    const heightMap: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const elevation = this.getElevation(x, y);
        const temp = this.getTemp(x, y);
        tiles.push(this.getTile(elevation, temp));
        heightMap.push(elevation);
      }
    }

    return [tiles, heightMap];
  }
}

export class WorldGenerator {

  private random: Random;
  private tiles: string[];
  private heightMap: number[];
  private riverCoords: [number, number][];
  private mtCoords: [number, number][];
  private genPoints: string[];
  private width: number;
  private height: number;
  private tc: number;

  constructor(seed: number, width: number, height: number) {
    this.random = new Random(seed);
    this.tiles = [];
    this.heightMap = [];
    this.riverCoords = [];
    this.mtCoords = [];
    this.genPoints = [];
    this.width = width;
    this.height = height;
  }

  private pos(x: number, y: number): number {
    return (y * this.width) + x;
  }

  private getTile(x: number, y: number): string {
    return this.tiles[this.pos(x, y)];
  }

  private setTile(x: number, y: number, tile: string): void {
    this.tiles[this.pos(x, y)] = tile;
  }

  generate(continentSizeMin: number, continentSizeMax: number, continents: number): [string[], number[]] {
    const { width, height, random } = this;
    this.generateOcean();

    this.riverCoords = [];

    for (let i = 0; i < Math.ceil((continents / 100) * width); i++) {
      const x = random.randInt(width);
      const y = random.doubleRandInt(0, height*0.2, height*0.8, height);
      this.generateLandmass(x, y, random.randInt(width * continentSizeMin, width * continentSizeMax), 'plains', continents, width);
    }

    return [this.tiles, this.heightMap];
  }

  private generateOcean(): void {
    const { width, height } = this;
    this.tiles = [];
    this.heightMap = [];
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        this.tiles.push('ocean');
        this.heightMap.push(0);
      }
    }
  }

  private generateLandmass(x: number, y: number, radius: number, biomeTile: string, continents: number, mapWidth: number): void {
    const { random } = this;
    this.tc = 0;
    this.genPoints = [];
    this.mtCoords = [[x, y]];
    this.generateLandStep(x, y, radius, biomeTile, 'mountain');
    this.generateHeightMap(...this.mtCoords[0], Math.round(radius * 1.5), 10);
    const mtCoord = this.mtCoords.shift();
    if (random.randInt(3) === 0 && mtCoord) {
      this.riverCoords.push(mtCoord);
    }
    // const l = this.mtCoords.length;
    while (this.mtCoords.length > 0) {
      const mtCoord = this.mtCoords.shift();
      if (!mtCoord) continue;
      this.generateHeightMap(...mtCoord, radius * 3, 2);
      if (random.randInt(3) === 0 && mtCoord) {
        this.riverCoords.push(mtCoord);
      }
    }
  }

  private generateLandStep(x: number, y: number, radius: number, biomeTile: string, borderTile: string): void {
    const { width, height, random } = this;
    if (y >= 0 && y < width) {
      if (!(this.genPoints.includes(`${x}/${y}`))) {
        if (this.getTile(x, y) === biomeTile) {
          this.setTile(x, y, borderTile);
          this.mtCoords.push([x % width, y % height]);
          this.genPoints.push(`${x}/${y}`);
          if (random.randInt(radius) > 0 && this.getTile(x + 1, y) !== biomeTile) {
            this.generateLandStep(x + 1, y, Math.floor(radius / 3), biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && this.getTile(x, y + 1) !== biomeTile) {
            this.generateLandStep(x, y + 1, Math.floor(radius / 3), biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && this.getTile(x, y - 1) !== biomeTile) {
            this.generateLandStep(x, y - 1, Math.floor(radius / 3), biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && this.getTile(x - 1, y) !== biomeTile) {
            this.generateLandStep(x - 1, y, Math.floor(radius / 3), biomeTile, borderTile);
          }
        } else {
          this.setTile(x, y, biomeTile);
          this.genPoints.push(`${x}/${y}`);
          this.tc++;
          if (random.randInt(radius) > 0 && !(this.genPoints.includes(`${x + 1}/${y}`))) {
            this.generateLandStep(x + 1, y, radius - 1, biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && !(this.genPoints.includes(`${x}/${y + 1}`))) {
            this.generateLandStep(x, y + 1, radius - 1, biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && !(this.genPoints.includes(`${x}/${y - 1}`))) {
            this.generateLandStep(x, y - 1, radius - 1, biomeTile, borderTile);
          }
          if (random.randInt(radius) > 0 && !(this.genPoints.includes(`${x - 1}/${y}`))) {
            this.generateLandStep(x - 1, y, radius - 1, biomeTile, borderTile);
          }
        }
      }
    }
  }

  private generateHeightMap(x: number, y: number, h: number, d: number): void {
    const { random } = this;
    if (y > 0 && y < this.height) {
      if (this.heightMap[this.pos(x, y)] < h) {
        this.heightMap[this.pos(x, y)] = h;
        if (h > 0) {
          this.generateHeightMap(x + 1, y, h - (random.randInt( Math.ceil(h / d) ) + 1), d);
          this.generateHeightMap(x, y + 1, h - (random.randInt( Math.ceil(h / d) ) + 1), d);
          this.generateHeightMap(x - 1, y, h - (random.randInt( Math.ceil(h / d) ) + 1), d);
          this.generateHeightMap(x, y - 1, h - (random.randInt( Math.ceil(h / d) ) + 1), d);
        }
      }
    }
  }
}
