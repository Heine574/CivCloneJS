import { Civilization, CivilizationData } from './civilization';
import { City, CityData } from './map/tile/city';
import { Unit } from './map/tile/unit';
import { Coords } from './world';

export interface LeaderData {
  domains: (CivilizationData | CityData)[];
}

export class Leader {
  units: Unit[];
  domains: (Civilization | City)[];
  turnActive: boolean;
  turnFinished: boolean;

  constructor() {
    this.units = [];
    this.domains = [];
    this.turnActive = false;
    this.turnFinished = false;
  }

  export() {
    return {
      units: this.units.map(unit => unit.export()),
      turnActive: this.turnActive,
      turnFinished: this.turnFinished,
    };
  }

  static import(data: any): Leader {
    const leader =  new Leader();
    leader.units = data.units.map((unitData: any) => Unit.import(unitData));
    leader.turnActive = data.turnActive;
    leader.turnFinished = data.turnFinished;
    return leader;
  }

  getData(): LeaderData {
    return {
      domains: this.domains.map(domain => domain.getData()),
    }
  }

  newTurn() {
    this.turnActive = true;
    this.turnFinished = false;

    for (const unit of this.units) {
      unit.newTurn();
    }
  }

  endTurn() {
    this.turnActive = false;
  }

  getUnits(): Unit[] {
    return this.units;
  }

  getUnitPositions(): Coords[] {
    return this.units.map(unit => unit.coords);
  }

  addUnit(unit: Unit): void {
    this.units.push(unit);
  }

  removeUnit(unit: Unit): void {
    const unitIndex = this.units.indexOf(unit);
    if (unitIndex > -1) {
      this.units.splice(unitIndex, 1);
    }
  }
}
