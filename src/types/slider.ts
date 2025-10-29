export interface ITile {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IGridLines {
  vertical: number[];
  horizontal: number[];
}

export interface ITileInfo {
  tiles: ITile[];
  grid: IGridLines;
}
