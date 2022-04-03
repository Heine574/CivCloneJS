import { Map } from './map';
import { Unit } from './unit';
import { Tile } from './tile';
import { Player } from './player';
import { Civilization, CivilizationData } from './civilization';

export interface Coords {
  x: number;
  y: number;
}

export interface EventMsg {
  actions?: [string, unknown[]][];
  update?: [string, unknown[]][];
  error?: [string, unknown[]][];
}

export class Game {
  map: Map;
  civs: { [civID: number]: Civilization };
  players: { [playerName: string]: Player };
  playerCount: number;
  colorPool: { [color: string]: boolean };
  metaData: { gameName: string };
  constructor(map: Map, playerCount: number) {
    this.map = map;
    this.civs = {};
    for (let i = 0; i < playerCount; i++) {
      this.civs[i] = new Civilization();

      this.addUnit(new Unit('settler', i), { x: (i+1)*1, y: (i+1)*1 }); // REMOVE THESE
      this.addUnit(new Unit('scout', i), { x: (i+1)*3, y: (i+1)*4 }); // REMOVE THESE

      this.updateCivTileVisibility(i);
    }

    this.players = {};
    this.playerCount = playerCount;

    const colorList: string[] = [
      '#820000', // RICH RED
      '#0a2ead', // BLUE
      '#03a300', // GREEN
      '#03a300', // SAND YELLOW
      '#560e8a', // ROYAL PURPLE
      '#bd7400', // ORANGE
    ].slice(0, Math.max(this.playerCount, 6));

    this.colorPool = colorList.reduce((obj: { [color: string]: boolean }, color: string) => ({...obj, [color]: true}), {});

    this.metaData = {
      gameName: "New Game",
    };
  }

  getPlayer(username: string): Player {
    return this.players[username];
  }

  getCiv(civID: number): Civilization {
    return this.civs[civID];
  }

  getColorPool(): string[] {
    const colorList = [];

    for (const color in this.colorPool) {
      if (this.colorPool[color]) {
        colorList.push(color);
      }
    }

    return colorList;
  }

  setCivColor(civID: number, color: string): boolean {
    if (this.colorPool[color]) {
      if (this.civs[civID].color) {
        this.colorPool[this.civs[civID].color] = true;
      }
      this.civs[civID].color = color;
      this.colorPool[color] = false;
      return true;
    } else {
      return false;
    }
  }

  getAllCivsData(): { [civID: number]: CivilizationData } {
    const data = {};

    for (const civID in this.civs) {
      const civ = this.civs[civID];
      data[civID] = civ.getData();
    }

    return data;
  }

  beginTurnForCiv(civID: number): void {
    this.civs[civID].newTurn();
    this.updateCivTileVisibility(civID);
    this.sendToCiv(civID, {
      update: [
        ['setMap', [this.map.getCivMap(civID)]],
        ['beginTurn', []],
      ],
    });
  }
  

  updateCivTileVisibility(civID: number): void {
    for (const tile of this.map.tiles) {
      tile.clearVisibility(civID);
    }
    for (const unit of this.civs[civID].units) {
      for (const coords of this.map.getVisibleTilesCoords(unit)) {
        const tile = this.map.getTile(coords);
        tile.setVisibility(civID, true);
      }
    }
  }

  addUnit(unit: Unit, coords: Coords): void {
    this.civs[unit.civID].addUnit(unit);
    this.map.moveUnitTo(unit, coords);
  }

  removeUnit(unit: Unit): void {
    this.civs[unit.civID].removeUnit(unit);
    this.map.moveUnitTo(unit, { x: null, y: null });
  }

  newPlayerCivID(): number | null {
    const freeCivs = {};
    for (let i = 0; i < this.playerCount; i++) {
      freeCivs[i] = true;
    }

    for (const player in this.players) {
      delete freeCivs[this.players[player].civID];
    }

    const freeIDs = Object.keys(freeCivs).map(Number);

    if (freeIDs.length > 0) {
      return Math.min(...freeIDs);
    } else {
      return null;
    }
  }

  sendToAll(msg: EventMsg): void {
    for (const playerName in this.players) {
      const player = this.players[playerName];

      if (player.isAI) {
        return;
      } else {
        player.connection.send(JSON.stringify(msg));
      }
    }
  }

  sendToCiv(civID: number, msg: EventMsg): void {
    const player = Object.values(this.players).find(player => player.civID === civID);

    if (!player) {
      console.error("Error: Could not find player for Civilization #" + civID);
      return;
    }

    if (player.isAI) {
      return;
    } else {
       player.connection.send(JSON.stringify(msg));
    }
  }

  sendTileUpdate(coords: Coords, tile: Tile): void {
    this.forEachCivID((civID) => {
      this.sendToCiv(civID, {
        update: [
          ['tileUpdate', [ coords, this.map.getCivTile(civID, tile) ]],
        ],
      });
    });
  }

  forEachCivID(callback: (civID: number) => void): void {
    for (let civID = 0; civID < this.playerCount; civID++) {
      callback(civID);
    }
  }

  forEachPlayer(callback: (player: Player) => void): void {
    for (const playerName in this.players) {
      callback(this.players[playerName]);
    }
  }
}
