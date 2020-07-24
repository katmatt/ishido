function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', _ => resolve(image))
    image.addEventListener('error', _ => reject(new Error(`Failed to load image ${src}`)))
    image.src = src
  })
}

type GameAssets = {
  background: HTMLImageElement
  tileset: HTMLImageElement
  statusarea: HTMLImageElement
}

const BOARD_WIDTH = 12
const BOARD_HEIGHT = 8
const TILE_WIDTH = 56
const TILE_HEIGHT = 66

type EmptyTile = {
  type: 'empty'
}

type Stone = {
  type: 'stone'
  symbol: number
  color: number
}

type Tile = EmptyTile | Stone

type Board = {
  background: number[][]
  tiles: Tile[][]
  stoneStack: Stone[]
  nextStone?: Stone
  score: number
  fourWays: number
  showHint: boolean
}

async function loadGameAssets(): Promise<GameAssets> {
  const backgroundLoader = loadImage('Background.png')
  const tilesetLoader = loadImage('Tileset.png')
  const statusareaLoader = loadImage('Statusarea.png')
  const [background, tileset, statusarea] = await Promise.all([backgroundLoader, tilesetLoader, statusareaLoader])
  return {
    background,
    tileset,
    statusarea,
  }
}

function isInitialStonePosition(position: Position2D): boolean {
  const {x, y} = position
  return (
    ((x == 0 || x == BOARD_WIDTH - 1) && (y == 0 || y == BOARD_HEIGHT - 1)) ||
    (x == BOARD_WIDTH / 2 && y == BOARD_HEIGHT / 2) ||
    (x == BOARD_WIDTH / 2 - 1 && y == BOARD_HEIGHT / 2 - 1)
  )
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max)
}

function generatePlacedStones(): Stone[] {
  let colors = [0, 1, 2, 3, 4, 5]
  let symbols = [0, 1, 2, 3, 4, 5]
  const placedStones: Stone[] = []
  while (colors.length > 0) {
    const maxIndex = colors.length
    const color = colors[randomInt(maxIndex)]
    const symbol = symbols[randomInt(maxIndex)]
    const stone: Stone = {type: 'stone', color, symbol}
    placedStones.push(stone)
    colors = colors.filter(v => v !== color)
    symbols = symbols.filter(v => v !== symbol)
  }
  return placedStones
}

/**
 * Returns an equality check predicate bound to the given parameter.
 * This function implements a shallow equality test and can't be used with nested objects!
 */
function equals(o1: Record<string, any>): (o2: Record<string, any>) => boolean {
  return (o2: Record<string, any>) => {
    const keys = Object.keys(o1)
    if (keys.length !== Object.keys(o2).length) {
      return false
    }
    for (const key of keys) {
      if (o2.hasOwnProperty(key)) {
        if (o1[key] !== o2[key]) {
          return false
        }
      } else {
        return false
      }
    }
    return true
  }
}

/**
 * Shuffles the array in place with the Fisher Yates algorithm.
 */
function shuffle<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(i)
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp
  }
}

function generateBoard(): Board {
  const background: number[][] = []
  const tiles: Tile[][] = []
  let placedStones = generatePlacedStones()
  let initialStones = placedStones.slice()
  for (let x = 0; x < BOARD_WIDTH; x++) {
    background[x] = []
    tiles[x] = []
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      background[x][y] = randomInt(4)
      const tile: Tile = isInitialStonePosition({x, y}) ? (initialStones.pop() as Tile) : {type: 'empty'}
      tiles[x][y] = tile
    }
  }
  const stoneStack: Stone[] = []
  for (let count = 0; count < 2; count++) {
    for (let color = 0; color < 6; color++) {
      for (let symbol = 0; symbol < 6; symbol++) {
        const stone: Stone = {
          type: 'stone',
          color,
          symbol,
        }
        const previousPlacedStones = placedStones
        placedStones = placedStones.filter(s => !equals(stone)(s))
        if (previousPlacedStones.length === placedStones.length) {
          stoneStack.push(stone)
        }
      }
    }
  }
  shuffle(stoneStack)
  const nextStone = stoneStack.pop()
  return {
    background,
    tiles,
    stoneStack,
    nextStone,
    score: 0,
    fourWays: 0,
    showHint: false,
  }
}

