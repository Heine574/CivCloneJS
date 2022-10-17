import { getAdjacentCoords } from '../../../utils';
import { Coords } from '../../world';
import { Yield } from './yield';

export interface UnitTypeCost {
  type: string;
  cost: Yield;
}

export interface UnitData {
  type: string,
  hp: number,
  movement: number,
  civID: number,
}

export class Unit {
  static movementTable: { [unitType: string]: number } = {
    'settler': 3,
    'scout': 5,
    'builder': 3,
  };
  
  static movementClassTable: { [unitType: string]: number } = {
    'settler': 0,
    'scout': 0,
    'builder': 0,
  };
  
  static combatStatsTable: { [unitType: string]: [number, number, number] } = {
    // 'unitType': [offense, defense, awareness],
    'settler': [0, 1, 0],
    'scout': [5, 3, 20],
    'builder': [0, 1, 0],
  }
  
  static costTable: { [unitType: string]: Yield } = {
    // 'unitType': [offense, defense, awareness],
    'settler': new Yield({production: 10}),
    'scout': new Yield({production: 10}),
    'builder': new Yield({production: 5}),
  }

  type: string;
  hp: number; // this should never be allowed to be outside the range 0 - 100
  movement: number;
  movementClass: number;
  combatStats: [number, number, number];
  civID: number;
  coords: Coords;
  alive: boolean;

  static makeCatalog(types: string[]): UnitTypeCost[] {
    return types.map(type => (
      { type, cost: Unit.costTable[type] }
    ));
  }

  constructor(type: string, civID: number, coords: Coords) {
    this.type = type;
    this.hp = 100;
    this.movement = 0;
    this.movementClass = Unit.movementClassTable[type];
    this.combatStats = Unit.combatStatsTable[type];
    this.civID = civID;
    this.coords = coords;
    this.alive = true;
  }

  export() {
    return {
      type: this.type,
      hp: this.hp,
      movement: this.movement,
      movementClass: this.movementClass,
      combatStats: this.combatStats,
      civID: this.civID,
      alive: this.alive,
    };
  }

  getData(): UnitData {
    return {
      type: this.type,
      hp: this.hp,
      movement: this.movement,
      civID: this.civID,
    };
  }
  
  getMovementClass(): number {
    return this.movementClass;
  }

  setDead(): void {
    this.alive = false;
  }

  isDead(): boolean {
    return !this.alive;
  }

  hurt(hp: number): void {
    // TODO
    this.hp -= hp;
    if (this.hp <= 0) {
      this.hp = 0;
      this.setDead();
    }
  }

  newTurn() {
    this.movement = Unit.movementTable[this.type];
  }

  isAdjacentTo(dst?: Coords): boolean {
    return !!dst && getAdjacentCoords(this.coords).some(coord => coord.x === dst.x && coord.y === dst.y);
  }
}