/**
 * The given position is beyond the interior of the board.
 */
function isBeyond(position: Position2D): boolean {
  const {x, y} = position
  return y == 0 || y == BOARD_HEIGHT - 1 || x == 0 || x == BOARD_WIDTH - 1
}

function drawBoard(ctx: CanvasRenderingContext2D, board: Board, assets: GameAssets) {
  const validPositions: Position2D[] = board.showHint ? getValidPositions(board) : []
  for (let x = 0; x < BOARD_WIDTH; x++) {
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      const tile = board.tiles[x][y]
      const pos = {x, y}
      switch (tile.type) {
        case 'empty': {
          const background = board.background[x][y]
          const hintY = validPositions.find(equals(pos)) ? TILE_HEIGHT * 2 : 0
          const tileY = isBeyond(pos) ? 0 : TILE_HEIGHT
          ctx.drawImage(
            assets.background,
            background * TILE_WIDTH,
            hintY + tileY,
            TILE_WIDTH,
            TILE_HEIGHT,
            x * TILE_WIDTH,
            y * TILE_HEIGHT,
            TILE_WIDTH,
            TILE_HEIGHT
          )
          break
        }
        case 'stone': {
          const {color, symbol} = tile
          const tileX = color * TILE_WIDTH
          const tileY = symbol * TILE_HEIGHT
          ctx.drawImage(
            assets.tileset,
            tileX,
            tileY,
            TILE_WIDTH,
            TILE_HEIGHT,
            x * TILE_WIDTH,
            y * TILE_HEIGHT,
            TILE_WIDTH,
            TILE_HEIGHT
          )
          break
        }
      }
    }
  }
  ctx.drawImage(assets.statusarea, TILE_WIDTH * BOARD_WIDTH, 0)
  const {nextStone} = board
  if (nextStone) {
    const {color, symbol} = nextStone
    const tileX = color * TILE_WIDTH
    const tileY = symbol * TILE_HEIGHT
    ctx.drawImage(
      assets.tileset,
      tileX,
      tileY,
      TILE_WIDTH,
      TILE_HEIGHT,
      800 - (800 - TILE_WIDTH * BOARD_WIDTH) / 2 - TILE_WIDTH / 2,
      TILE_HEIGHT / 2,
      TILE_WIDTH,
      TILE_HEIGHT
    )
  }
  ctx.textAlign = 'center'
  ctx.fillText(`Stones: ${board.stoneStack.length}`, 800 - (800 - TILE_WIDTH * BOARD_WIDTH) / 2, TILE_HEIGHT * 3)
  ctx.fillText(`Score: ${board.score}`, 800 - (800 - TILE_WIDTH * BOARD_WIDTH) / 2, TILE_HEIGHT * 4)
  ctx.fillText(`4 ways: ${board.fourWays}`, 800 - (800 - TILE_WIDTH * BOARD_WIDTH) / 2, TILE_HEIGHT * 5)
}

type Position2D = {
  x: number
  y: number
}

function addMouseClickEventHandler(canvas: HTMLCanvasElement, eventHandler: (position: Position2D) => void) {
  canvas.addEventListener('click', (event: MouseEvent) => {
    var rect = canvas.getBoundingClientRect()
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    eventHandler(position)
  })
}

type MatchResult = NotMatching | Match

type NotMatching = {
  type: 'NotMatching'
}

type Match = {
  type: 'Match'
  colorMatches: number
  symbolMatches: number
}

function match(s1: Stone, s2: Tile): MatchResult {
  if (s2.type == 'empty') {
    return {
      type: 'Match',
      colorMatches: 0,
      symbolMatches: 0,
    }
  }
  const colorMatch = s1.color === s2.color
  const symbolMatch = s1.symbol === s2.symbol
  if (colorMatch || symbolMatch) {
    return {
      type: 'Match',
      colorMatches: colorMatch ? 1 : 0,
      symbolMatches: symbolMatch ? 1 : 0,
    }
  }
  return {
    type: 'NotMatching',
  }
}

function getMatchResults(board: Board, position: Position2D) {
  const {nextStone, tiles} = board
  const {x, y} = position
  const matchResults: MatchResult[] = []
  if (nextStone) {
    if (tiles[x][y].type === 'empty') {
      if (x > 0) {
        const left = tiles[x - 1][y]
        matchResults.push(match(nextStone, left))
      }
      if (x < BOARD_WIDTH - 1) {
        const right = tiles[x + 1][y]
        matchResults.push(match(nextStone, right))
      }
      if (y > 0) {
        const top = tiles[x][y - 1]
        matchResults.push(match(nextStone, top))
      }
      if (y < BOARD_HEIGHT - 1) {
        const bottom = tiles[x][y + 1]
        matchResults.push(match(nextStone, bottom))
      }
    }
  }
  return matchResults
}

function isNonEmptyMatch(m: MatchResult): m is Match {
  return m.type === 'Match' && (m.colorMatches > 0 || m.symbolMatches > 0)
}

function getValidPositions(board: Board): Position2D[] {
  const {nextStone} = board
  const validPositions: Position2D[] = []
  if (nextStone) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        const pos = {x, y}
        const matchResults = getMatchResults(board, pos)
        const isMatching = !matchResults.find(m => m.type === 'NotMatching')
        if (isMatching) {
          const matching = matchResults.filter(isNonEmptyMatch)
          if (matching.length > 0) {
            const sumMatches = (sum: Match, current: Match): Match => ({
              type: 'Match',
              colorMatches: sum.colorMatches + current.colorMatches,
              symbolMatches: sum.symbolMatches + current.symbolMatches,
            })
            const matchResult = matching.reduce(sumMatches, {
              type: 'Match',
              symbolMatches: 0,
              colorMatches: 0,
            })
            let valid = false
            switch (matching.length) {
              case 1:
                valid = true
                break
              case 2:
                valid = matchResult.symbolMatches === 1 && matchResult.colorMatches === 1
                break
              case 3:
                valid =
                  (matchResult.symbolMatches === 1 && matchResult.colorMatches === 2) ||
                  (matchResult.symbolMatches === 2 && matchResult.colorMatches === 1)
                break
              case 4:
                valid = matchResult.symbolMatches === 2 && matchResult.colorMatches === 2
                break
            }
            if (valid) {
              validPositions.push(pos)
            }
          }
        }
      }
    }
  }
  return validPositions
}

const fourwayBonuses = [25, 50, 100, 200, 400, 600, 800, 1000, 5000, 10000, 25000, 50000]

async function initGame() {
  const canvas = document.getElementById('ishido') as HTMLCanvasElement
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    alert("Your browser isn't supported by this game!")
    return
  }
  const gameAssets = await loadGameAssets()
  const board = generateBoard()
  drawBoard(ctx, board, gameAssets)
  const showHint = () => {
    ;(board.showHint = true), drawBoard(ctx, board, gameAssets)
  }
  setTimeout(showHint, 5 * 1000)
  const doMove = (position: Position2D) => {
    const validPositions = getValidPositions(board)
    const pos = {
      x: Math.floor(position.x / TILE_WIDTH),
      y: Math.floor(position.y / TILE_HEIGHT),
    }
    const isValidPosition = validPositions.find(equals(pos))
    const {nextStone} = board
    if (nextStone && isValidPosition) {
      const matches = getMatchResults(board, pos).filter(isNonEmptyMatch)
      if (!isBeyond(pos)) {
        switch (matches.length) {
          case 1:
            board.score += 1
            break
          case 2:
            board.score += 2
            break
          case 3:
            board.score += 4
            break
          case 4:
            board.score += 8
            board.fourWays += 1
            const fourwayBonus = fourwayBonuses[board.fourWays - 1]
            if (fourwayBonus) {
              board.score += fourwayBonus
            }
            break
        }
      }
      board.tiles[pos.x][pos.y] = nextStone
      board.nextStone = board.stoneStack.pop()
      board.showHint = false
      drawBoard(ctx, board, gameAssets)
      setTimeout(showHint, 5 * 1000)
    }
  }
  addMouseClickEventHandler(canvas, doMove)
}

window.onload = initGame
